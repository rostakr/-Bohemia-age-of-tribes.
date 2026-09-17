import { readFile, writeFile } from 'node:fs/promises';

const COMPONENT_BYTES = new Map([[5120,1],[5121,1],[5122,2],[5123,2],[5125,4],[5126,4]]);
const TYPE_COMPONENTS = new Map([['SCALAR',1],['VEC2',2],['VEC3',3],['VEC4',4],['MAT2',4],['MAT3',9],['MAT4',16]]);

function usage() {
  console.log('Usage: node scripts/add-glb-normals.mjs <input.glb> <output.glb>');
}

function parseGlb(buffer) {
  if (buffer.length < 20 || buffer.toString('ascii', 0, 4) !== 'glTF') throw new Error('invalid GLB magic/header');
  if (buffer.readUInt32LE(4) !== 2) throw new Error('expected GLB 2.0');
  if (buffer.readUInt32LE(8) !== buffer.length) throw new Error('declared GLB length mismatch');

  let offset = 12;
  let json = null;
  let bin = null;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    const start = offset + 8, end = start + length;
    if (end > buffer.length) throw new Error('GLB chunk exceeds file bounds');
    if (type === 0x4E4F534A) {
      if (json) throw new Error('multiple JSON chunks');
      json = JSON.parse(buffer.subarray(start, end).toString('utf8').replace(/\u0000+$/g, '').trimEnd());
    } else if (type === 0x004E4942) {
      if (bin) throw new Error('multiple BIN chunks');
      bin = Buffer.from(buffer.subarray(start, end));
    }
    offset = end;
  }
  if (!json || !bin) throw new Error('GLB must contain JSON and BIN chunks');
  if (json.asset?.version !== '2.0') throw new Error('glTF asset.version must be 2.0');
  if (!Array.isArray(json.buffers) || json.buffers.length !== 1 || json.buffers[0]?.uri) {
    throw new Error('normal generator supports one embedded GLB buffer only');
  }
  return { json, bin };
}

function accessorReader(gltf, bin, accessorIndex) {
  const accessor = gltf.accessors?.[accessorIndex];
  if (!accessor || accessor.sparse) throw new Error(`unsupported accessor ${accessorIndex}`);
  const view = gltf.bufferViews?.[accessor.bufferView];
  if (!view || (view.buffer ?? 0) !== 0) throw new Error(`accessor ${accessorIndex} must use embedded buffer 0`);
  const components = TYPE_COMPONENTS.get(accessor.type);
  const bytes = COMPONENT_BYTES.get(accessor.componentType);
  if (!components || !bytes) throw new Error(`accessor ${accessorIndex} has unsupported type/componentType`);
  const elementBytes = components * bytes;
  const stride = view.byteStride ?? elementBytes;
  if (stride < elementBytes) throw new Error(`accessor ${accessorIndex} byteStride is too small`);
  const base = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const finalByte = base + Math.max(0, accessor.count - 1) * stride + elementBytes;
  if (base < 0 || finalByte > bin.length) throw new Error(`accessor ${accessorIndex} exceeds BIN bounds`);
  return { accessor, components, bytes, stride, base };
}

function readComponent(bin, offset, componentType) {
  switch (componentType) {
    case 5120: return bin.readInt8(offset);
    case 5121: return bin.readUInt8(offset);
    case 5122: return bin.readInt16LE(offset);
    case 5123: return bin.readUInt16LE(offset);
    case 5125: return bin.readUInt32LE(offset);
    case 5126: return bin.readFloatLE(offset);
    default: throw new Error(`unsupported component type ${componentType}`);
  }
}

function readPositions(gltf, bin, accessorIndex) {
  const reader = accessorReader(gltf, bin, accessorIndex);
  if (reader.accessor.type !== 'VEC3' || reader.accessor.componentType !== 5126) {
    throw new Error('POSITION must be FLOAT VEC3');
  }
  const positions = new Float64Array(reader.accessor.count * 3);
  for (let i = 0; i < reader.accessor.count; i++) {
    const row = reader.base + i * reader.stride;
    for (let c = 0; c < 3; c++) positions[i * 3 + c] = readComponent(bin, row + c * 4, 5126);
  }
  return positions;
}

function readIndices(gltf, bin, accessorIndex, vertexCount) {
  if (!Number.isInteger(accessorIndex)) return Uint32Array.from({ length: vertexCount }, (_, index) => index);
  const reader = accessorReader(gltf, bin, accessorIndex);
  if (reader.accessor.type !== 'SCALAR' || ![5121,5123,5125].includes(reader.accessor.componentType)) {
    throw new Error('indices must be unsigned SCALAR');
  }
  const indices = new Uint32Array(reader.accessor.count);
  for (let i = 0; i < indices.length; i++) {
    indices[i] = readComponent(bin, reader.base + i * reader.stride, reader.accessor.componentType);
    if (indices[i] >= vertexCount) throw new Error(`index ${indices[i]} exceeds vertex count ${vertexCount}`);
  }
  return indices;
}

function computeNormals(positions, indices) {
  if (indices.length % 3 !== 0) throw new Error('triangle index/vertex count is not divisible by 3');
  const accumulated = new Float64Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i] * 3, ib = indices[i + 1] * 3, ic = indices[i + 2] * 3;
    const abx = positions[ib] - positions[ia];
    const aby = positions[ib + 1] - positions[ia + 1];
    const abz = positions[ib + 2] - positions[ia + 2];
    const acx = positions[ic] - positions[ia];
    const acy = positions[ic + 1] - positions[ia + 1];
    const acz = positions[ic + 2] - positions[ia + 2];
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    for (const vertex of [ia, ib, ic]) {
      accumulated[vertex] += nx;
      accumulated[vertex + 1] += ny;
      accumulated[vertex + 2] += nz;
    }
  }

  const output = Buffer.alloc((positions.length / 3) * 12);
  for (let i = 0; i < positions.length; i += 3) {
    const length = Math.hypot(accumulated[i], accumulated[i + 1], accumulated[i + 2]);
    const nx = length > 1e-20 ? accumulated[i] / length : 0;
    const ny = length > 1e-20 ? accumulated[i + 1] / length : 1;
    const nz = length > 1e-20 ? accumulated[i + 2] / length : 0;
    const byteOffset = (i / 3) * 12;
    output.writeFloatLE(nx, byteOffset);
    output.writeFloatLE(ny, byteOffset + 4);
    output.writeFloatLE(nz, byteOffset + 8);
  }
  return output;
}

function pad4(buffer, fill = 0) {
  const padding = (4 - buffer.length % 4) % 4;
  return padding ? Buffer.concat([buffer, Buffer.alloc(padding, fill)]) : buffer;
}

function buildGlb(gltf, bin) {
  const paddedBin = pad4(bin, 0);
  gltf.buffers[0].byteLength = paddedBin.length;
  const paddedJson = pad4(Buffer.from(JSON.stringify(gltf), 'utf8'), 0x20);
  const totalLength = 12 + 8 + paddedJson.length + 8 + paddedBin.length;
  const output = Buffer.alloc(totalLength);
  output.write('glTF', 0, 'ascii');
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(totalLength, 8);
  let offset = 12;
  output.writeUInt32LE(paddedJson.length, offset);
  output.writeUInt32LE(0x4E4F534A, offset + 4);
  paddedJson.copy(output, offset + 8);
  offset += 8 + paddedJson.length;
  output.writeUInt32LE(paddedBin.length, offset);
  output.writeUInt32LE(0x004E4942, offset + 4);
  paddedBin.copy(output, offset + 8);
  return output;
}

async function main() {
  const [inputPath, outputPath, ...extra] = process.argv.slice(2);
  if (!inputPath || !outputPath || extra.length || inputPath === outputPath) {
    usage();
    process.exit(2);
  }

  const source = await readFile(inputPath);
  const { json, bin: sourceBin } = parseGlb(source);
  json.bufferViews ??= [];
  json.accessors ??= [];
  let bin = Buffer.from(sourceBin);
  let addedPrimitives = 0;

  for (const [meshIndex, mesh] of (json.meshes ?? []).entries()) {
    for (const [primitiveIndex, primitive] of (mesh.primitives ?? []).entries()) {
      if ((primitive.mode ?? 4) !== 4) throw new Error(`mesh ${meshIndex} primitive ${primitiveIndex} is not TRIANGLES`);
      if (Number.isInteger(primitive.attributes?.NORMAL)) continue;
      const positionAccessor = primitive.attributes?.POSITION;
      if (!Number.isInteger(positionAccessor)) throw new Error(`mesh ${meshIndex} primitive ${primitiveIndex} is missing POSITION`);
      const positions = readPositions(json, bin, positionAccessor);
      const indices = readIndices(json, bin, primitive.indices, positions.length / 3);
      const normals = computeNormals(positions, indices);

      bin = pad4(bin, 0);
      const byteOffset = bin.length;
      bin = Buffer.concat([bin, normals]);
      const bufferView = json.bufferViews.length;
      json.bufferViews.push({ buffer: 0, byteOffset, byteLength: normals.length, target: 34962 });
      const accessor = json.accessors.length;
      json.accessors.push({ bufferView, byteOffset: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3' });
      primitive.attributes.NORMAL = accessor;
      addedPrimitives++;
    }
  }

  const output = addedPrimitives ? buildGlb(json, bin) : source;
  await writeFile(outputPath, output);
  console.log(JSON.stringify({ input: inputPath, output: outputPath, addedPrimitives, bytes: output.length }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
