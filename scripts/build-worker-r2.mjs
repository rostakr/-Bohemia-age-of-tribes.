import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { calculateNormals } from 'playcanvas';

const SOURCE_COMMIT = '9adb3c74bd2c4da77a17f02a9ff7eba3a8156f07';
const SOURCE_PATH = 'public/assets/characters/boii_adult_worker.glb';
const SOURCE_URL = `https://raw.githubusercontent.com/rostakr/-Bohemia-age-of-tribes./${SOURCE_COMMIT}/${SOURCE_PATH}`;
const SOURCE_SHA256 = '0ca4d24829f89ad60815102b5d08a6bcdfb9c5d724653ac08306ffe04dfae1f2';
const SOURCE_BYTES = 1_639_680;
const EXPECTED_SOURCE_TRIANGLES = 14_106;
const EXPECTED_OUTPUT_TRIANGLES = 28_212;
const OUTPUT = resolve('public/assets/characters/boii_adult_worker_r2.glb');
const RECEIPT = resolve('artifacts/phase1/worker-r2-receipt.json');

const COMPONENT_BYTES = new Map([
  [5120, 1], [5121, 1], [5122, 2], [5123, 2], [5125, 4], [5126, 4],
]);
const TYPE_WIDTH = new Map([
  ['SCALAR', 1], ['VEC2', 2], ['VEC3', 3], ['VEC4', 4], ['MAT2', 4], ['MAT3', 9], ['MAT4', 16],
]);

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function pad4(length) {
  return (4 - (length % 4)) % 4;
}

async function fetchPinnedSource() {
  const override = process.env.WORKER_R2_SOURCE_URL;
  const url = override || SOURCE_URL;
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Worker R2 source fetch failed: HTTP ${response.status} from ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const digest = sha256(buffer);
  if (buffer.length !== SOURCE_BYTES) throw new Error(`Pinned worker size mismatch: expected ${SOURCE_BYTES}, got ${buffer.length}`);
  if (digest !== SOURCE_SHA256) throw new Error(`Pinned worker SHA mismatch: expected ${SOURCE_SHA256}, got ${digest}`);
  return buffer;
}

function parseGlb(buffer) {
  if (buffer.length < 28) throw new Error('Source GLB too small');
  if (buffer.readUInt32LE(0) !== 0x46546c67) throw new Error('Source is not GLB');
  if (buffer.readUInt32LE(4) !== 2) throw new Error('Source GLB must be glTF 2.0');
  if (buffer.readUInt32LE(8) !== buffer.length) throw new Error('Source GLB length header mismatch');
  const jsonLength = buffer.readUInt32LE(12);
  if (buffer.readUInt32LE(16) !== 0x4e4f534a) throw new Error('Source GLB missing JSON chunk');
  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonLength;
  const json = JSON.parse(buffer.subarray(jsonStart, jsonEnd).toString('utf8').trimEnd());
  if (jsonEnd + 8 > buffer.length) throw new Error('Source GLB missing BIN chunk header');
  const binLength = buffer.readUInt32LE(jsonEnd);
  if (buffer.readUInt32LE(jsonEnd + 4) !== 0x004e4942) throw new Error('Source GLB missing BIN chunk');
  const binStart = jsonEnd + 8;
  const binEnd = binStart + binLength;
  if (binEnd > buffer.length) throw new Error('Source BIN chunk exceeds file');
  return { json, binary: Buffer.from(buffer.subarray(binStart, binEnd)) };
}

function readComponent(view, offset, componentType) {
  switch (componentType) {
    case 5120: return view.getInt8(offset);
    case 5121: return view.getUint8(offset);
    case 5122: return view.getInt16(offset, true);
    case 5123: return view.getUint16(offset, true);
    case 5125: return view.getUint32(offset, true);
    case 5126: return view.getFloat32(offset, true);
    default: throw new Error(`Unsupported component type ${componentType}`);
  }
}

function readAccessor(json, binary, accessorIndex) {
  const accessor = json.accessors?.[accessorIndex];
  if (!accessor) throw new Error(`Missing accessor ${accessorIndex}`);
  if (accessor.sparse) throw new Error('Sparse accessors are not supported by worker R2 exporter');
  const bufferView = json.bufferViews?.[accessor.bufferView];
  if (!bufferView || bufferView.buffer !== 0) throw new Error(`Accessor ${accessorIndex} must reference buffer 0`);
  const width = TYPE_WIDTH.get(accessor.type);
  const componentBytes = COMPONENT_BYTES.get(accessor.componentType);
  if (!width || !componentBytes) throw new Error(`Unsupported accessor ${accessorIndex} format`);
  const packedStride = width * componentBytes;
  const stride = bufferView.byteStride ?? packedStride;
  if (stride < packedStride) throw new Error(`Invalid byteStride for accessor ${accessorIndex}`);
  const start = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
  const values = new Array(accessor.count * width);
  for (let item = 0; item < accessor.count; item++) {
    const base = start + item * stride;
    for (let component = 0; component < width; component++) {
      values[item * width + component] = readComponent(view, base + component * componentBytes, accessor.componentType);
    }
  }
  return { values, accessor, width };
}

function vector3(values, index) {
  const p = index * 3;
  return [values[p], values[p + 1], values[p + 2]];
}

function vector2(values, index) {
  const p = index * 2;
  return [values[p], values[p + 1]];
}

function distanceSquared(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

function normalizedAverage(a, b) {
  const x = a[0] + b[0];
  const y = a[1] + b[1];
  const z = a[2] + b[2];
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

function midpoint(a, b) {
  return a.map((value, axis) => (value + b[axis]) * 0.5);
}

function rebuildPrimitive(json, binary, primitive) {
  if ((primitive.mode ?? 4) !== 4) throw new Error('Worker R2 expects triangle primitives');
  if (primitive.indices === undefined) throw new Error('Worker R2 source primitive must be indexed');
  if (primitive.attributes?.POSITION === undefined) throw new Error('Worker R2 source primitive missing POSITION');
  if (primitive.attributes?.TEXCOORD_0 === undefined) throw new Error('Worker R2 source primitive missing TEXCOORD_0');

  const positionData = readAccessor(json, binary, primitive.attributes.POSITION);
  const uvData = readAccessor(json, binary, primitive.attributes.TEXCOORD_0);
  const indexData = readAccessor(json, binary, primitive.indices);
  if (positionData.width !== 3 || positionData.accessor.componentType !== 5126) throw new Error('Worker POSITION must be float VEC3');
  if (uvData.width !== 2 || uvData.accessor.componentType !== 5126) throw new Error('Worker UV0 must be float VEC2');
  if (indexData.width !== 1) throw new Error('Worker indices must be SCALAR');
  if (indexData.values.length % 3 !== 0) throw new Error('Worker index count must be divisible by 3');

  const sourcePositions = positionData.values;
  const sourceUvs = uvData.values;
  const sourceIndices = indexData.values.map(Number);
  const sourceNormals = calculateNormals(sourcePositions, sourceIndices);
  if (sourceNormals.length !== sourcePositions.length) throw new Error('Source normal generation failed');

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  function emitVertex(position, normal, uv) {
    const index = positions.length / 3;
    positions.push(position[0], position[1], position[2]);
    normals.push(normal[0], normal[1], normal[2]);
    uvs.push(uv[0], uv[1]);
    return index;
  }

  for (let offset = 0; offset < sourceIndices.length; offset += 3) {
    const source = [sourceIndices[offset], sourceIndices[offset + 1], sourceIndices[offset + 2]];
    for (const index of source) {
      if (!Number.isInteger(index) || index < 0 || index >= positionData.accessor.count) {
        throw new Error(`Source index out of range: ${index}`);
      }
    }
    const p = source.map(index => vector3(sourcePositions, index));
    const n = source.map(index => vector3(sourceNormals, index));
    const uv = source.map(index => vector2(sourceUvs, index));
    const lengths = [distanceSquared(p[0], p[1]), distanceSquared(p[1], p[2]), distanceSquared(p[2], p[0])];
    const edge = lengths[1] > lengths[0] ? (lengths[2] > lengths[1] ? 2 : 1) : (lengths[2] > lengths[0] ? 2 : 0);
    const split = edge === 0 ? [0, 1, 2] : edge === 1 ? [1, 2, 0] : [2, 0, 1];
    const [aIndex, bIndex, cIndex] = split;
    const a = emitVertex(p[aIndex], n[aIndex], uv[aIndex]);
    const b = emitVertex(p[bIndex], n[bIndex], uv[bIndex]);
    const c = emitVertex(p[cIndex], n[cIndex], uv[cIndex]);
    const m = emitVertex(midpoint(p[aIndex], p[bIndex]), normalizedAverage(n[aIndex], n[bIndex]), midpoint(uv[aIndex], uv[bIndex]));
    indices.push(a, m, c, m, b, c);
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
    sourceTriangles: sourceIndices.length / 3,
    outputTriangles: indices.length / 3,
  };
}

function bounds(values) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < values.length; i += 3) {
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], values[i + axis]);
      max[axis] = Math.max(max[axis], values[i + axis]);
    }
  }
  return { min, max };
}

function typedBytes(array) {
  return Buffer.from(array.buffer, array.byteOffset, array.byteLength);
}

function buildOutput(source) {
  const { json: sourceJson, binary: sourceBinary } = parseGlb(source);
  const json = JSON.parse(JSON.stringify(sourceJson));
  if (!Array.isArray(json.meshes) || json.meshes.length < 1) throw new Error('Source worker has no meshes');
  if (!Array.isArray(json.buffers) || json.buffers.length !== 1) throw new Error('Worker R2 expects one GLB buffer');
  json.bufferViews ??= [];
  json.accessors ??= [];

  const parts = [sourceBinary];
  let byteLength = sourceBinary.length;
  let totalSourceTriangles = 0;
  let totalOutputTriangles = 0;
  let totalOutputVertices = 0;

  function append(array, target) {
    const padding = pad4(byteLength);
    if (padding) {
      parts.push(Buffer.alloc(padding));
      byteLength += padding;
    }
    const bytes = typedBytes(array);
    const bufferView = json.bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: bytes.length, target }) - 1;
    parts.push(bytes);
    byteLength += bytes.length;
    return bufferView;
  }

  function accessor(array, width, type, componentType, target, withBounds = false) {
    const bufferView = append(array, target);
    const entry = { bufferView, componentType, count: array.length / width, type };
    if (withBounds) {
      const valueBounds = bounds(array);
      entry.min = valueBounds.min;
      entry.max = valueBounds.max;
    }
    return json.accessors.push(entry) - 1;
  }

  for (const mesh of json.meshes) {
    for (const primitive of mesh.primitives ?? []) {
      const rebuilt = rebuildPrimitive(sourceJson, sourceBinary, primitive);
      totalSourceTriangles += rebuilt.sourceTriangles;
      totalOutputTriangles += rebuilt.outputTriangles;
      totalOutputVertices += rebuilt.positions.length / 3;
      primitive.attributes = {
        POSITION: accessor(rebuilt.positions, 3, 'VEC3', 5126, 34962, true),
        NORMAL: accessor(rebuilt.normals, 3, 'VEC3', 5126, 34962),
        TEXCOORD_0: accessor(rebuilt.uvs, 2, 'VEC2', 5126, 34962),
      };
      primitive.indices = accessor(rebuilt.indices, 1, 'SCALAR', 5123, 34963);
      primitive.mode = 4;
    }
  }

  if (totalSourceTriangles !== EXPECTED_SOURCE_TRIANGLES) {
    throw new Error(`Source triangle mismatch: expected ${EXPECTED_SOURCE_TRIANGLES}, got ${totalSourceTriangles}`);
  }
  if (totalOutputTriangles !== EXPECTED_OUTPUT_TRIANGLES) {
    throw new Error(`R2 triangle mismatch: expected ${EXPECTED_OUTPUT_TRIANGLES}, got ${totalOutputTriangles}`);
  }

  const binPadding = pad4(byteLength);
  if (binPadding) {
    parts.push(Buffer.alloc(binPadding));
    byteLength += binPadding;
  }
  json.buffers[0].byteLength = byteLength;
  json.asset = { ...(json.asset ?? {}), version: '2.0', generator: 'BOHEMIA worker R2 deterministic source-preserving exporter' };

  const jsonBytes = Buffer.from(JSON.stringify(json));
  const jsonChunk = Buffer.concat([jsonBytes, Buffer.alloc(pad4(jsonBytes.length), 0x20)]);
  const binary = Buffer.concat(parts);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binary.length, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binary.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  const output = Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binary]);

  return { output, totalSourceTriangles, totalOutputTriangles, totalOutputVertices, json };
}

const source = await fetchPinnedSource();
const result = buildOutput(source);
mkdirSync(dirname(OUTPUT), { recursive: true });
mkdirSync(dirname(RECEIPT), { recursive: true });
writeFileSync(OUTPUT, result.output);

const receipt = {
  schema_version: 1,
  asset: 'boii_adult_worker_r2',
  source: {
    url: SOURCE_URL,
    commit: SOURCE_COMMIT,
    path: SOURCE_PATH,
    bytes: source.length,
    sha256: sha256(source),
    triangles: result.totalSourceTriangles,
  },
  output: {
    path: 'public/assets/characters/boii_adult_worker_r2.glb',
    bytes: result.output.length,
    sha256: sha256(result.output),
    triangles: result.totalOutputTriangles,
    vertices: result.totalOutputVertices,
    materials: result.json.materials?.length ?? 0,
    textures: result.json.textures?.length ?? 0,
    images: result.json.images?.length ?? 0,
    animations: result.json.animations?.length ?? 0,
    skins: result.json.skins?.length ?? 0,
  },
  transform: {
    method: 'split each source triangle along its longest edge into two triangles; preserve source texture/material and interpolated UVs; generate smooth normals from source topology',
    visual_silhouette_changed: false,
    expected_triangles: EXPECTED_OUTPUT_TRIANGLES,
    target_height_metres: 1.72,
  },
  rights: 'Project owner confirms the supplied source asset is licensed for this noncommercial personal-use project.',
  admission: { canonical_runtime_changed: false, art_gate_passed: false },
};
writeFileSync(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
