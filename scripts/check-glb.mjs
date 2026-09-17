import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

const COMPONENT_BYTES = new Map([[5120,1],[5121,1],[5122,2],[5123,2],[5125,4],[5126,4]]);
const TYPE_COMPONENTS = new Map([['SCALAR',1],['VEC2',2],['VEC3',3],['VEC4',4],['MAT2',4],['MAT3',9],['MAT4',16]]);

function usage() {
  console.log('Usage: node scripts/check-glb.mjs <file.glb> [more.glb ...] [--min-tris N] [--max-tris N] [--require-normals] [--require-uv0]');
}

function parseArgs(argv) {
  const files = [];
  let minTris = null, maxTris = null;
  let requireNormals = false, requireUv0 = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--min-tris' || arg === '--max-tris') {
      const raw = argv[++i];
      const value = Number(raw);
      if (!Number.isInteger(value) || value < 0) throw new Error(`${arg} requires a non-negative integer`);
      if (arg === '--min-tris') minTris = value; else maxTris = value;
    } else if (arg === '--require-normals') {
      requireNormals = true;
    } else if (arg === '--require-uv0') {
      requireUv0 = true;
    } else if (arg.startsWith('--')) {
      throw new Error(`unknown option ${arg}`);
    } else files.push(arg);
  }
  return { files, minTris, maxTris, requireNormals, requireUv0 };
}

function parseGlb(buffer) {
  if (buffer.length < 20) throw new Error('file too small for GLB 2.0');
  if (buffer.toString('ascii', 0, 4) !== 'glTF') throw new Error('invalid GLB magic');
  const version = buffer.readUInt32LE(4);
  if (version !== 2) throw new Error(`unsupported GLB version ${version}; expected 2`);
  const declaredLength = buffer.readUInt32LE(8);
  if (declaredLength !== buffer.length) throw new Error(`declared length ${declaredLength} != file length ${buffer.length}`);

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
      const text = buffer.subarray(start, end).toString('utf8').replace(/\u0000+$/g, '').trimEnd();
      json = JSON.parse(text);
    } else if (type === 0x004E4942) {
      if (bin) throw new Error('multiple BIN chunks');
      bin = buffer.subarray(start, end);
    }
    offset = end;
  }
  if (!json) throw new Error('missing JSON chunk');
  return { json, bin };
}

function externalUri(uri) {
  return typeof uri === 'string' && !uri.startsWith('data:');
}

function accessorReader(gltf, bin, accessorIndex) {
  const accessor = gltf.accessors?.[accessorIndex];
  if (!accessor) throw new Error(`missing accessor ${accessorIndex}`);
  if (accessor.sparse) throw new Error(`sparse accessor ${accessorIndex} is not supported by admission checker`);
  const view = gltf.bufferViews?.[accessor.bufferView];
  if (!view) throw new Error(`accessor ${accessorIndex} has no valid bufferView`);
  if (!bin) throw new Error(`accessor ${accessorIndex} requires missing BIN chunk`);
  const components = TYPE_COMPONENTS.get(accessor.type);
  const bytes = COMPONENT_BYTES.get(accessor.componentType);
  if (!components || !bytes) throw new Error(`accessor ${accessorIndex} has unsupported type/componentType`);
  const elementBytes = components * bytes;
  const stride = view.byteStride ?? elementBytes;
  if (stride < elementBytes) throw new Error(`accessor ${accessorIndex} byteStride is too small`);
  const base = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const finalByte = base + Math.max(0, accessor.count - 1) * stride + elementBytes;
  if (base < 0 || finalByte > bin.length) throw new Error(`accessor ${accessorIndex} exceeds BIN bounds`);
  return { accessor, view, components, bytes, elementBytes, stride, base };
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

function validateFiniteAccessor(gltf, bin, accessorIndex, label, semantic, expectedType, expectedCount, allowedComponentTypes) {
  const reader = accessorReader(gltf, bin, accessorIndex);
  if (reader.accessor.type !== expectedType) throw new Error(`${label}: ${semantic} accessor must be ${expectedType}`);
  if (reader.accessor.count !== expectedCount) throw new Error(`${label}: ${semantic} count ${reader.accessor.count} != POSITION count ${expectedCount}`);
  if (!allowedComponentTypes.includes(reader.accessor.componentType)) {
    throw new Error(`${label}: ${semantic} has unsupported component type ${reader.accessor.componentType}`);
  }
  if (reader.accessor.componentType !== 5126 && !reader.accessor.normalized) {
    throw new Error(`${label}: integer ${semantic} accessor must be normalized`);
  }
  for (let i = 0; i < reader.accessor.count; i++) {
    const row = reader.base + i * reader.stride;
    for (let c = 0; c < reader.components; c++) {
      const value = readComponent(bin, row + c * reader.bytes, reader.accessor.componentType);
      if (!Number.isFinite(value)) throw new Error(`${label}: non-finite ${semantic} at element ${i}`);
    }
  }
}

function validatePositions(gltf, bin, accessorIndex, label) {
  const reader = accessorReader(gltf, bin, accessorIndex);
  if (reader.accessor.type !== 'VEC3') throw new Error(`${label}: POSITION accessor must be VEC3`);
  if (reader.accessor.componentType !== 5126) throw new Error(`${label}: POSITION accessor must use FLOAT components`);
  for (let i = 0; i < reader.accessor.count; i++) {
    const row = reader.base + i * reader.stride;
    for (let c = 0; c < 3; c++) {
      const value = readComponent(bin, row + c * reader.bytes, reader.accessor.componentType);
      if (!Number.isFinite(value)) throw new Error(`${label}: non-finite POSITION at vertex ${i}`);
    }
  }
  return reader.accessor.count;
}

function validateIndices(gltf, bin, accessorIndex, vertexCount, label) {
  const reader = accessorReader(gltf, bin, accessorIndex);
  if (reader.accessor.type !== 'SCALAR') throw new Error(`${label}: index accessor must be SCALAR`);
  if (![5121,5123,5125].includes(reader.accessor.componentType)) throw new Error(`${label}: invalid index component type`);
  let max = -1;
  for (let i = 0; i < reader.accessor.count; i++) {
    const value = readComponent(bin, reader.base + i * reader.stride, reader.accessor.componentType);
    if (value > max) max = value;
  }
  if (max >= vertexCount) throw new Error(`${label}: index ${max} exceeds vertex count ${vertexCount}`);
  return reader.accessor.count;
}

function validateDocument(gltf, bin, limits) {
  const assetVersion = gltf.asset?.version;
  if (assetVersion !== '2.0') throw new Error(`glTF asset.version=${assetVersion ?? 'missing'}; expected 2.0`);

  const external = [];
  for (const [i, buffer] of (gltf.buffers ?? []).entries()) if (externalUri(buffer.uri)) external.push(`buffer[${i}] ${buffer.uri}`);
  for (const [i, image] of (gltf.images ?? []).entries()) if (externalUri(image.uri)) external.push(`image[${i}] ${image.uri}`);
  if (external.length) throw new Error(`external dependencies are not admitted: ${external.join(', ')}`);

  let triangles = 0, vertices = 0, primitives = 0, normalPrimitives = 0, uv0Primitives = 0;
  const modes = new Set();
  for (const [meshIndex, mesh] of (gltf.meshes ?? []).entries()) {
    for (const [primitiveIndex, primitive] of (mesh.primitives ?? []).entries()) {
      primitives++;
      const label = `mesh ${meshIndex} primitive ${primitiveIndex}`;
      const mode = primitive.mode ?? 4;
      modes.add(mode);
      if (mode !== 4) throw new Error(`${label}: primitive mode ${mode} is not TRIANGLES`);
      const positionAccessor = primitive.attributes?.POSITION;
      if (!Number.isInteger(positionAccessor)) throw new Error(`${label}: missing POSITION accessor`);
      const vertexCount = validatePositions(gltf, bin, positionAccessor, label);
      vertices += vertexCount;

      const normalAccessor = primitive.attributes?.NORMAL;
      if (Number.isInteger(normalAccessor)) {
        validateFiniteAccessor(gltf, bin, normalAccessor, label, 'NORMAL', 'VEC3', vertexCount, [5120, 5122, 5126]);
        normalPrimitives++;
      } else if (limits.requireNormals) {
        throw new Error(`${label}: missing required NORMAL accessor`);
      }

      const uv0Accessor = primitive.attributes?.TEXCOORD_0;
      if (Number.isInteger(uv0Accessor)) {
        validateFiniteAccessor(gltf, bin, uv0Accessor, label, 'TEXCOORD_0', 'VEC2', vertexCount, [5121, 5123, 5126]);
        uv0Primitives++;
      } else if (limits.requireUv0) {
        throw new Error(`${label}: missing required TEXCOORD_0 accessor`);
      }

      let indexCount = vertexCount;
      if (Number.isInteger(primitive.indices)) indexCount = validateIndices(gltf, bin, primitive.indices, vertexCount, label);
      if (indexCount % 3 !== 0) throw new Error(`${label}: triangle index/vertex count ${indexCount} is not divisible by 3`);
      triangles += indexCount / 3;
    }
  }
  if (!primitives) throw new Error('no renderable mesh primitives');
  if (limits.minTris !== null && triangles < limits.minTris) throw new Error(`triangle count ${triangles} is below minimum ${limits.minTris}`);
  if (limits.maxTris !== null && triangles > limits.maxTris) throw new Error(`triangle count ${triangles} exceeds maximum ${limits.maxTris}`);

  for (const [i, image] of (gltf.images ?? []).entries()) {
    if (!Number.isInteger(image.bufferView) && !image.uri) throw new Error(`image[${i}] has neither bufferView nor URI`);
  }

  return {
    triangles,
    vertices,
    primitives,
    normalPrimitives,
    uv0Primitives,
    meshes: gltf.meshes?.length ?? 0,
    materials: gltf.materials?.length ?? 0,
    images: gltf.images?.length ?? 0,
    textures: gltf.textures?.length ?? 0,
    animations: gltf.animations?.length ?? 0,
    skins: gltf.skins?.length ?? 0,
    extensionsUsed: gltf.extensionsUsed ?? [],
    extensionsRequired: gltf.extensionsRequired ?? [],
  };
}

async function validateFile(path, limits) {
  const file = await readFile(path);
  const { json, bin } = parseGlb(file);
  const result = validateDocument(json, bin, limits);
  console.log(JSON.stringify({ file: basename(path), bytes: file.length, ...result }, null, 2));
}

let limits;
try {
  limits = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  usage();
  process.exit(2);
}
if (!limits.files.length) {
  usage();
  process.exit(0);
}
let failed = false;
for (const path of limits.files) {
  try { await validateFile(path, limits); }
  catch (error) { failed = true; console.error(`${path}: ${error instanceof Error ? error.message : String(error)}`); }
}
if (failed) process.exit(1);
