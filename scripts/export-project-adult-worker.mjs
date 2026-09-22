import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';

const SOURCE_COMMIT = '91f4466802c4790681a2f7f2c5e9b11299ea9ac1';
const SOURCE_BRANCH = 'phase1/supplied-normals-preview-r3';
const SOURCE_REPO_PATH = 'assets/source/phase1/user-supplied/boii_adult_worker.original.glb';
const SOURCE_SHA256 = '40f00021016c8157459cc4dab9612bba849654afe89c82c45795cdb0d0d21a0c';
const SOURCE_BLOB_SHA = '132c6f926cc7c0b4683cdd3ebedc1d6f5e461e4d';

const [inputPath = 'artifacts/phase1/supplied-worker-source.glb',
  outputPath = 'public/assets/characters/boii_adult_worker_project.glb',
  receiptPath = 'artifacts/phase1/project-worker-derived-receipt.json'] = process.argv.slice(2);

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function parseGlb(buffer) {
  if (buffer.length < 20 || buffer.toString('ascii', 0, 4) !== 'glTF') throw new Error('invalid GLB magic/header');
  if (buffer.readUInt32LE(4) !== 2) throw new Error('expected GLB 2.0');
  if (buffer.readUInt32LE(8) !== buffer.length) throw new Error('declared GLB length mismatch');
  let offset = 12;
  let json;
  let bin;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + length;
    if (end > buffer.length) throw new Error('GLB chunk exceeds file bounds');
    if (type === 0x4e4f534a) json = JSON.parse(buffer.subarray(start, end).toString('utf8').replace(/\u0000+$/g, '').trimEnd());
    if (type === 0x004e4942) bin = Buffer.from(buffer.subarray(start, end));
    offset = end;
  }
  if (!json || !bin) throw new Error('GLB must contain JSON and BIN chunks');
  if (json.asset?.version !== '2.0') throw new Error('glTF asset.version must be 2.0');
  if (!Array.isArray(json.buffers) || json.buffers.length !== 1 || json.buffers[0]?.uri) {
    throw new Error('converter supports one embedded GLB buffer only');
  }
  return { json, bin };
}

function accessorInfo(gltf, accessorIndex) {
  const accessor = gltf.accessors?.[accessorIndex];
  if (!accessor || accessor.sparse) throw new Error(`unsupported accessor ${accessorIndex}`);
  const view = gltf.bufferViews?.[accessor.bufferView];
  if (!view || (view.buffer ?? 0) !== 0) throw new Error(`accessor ${accessorIndex} must use embedded buffer 0`);
  const base = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  return { accessor, view, base };
}

function readFloatAccessor(gltf, bin, accessorIndex, width, type) {
  const { accessor, view, base } = accessorInfo(gltf, accessorIndex);
  if (accessor.componentType !== 5126 || accessor.type !== type) throw new Error(`${type} accessor ${accessorIndex} must use FLOAT`);
  const stride = view.byteStride ?? width * 4;
  if (stride < width * 4) throw new Error(`accessor ${accessorIndex} byteStride too small`);
  const result = new Float64Array(accessor.count * width);
  for (let i = 0; i < accessor.count; i++) {
    const row = base + i * stride;
    for (let c = 0; c < width; c++) result[i * width + c] = bin.readFloatLE(row + c * 4);
  }
  return result;
}

function readIndices(gltf, bin, accessorIndex) {
  const { accessor, view, base } = accessorInfo(gltf, accessorIndex);
  if (accessor.type !== 'SCALAR' || ![5121, 5123, 5125].includes(accessor.componentType)) {
    throw new Error('indices must be unsigned SCALAR');
  }
  const bytes = accessor.componentType === 5121 ? 1 : accessor.componentType === 5123 ? 2 : 4;
  const stride = view.byteStride ?? bytes;
  const result = new Uint32Array(accessor.count);
  for (let i = 0; i < result.length; i++) {
    const at = base + i * stride;
    result[i] = accessor.componentType === 5121
      ? bin.readUInt8(at)
      : accessor.componentType === 5123
        ? bin.readUInt16LE(at)
        : bin.readUInt32LE(at);
  }
  return result;
}

function computeSmoothNormals(positions, indices) {
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
  const normals = new Float64Array(accumulated.length);
  for (let i = 0; i < accumulated.length; i += 3) {
    const length = Math.hypot(accumulated[i], accumulated[i + 1], accumulated[i + 2]);
    if (length > 1e-20) {
      normals[i] = accumulated[i] / length;
      normals[i + 1] = accumulated[i + 1] / length;
      normals[i + 2] = accumulated[i + 2] / length;
    } else {
      normals[i + 1] = 1;
    }
  }
  return normals;
}

function normalize3(x, y, z) {
  const length = Math.hypot(x, y, z);
  return length > 1e-20 ? [x / length, y / length, z / length] : [0, 1, 0];
}

function seamAwareUvCentroid(u0, v0, u1, v1, u2, v2) {
  let a = u0, b = u1, c = u2;
  const min = Math.min(a, b, c);
  const max = Math.max(a, b, c);
  if (max - min > 0.5) {
    if (a < 0.5) a += 1;
    if (b < 0.5) b += 1;
    if (c < 0.5) c += 1;
  }
  const u = ((a + b + c) / 3) % 1;
  return [u < 0 ? u + 1 : u, (v0 + v1 + v2) / 3];
}

function bounds3(values) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < values.length; i += 3) {
    for (let c = 0; c < 3; c++) {
      min[c] = Math.min(min[c], values[i + c]);
      max[c] = Math.max(max[c], values[i + c]);
    }
  }
  return { min, max, size: min.map((v, i) => max[i] - v) };
}

function pad4(buffer, fill = 0) {
  const padding = (4 - buffer.length % 4) % 4;
  return padding ? Buffer.concat([buffer, Buffer.alloc(padding, fill)]) : buffer;
}

function buildGlb(gltf, bin) {
  const paddedBin = pad4(bin, 0);
  gltf.buffers = [{ byteLength: paddedBin.length }];
  const paddedJson = pad4(Buffer.from(JSON.stringify(gltf), 'utf8'), 0x20);
  const totalLength = 12 + 8 + paddedJson.length + 8 + paddedBin.length;
  const output = Buffer.alloc(totalLength);
  output.write('glTF', 0, 'ascii');
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(totalLength, 8);
  let offset = 12;
  output.writeUInt32LE(paddedJson.length, offset);
  output.writeUInt32LE(0x4e4f534a, offset + 4);
  paddedJson.copy(output, offset + 8);
  offset += 8 + paddedJson.length;
  output.writeUInt32LE(paddedBin.length, offset);
  output.writeUInt32LE(0x004e4942, offset + 4);
  paddedBin.copy(output, offset + 8);
  return output;
}

async function main() {
  const source = await readFile(inputPath);
  const sourceHash = sha256(source);
  if (sourceHash !== SOURCE_SHA256) {
    throw new Error(`supplied worker SHA mismatch: expected ${SOURCE_SHA256}, got ${sourceHash}`);
  }

  const { json, bin } = parseGlb(source);
  if ((json.meshes?.length ?? 0) !== 1 || (json.meshes?.[0]?.primitives?.length ?? 0) !== 1) {
    throw new Error('expected exactly one mesh with one primitive');
  }
  const primitive = json.meshes[0].primitives[0];
  if ((primitive.mode ?? 4) !== 4) throw new Error('worker primitive must be TRIANGLES');
  if (!Number.isInteger(primitive.indices)) throw new Error('worker primitive must be indexed');
  if (!Number.isInteger(primitive.attributes?.POSITION) || !Number.isInteger(primitive.attributes?.TEXCOORD_0)) {
    throw new Error('worker primitive must contain POSITION and TEXCOORD_0');
  }
  const positions = readFloatAccessor(json, bin, primitive.attributes.POSITION, 3, 'VEC3');
  const uvs = readFloatAccessor(json, bin, primitive.attributes.TEXCOORD_0, 2, 'VEC2');
  const indices = readIndices(json, bin, primitive.indices);
  if (indices.length % 3 !== 0) throw new Error('index count must be divisible by 3');
  if (uvs.length / 2 !== positions.length / 3) throw new Error('POSITION/UV vertex count mismatch');

  const sourceVertexCount = positions.length / 3;
  const sourceTriangles = indices.length / 3;
  if (sourceTriangles !== 14106) throw new Error(`unexpected source triangle count ${sourceTriangles}`);

  const sourceNormals = computeSmoothNormals(positions, indices);
  const newVertexCount = sourceVertexCount + sourceTriangles;
  const newPositions = new Float32Array(newVertexCount * 3);
  const newNormals = new Float32Array(newVertexCount * 3);
  const newUvs = new Float32Array(newVertexCount * 2);
  for (let i = 0; i < positions.length; i++) newPositions[i] = positions[i];
  for (let i = 0; i < sourceNormals.length; i++) newNormals[i] = sourceNormals[i];
  for (let i = 0; i < uvs.length; i++) newUvs[i] = uvs[i];

  const newIndices = new Uint32Array(sourceTriangles * 9);
  for (let tri = 0; tri < sourceTriangles; tri++) {
    const a = indices[tri * 3];
    const b = indices[tri * 3 + 1];
    const c = indices[tri * 3 + 2];
    const center = sourceVertexCount + tri;

    const ap = a * 3, bp = b * 3, cp = c * 3, dp = center * 3;
    newPositions[dp] = (positions[ap] + positions[bp] + positions[cp]) / 3;
    newPositions[dp + 1] = (positions[ap + 1] + positions[bp + 1] + positions[cp + 1]) / 3;
    newPositions[dp + 2] = (positions[ap + 2] + positions[bp + 2] + positions[cp + 2]) / 3;

    const [nx, ny, nz] = normalize3(
      sourceNormals[ap] + sourceNormals[bp] + sourceNormals[cp],
      sourceNormals[ap + 1] + sourceNormals[bp + 1] + sourceNormals[cp + 1],
      sourceNormals[ap + 2] + sourceNormals[bp + 2] + sourceNormals[cp + 2],
    );
    newNormals[dp] = nx;
    newNormals[dp + 1] = ny;
    newNormals[dp + 2] = nz;

    const au = a * 2, bu = b * 2, cu = c * 2, du = center * 2;
    const [u, v] = seamAwareUvCentroid(
      uvs[au], uvs[au + 1],
      uvs[bu], uvs[bu + 1],
      uvs[cu], uvs[cu + 1],
    );
    newUvs[du] = u;
    newUvs[du + 1] = v;

    const out = tri * 9;
    newIndices[out] = a; newIndices[out + 1] = b; newIndices[out + 2] = center;
    newIndices[out + 3] = b; newIndices[out + 4] = c; newIndices[out + 5] = center;
    newIndices[out + 6] = c; newIndices[out + 7] = a; newIndices[out + 8] = center;
  }

  const image = json.images?.[0];
  if (!image || !Number.isInteger(image.bufferView) || image.uri) throw new Error('expected one embedded source image');
  const imageView = json.bufferViews?.[image.bufferView];
  if (!imageView || (imageView.buffer ?? 0) !== 0) throw new Error('embedded image must use buffer 0');
  const imageStart = imageView.byteOffset ?? 0;
  const imageBytes = Buffer.from(bin.subarray(imageStart, imageStart + imageView.byteLength));

  const chunks = [];
  const bufferViews = [];
  const accessors = [];
  let byteLength = 0;

  function append(bytes, target) {
    const padding = (4 - byteLength % 4) % 4;
    if (padding) {
      chunks.push(Buffer.alloc(padding));
      byteLength += padding;
    }
    const viewIndex = bufferViews.length;
    const entry = { buffer: 0, byteOffset: byteLength, byteLength: bytes.length };
    if (target) entry.target = target;
    bufferViews.push(entry);
    chunks.push(bytes);
    byteLength += bytes.length;
    return viewIndex;
  }

  function addAccessor(typed, width, type, componentType, target, withBounds = false) {
    const bytes = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
    const viewIndex = append(bytes, target);
    const entry = { bufferView: viewIndex, componentType, count: typed.length / width, type };
    if (withBounds) {
      const b = bounds3(typed);
      entry.min = b.min;
      entry.max = b.max;
    }
    accessors.push(entry);
    return accessors.length - 1;
  }

  const imageBufferView = append(imageBytes);
  const positionAccessor = addAccessor(newPositions, 3, 'VEC3', 5126, 34962, true);
  const normalAccessor = addAccessor(newNormals, 3, 'VEC3', 5126, 34962);
  const uvAccessor = addAccessor(newUvs, 2, 'VEC2', 5126, 34962);
  const indexAccessor = addAccessor(newIndices, 1, 'SCALAR', 5125, 34963);

  const outputJson = {
    asset: {
      version: '2.0',
      generator: 'BOHEMIA supplied-worker production derivative: centroid tessellation + QA-verified smooth normals',
    },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: 'Boii adult worker — supplied licensed production derivative', mesh: 0 }],
    meshes: [{
      primitives: [{
        mode: 4,
        material: 0,
        attributes: { POSITION: positionAccessor, NORMAL: normalAccessor, TEXCOORD_0: uvAccessor },
        indices: indexAccessor,
      }],
    }],
    materials: structuredClone(json.materials ?? []),
    images: [{ bufferView: imageBufferView, mimeType: image.mimeType ?? 'image/png' }],
    textures: structuredClone(json.textures ?? [{ source: 0 }]),
    bufferViews,
    accessors,
    buffers: [{ byteLength: 0 }],
  };
  if (Array.isArray(json.samplers)) outputJson.samplers = structuredClone(json.samplers);

  const outputBin = pad4(Buffer.concat(chunks), 0);
  const output = buildGlb(outputJson, outputBin);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output);

  const sourceBounds = bounds3(positions);
  const outputBounds = bounds3(newPositions);
  const outputHash = sha256(output);
  const receipt = {
    schema_version: 3,
    asset: 'boii_adult_worker_supplied_production_derivative',
    project: 'BOHEMIA: AGE OF TRIBES',
    source: {
      branch: SOURCE_BRANCH,
      commit: SOURCE_COMMIT,
      repo_path: SOURCE_REPO_PATH,
      git_blob_sha: SOURCE_BLOB_SHA,
      sha256: SOURCE_SHA256,
      bytes: source.length,
      triangles: sourceTriangles,
      vertices: sourceVertexCount,
      bounds: sourceBounds,
      rights: 'Project owner confirms this supplied asset is licensed for this noncommercial project; exact licence identifier/provider metadata remains pending archival.',
      prior_qa_evidence: 'PR #59 multi-angle PlayCanvas preview found the supplied worker visually coherent; no canonical admission was granted.',
    },
    derivation: {
      method: 'Each original triangle is split at its planar centroid into three triangles. Original vertices, UVs and embedded base-color image are preserved; centroid UVs use seam-aware interpolation.',
      topology_changed: true,
      surface_shape_changed: false,
      texture_reencoded: false,
      normals: 'Area-weighted smooth normals generated with the same algorithmic convention as scripts/add-glb-normals.mjs used for QA preview evidence; centroid normals are normalized interpolation of the original vertex normals.',
      triangle_multiplier: 3,
    },
    output: {
      path: outputPath,
      bytes: output.length,
      sha256: outputHash,
      triangles: newIndices.length / 3,
      vertices: newVertexCount,
      bounds: outputBounds,
      materials: outputJson.materials.length,
      textures: outputJson.textures.length,
      images: outputJson.images.length,
      primitives: 1,
      normals: true,
      uv0: true,
      target_runtime_height_metres: 1.72,
      rig: null,
      animations: 0,
    },
    admission: {
      canonical_runtime_changed: false,
      art_gate_passed: false,
      requires_independent_qa: true,
    },
  };
  await mkdir(dirname(receiptPath), { recursive: true });
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');

  console.log(JSON.stringify(receipt, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
