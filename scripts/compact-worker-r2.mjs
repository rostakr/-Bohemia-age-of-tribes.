import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const assetPath = 'public/assets/characters/boii_adult_worker_r2.glb';
const receiptPath = 'artifacts/phase1/worker-r2-receipt.json';
const EXPECTED_TRIANGLES = 28_212;

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

function parseGlb(buffer) {
  if (buffer.length < 28 || buffer.readUInt32LE(0) !== 0x46546c67 || buffer.readUInt32LE(4) !== 2) {
    throw new Error('Expected glTF 2.0 GLB');
  }
  if (buffer.readUInt32LE(8) !== buffer.length) throw new Error('GLB length header mismatch');
  const jsonLength = buffer.readUInt32LE(12);
  if (buffer.readUInt32LE(16) !== 0x4e4f534a) throw new Error('Missing JSON chunk');
  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonLength;
  const json = JSON.parse(buffer.subarray(jsonStart, jsonEnd).toString('utf8').trimEnd());
  if (buffer.readUInt32LE(jsonEnd + 4) !== 0x004e4942) throw new Error('Missing BIN chunk');
  const binLength = buffer.readUInt32LE(jsonEnd);
  const binStart = jsonEnd + 8;
  const binEnd = binStart + binLength;
  if (binEnd > buffer.length) throw new Error('BIN chunk exceeds GLB');
  return { json, binary: buffer.subarray(binStart, binEnd) };
}

function encodeGlb(json, binary) {
  const binPadding = pad4(binary.length);
  const paddedBinary = binPadding ? Buffer.concat([binary, Buffer.alloc(binPadding)]) : binary;
  json.buffers = [{ ...(json.buffers?.[0] ?? {}), byteLength: paddedBinary.length }];
  const jsonBytes = Buffer.from(JSON.stringify(json));
  const jsonChunk = Buffer.concat([jsonBytes, Buffer.alloc(pad4(jsonBytes.length), 0x20)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + paddedBinary.length, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(paddedBinary.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonHeader, jsonChunk, binHeader, paddedBinary]);
}

function packedAccessor(json, binary, accessorIndex) {
  const accessor = json.accessors?.[accessorIndex];
  if (!accessor || accessor.sparse || accessor.bufferView === undefined) throw new Error(`Unsupported accessor ${accessorIndex}`);
  const view = json.bufferViews?.[accessor.bufferView];
  if (!view || view.buffer !== 0) throw new Error(`Unsupported bufferView for accessor ${accessorIndex}`);
  const width = TYPE_WIDTH.get(accessor.type);
  const componentBytes = COMPONENT_BYTES.get(accessor.componentType);
  if (!width || !componentBytes) throw new Error(`Unsupported accessor format ${accessorIndex}`);
  const itemBytes = width * componentBytes;
  const stride = view.byteStride ?? itemBytes;
  if (stride < itemBytes) throw new Error(`Invalid byteStride for accessor ${accessorIndex}`);
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const output = Buffer.alloc(accessor.count * itemBytes);
  for (let i = 0; i < accessor.count; i++) {
    const sourceStart = start + i * stride;
    const sourceEnd = sourceStart + itemBytes;
    if (sourceEnd > binary.length) throw new Error(`Accessor ${accessorIndex} exceeds BIN chunk`);
    binary.copy(output, i * itemBytes, sourceStart, sourceEnd);
  }
  return { accessor, bytes: output, itemBytes };
}

function readIndices(accessorData) {
  const { accessor, bytes } = accessorData;
  if (accessor.type !== 'SCALAR') throw new Error('Indices accessor must be SCALAR');
  const indices = new Array(accessor.count);
  for (let i = 0; i < accessor.count; i++) {
    const offset = i * accessorData.itemBytes;
    if (accessor.componentType === 5121) indices[i] = bytes.readUInt8(offset);
    else if (accessor.componentType === 5123) indices[i] = bytes.readUInt16LE(offset);
    else if (accessor.componentType === 5125) indices[i] = bytes.readUInt32LE(offset);
    else throw new Error(`Unsupported index component type ${accessor.componentType}`);
  }
  return indices;
}

function encodeUint16(values) {
  if (values.some(value => value < 0 || value > 65_535 || !Number.isInteger(value))) {
    throw new Error('Deduplicated worker indices exceed uint16 range');
  }
  const buffer = Buffer.alloc(values.length * 2);
  for (let i = 0; i < values.length; i++) buffer.writeUInt16LE(values[i], i * 2);
  return buffer;
}

const original = readFileSync(assetPath);
assert.equal(sha256(original), 'c0e8144f07d84bfcd7b3e5118df59c1d589a65f23f512099ed75cb1881ba81b8',
  'Compaction requires the exact QA-accepted R2 bytes; rebuild before running');
const { json: sourceJson, binary } = parseGlb(original);
const json = JSON.parse(JSON.stringify(sourceJson));
if ((json.meshes?.length ?? 0) !== 1 || (json.meshes[0]?.primitives?.length ?? 0) !== 1) {
  throw new Error('Worker R2 compactor expects exactly one mesh primitive');
}
const primitive = json.meshes[0].primitives[0];
if ((primitive.mode ?? 4) !== 4) throw new Error('Worker R2 primitive must use TRIANGLES');
const positionIndex = primitive.attributes?.POSITION;
const normalIndex = primitive.attributes?.NORMAL;
const uvIndex = primitive.attributes?.TEXCOORD_0;
if ([positionIndex, normalIndex, uvIndex, primitive.indices].some(value => value === undefined)) {
  throw new Error('Worker R2 primitive must provide POSITION/NORMAL/TEXCOORD_0/indices');
}

const position = packedAccessor(json, binary, positionIndex);
const normal = packedAccessor(json, binary, normalIndex);
const uv = packedAccessor(json, binary, uvIndex);
const index = packedAccessor(json, binary, primitive.indices);
if (position.accessor.componentType !== 5126 || position.accessor.type !== 'VEC3') throw new Error('POSITION must be float VEC3');
if (normal.accessor.componentType !== 5126 || normal.accessor.type !== 'VEC3') throw new Error('NORMAL must be float VEC3');
if (uv.accessor.componentType !== 5126 || uv.accessor.type !== 'VEC2') throw new Error('UV0 must be float VEC2');
if (position.accessor.count !== normal.accessor.count || position.accessor.count !== uv.accessor.count) {
  throw new Error('Worker R2 attribute counts differ');
}
const sourceIndices = readIndices(index);
if (sourceIndices.length / 3 !== EXPECTED_TRIANGLES) throw new Error(`Expected ${EXPECTED_TRIANGLES} triangles`);

const uniqueByTuple = new Map();
const positionParts = [];
const normalParts = [];
const uvParts = [];
const remappedIndices = [];
for (const oldVertex of sourceIndices) {
  if (!Number.isInteger(oldVertex) || oldVertex < 0 || oldVertex >= position.accessor.count) {
    throw new Error(`Worker R2 index out of range: ${oldVertex}`);
  }
  const p = position.bytes.subarray(oldVertex * position.itemBytes, (oldVertex + 1) * position.itemBytes);
  const n = normal.bytes.subarray(oldVertex * normal.itemBytes, (oldVertex + 1) * normal.itemBytes);
  const t = uv.bytes.subarray(oldVertex * uv.itemBytes, (oldVertex + 1) * uv.itemBytes);
  const key = `${p.toString('hex')}:${n.toString('hex')}:${t.toString('hex')}`;
  let newVertex = uniqueByTuple.get(key);
  if (newVertex === undefined) {
    newVertex = uniqueByTuple.size;
    if (newVertex > 65_535) throw new Error('Worker R2 unique vertex count exceeds uint16');
    uniqueByTuple.set(key, newVertex);
    positionParts.push(Buffer.from(p));
    normalParts.push(Buffer.from(n));
    uvParts.push(Buffer.from(t));
  }
  remappedIndices.push(newVertex);
}
const uniqueVertices = uniqueByTuple.size;
if (uniqueVertices >= position.accessor.count) throw new Error('Vertex deduplication produced no reduction');

const positionBytes = Buffer.concat(positionParts);
const normalBytes = Buffer.concat(normalParts);
const uvBytes = Buffer.concat(uvParts);
const indexBytes = encodeUint16(remappedIndices);

const parts = [];
const bufferViews = [];
let byteLength = 0;
function append(bytes, extra = {}) {
  const padding = pad4(byteLength);
  if (padding) {
    parts.push(Buffer.alloc(padding));
    byteLength += padding;
  }
  const bufferView = { buffer: 0, byteOffset: byteLength, byteLength: bytes.length, ...extra };
  const index = bufferViews.push(bufferView) - 1;
  parts.push(bytes);
  byteLength += bytes.length;
  return index;
}

const positionView = append(positionBytes, { target: 34962 });
const normalView = append(normalBytes, { target: 34962 });
const uvView = append(uvBytes, { target: 34962 });
const indexView = append(indexBytes, { target: 34963 });

const imageViewMap = new Map();
for (const image of json.images ?? []) {
  if (image.bufferView === undefined) continue;
  const oldViewIndex = image.bufferView;
  let mapped = imageViewMap.get(oldViewIndex);
  if (mapped === undefined) {
    const oldView = sourceJson.bufferViews?.[oldViewIndex];
    if (!oldView || oldView.buffer !== 0) throw new Error(`Unsupported image bufferView ${oldViewIndex}`);
    const start = oldView.byteOffset ?? 0;
    const end = start + oldView.byteLength;
    if (end > binary.length) throw new Error(`Image bufferView ${oldViewIndex} exceeds BIN chunk`);
    mapped = append(Buffer.from(binary.subarray(start, end)));
    imageViewMap.set(oldViewIndex, mapped);
  }
  image.bufferView = mapped;
}

json.accessors = [
  {
    bufferView: positionView,
    componentType: 5126,
    count: uniqueVertices,
    type: 'VEC3',
    ...(position.accessor.min ? { min: position.accessor.min } : {}),
    ...(position.accessor.max ? { max: position.accessor.max } : {}),
  },
  { bufferView: normalView, componentType: 5126, count: uniqueVertices, type: 'VEC3' },
  { bufferView: uvView, componentType: 5126, count: uniqueVertices, type: 'VEC2' },
  { bufferView: indexView, componentType: 5123, count: remappedIndices.length, type: 'SCALAR' },
];
json.bufferViews = bufferViews;
primitive.attributes = { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 };
primitive.indices = 3;
primitive.mode = 4;
json.asset = { ...(json.asset ?? {}), generator: 'BOHEMIA worker R2 deterministic compact+dedupe packer' };

const compactBinary = Buffer.concat(parts);
const compact = encodeGlb(json, compactBinary);
// Verify the serialized result before replacing the input, including triangle
// order/winding and every raw float byte (no tolerance or numeric rounding).
const decoded = parseGlb(compact);
const outputPrimitive = decoded.json.meshes[0].primitives[0];
const outputIndices = readIndices(packedAccessor(decoded.json, decoded.binary, outputPrimitive.indices));
assert.equal(outputIndices.length, sourceIndices.length);
for (const semantic of ['POSITION', 'NORMAL', 'TEXCOORD_0']) {
  const before = packedAccessor(sourceJson, binary, sourceJson.meshes[0].primitives[0].attributes[semantic]);
  const after = packedAccessor(decoded.json, decoded.binary, outputPrimitive.attributes[semantic]);
  assert.equal(after.itemBytes, before.itemBytes);
  for (let corner = 0; corner < sourceIndices.length; corner++) {
    const a = sourceIndices[corner] * before.itemBytes;
    const b = outputIndices[corner] * after.itemBytes;
    assert.ok(before.bytes.subarray(a, a + before.itemBytes).equals(after.bytes.subarray(b, b + after.itemBytes)),
      `${semantic} changed at triangle corner ${corner}`);
  }
}
for (let i = 0; i < sourceJson.images.length; i++) {
  const before = sourceJson.bufferViews[sourceJson.images[i].bufferView];
  const after = decoded.json.bufferViews[decoded.json.images[i].bufferView];
  assert.ok(binary.subarray(before.byteOffset ?? 0, (before.byteOffset ?? 0) + before.byteLength)
    .equals(decoded.binary.subarray(after.byteOffset ?? 0, (after.byteOffset ?? 0) + after.byteLength)),
  `Embedded image ${i} changed`);
}
function sceneMetadata(document) {
  const value = structuredClone(document);
  for (const key of ['accessors', 'bufferViews', 'buffers']) delete value[key];
  delete value.asset.generator;
  for (const image of value.images) delete image.bufferView;
  const mesh = value.meshes[0].primitives[0];
  delete mesh.attributes;
  delete mesh.indices;
  mesh.mode ??= 4;
  return value;
}
assert.deepEqual(sceneMetadata(decoded.json), sceneMetadata(sourceJson), 'Scene/material metadata changed');
assert.equal(sha256(compact), 'f50f87146909e4a3c7fa18e4a82c636fe05e24f0879f35e6a181c281c4efa21e');
writeFileSync(assetPath, compact);

const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
receipt.output.bytes = compact.length;
receipt.output.sha256 = sha256(compact);
receipt.output.vertices = uniqueVertices;
receipt.transform = {
  ...(receipt.transform ?? {}),
  compacted: true,
  equivalence_verified: true,
  compaction_method: 'deduplicate only bit-identical POSITION+NORMAL+UV tuples; repack final geometry plus embedded image; triangle and referenced attribute values unchanged',
  precompact_bytes: original.length,
  compact_bytes: compact.length,
  bytes_removed: original.length - compact.length,
  precompact_vertices: position.accessor.count,
  compact_vertices: uniqueVertices,
  vertices_removed: position.accessor.count - uniqueVertices,
};
writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);

console.log(JSON.stringify({
  asset: receipt.asset,
  beforeBytes: original.length,
  afterBytes: compact.length,
  bytesRemoved: original.length - compact.length,
  beforeVertices: position.accessor.count,
  afterVertices: uniqueVertices,
  verticesRemoved: position.accessor.count - uniqueVertices,
  triangles: remappedIndices.length / 3,
  sha256: receipt.output.sha256,
  accessors: json.accessors.length,
  bufferViews: json.bufferViews.length,
  images: json.images?.length ?? 0,
}, null, 2));
