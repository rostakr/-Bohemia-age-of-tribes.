import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const assetPath = 'public/assets/characters/boii_adult_worker_r2.glb';
const receiptPath = 'artifacts/phase1/worker-r2-receipt.json';

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

const original = readFileSync(assetPath);
const { json: sourceJson, binary } = parseGlb(original);
const json = JSON.parse(JSON.stringify(sourceJson));

const usedAccessors = new Set();
for (const mesh of json.meshes ?? []) {
  for (const primitive of mesh.primitives ?? []) {
    if (primitive.indices !== undefined) usedAccessors.add(primitive.indices);
    for (const accessorIndex of Object.values(primitive.attributes ?? {})) usedAccessors.add(accessorIndex);
    for (const target of primitive.targets ?? []) {
      for (const accessorIndex of Object.values(target)) usedAccessors.add(accessorIndex);
    }
  }
}
if (usedAccessors.size === 0) throw new Error('No mesh accessors referenced by worker R2');

const accessorOrder = [...usedAccessors].sort((a, b) => a - b);
const accessorMap = new Map(accessorOrder.map((oldIndex, newIndex) => [oldIndex, newIndex]));
const newAccessors = accessorOrder.map(oldIndex => ({ ...json.accessors[oldIndex] }));

const usedBufferViews = new Set();
for (const accessor of newAccessors) {
  if (accessor.bufferView === undefined) throw new Error('Sparse/implicit accessors are not supported by compactor');
  usedBufferViews.add(accessor.bufferView);
}
for (const image of json.images ?? []) {
  if (image.bufferView !== undefined) usedBufferViews.add(image.bufferView);
}

const bufferViewOrder = [...usedBufferViews].sort((a, b) => a - b);
const bufferViewMap = new Map(bufferViewOrder.map((oldIndex, newIndex) => [oldIndex, newIndex]));
const parts = [];
const newBufferViews = [];
let byteLength = 0;
for (const oldIndex of bufferViewOrder) {
  const oldView = json.bufferViews?.[oldIndex];
  if (!oldView || oldView.buffer !== 0) throw new Error(`Unsupported bufferView ${oldIndex}`);
  const padding = pad4(byteLength);
  if (padding) {
    parts.push(Buffer.alloc(padding));
    byteLength += padding;
  }
  const start = oldView.byteOffset ?? 0;
  const end = start + oldView.byteLength;
  if (start < 0 || end > binary.length) throw new Error(`bufferView ${oldIndex} exceeds BIN chunk`);
  const bytes = Buffer.from(binary.subarray(start, end));
  const next = { ...oldView, buffer: 0, byteOffset: byteLength, byteLength: bytes.length };
  newBufferViews.push(next);
  parts.push(bytes);
  byteLength += bytes.length;
}

for (const accessor of newAccessors) {
  accessor.bufferView = bufferViewMap.get(accessor.bufferView);
  if (accessor.bufferView === undefined) throw new Error('Failed to remap accessor bufferView');
}
for (const image of json.images ?? []) {
  if (image.bufferView !== undefined) {
    const mapped = bufferViewMap.get(image.bufferView);
    if (mapped === undefined) throw new Error('Failed to remap embedded image bufferView');
    image.bufferView = mapped;
  }
}
for (const mesh of json.meshes ?? []) {
  for (const primitive of mesh.primitives ?? []) {
    if (primitive.indices !== undefined) primitive.indices = accessorMap.get(primitive.indices);
    for (const [semantic, oldIndex] of Object.entries(primitive.attributes ?? {})) {
      primitive.attributes[semantic] = accessorMap.get(oldIndex);
    }
    for (const target of primitive.targets ?? []) {
      for (const [semantic, oldIndex] of Object.entries(target)) target[semantic] = accessorMap.get(oldIndex);
    }
  }
}

json.accessors = newAccessors;
json.bufferViews = newBufferViews;
json.asset = { ...(json.asset ?? {}), generator: 'BOHEMIA worker R2 deterministic compact packer' };
const compactBinary = Buffer.concat(parts);
const compact = encodeGlb(json, compactBinary);
writeFileSync(assetPath, compact);

const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
receipt.output.bytes = compact.length;
receipt.output.sha256 = sha256(compact);
receipt.transform = {
  ...(receipt.transform ?? {}),
  compacted: true,
  compaction_method: 'retain only bufferViews referenced by final mesh accessors and embedded images; no vertex/index/UV/normal/image bytes modified',
  precompact_bytes: original.length,
  compact_bytes: compact.length,
  bytes_removed: original.length - compact.length,
};
writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);

console.log(JSON.stringify({
  asset: receipt.asset,
  beforeBytes: original.length,
  afterBytes: compact.length,
  bytesRemoved: original.length - compact.length,
  sha256: receipt.output.sha256,
  accessors: json.accessors.length,
  bufferViews: json.bufferViews.length,
  images: json.images?.length ?? 0,
}, null, 2));
