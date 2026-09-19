// Deterministic art refinement for the project-owned adult-worker GLB.
// Keeps topology/UVs/triangle budget unchanged while improving close-up proportions.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { calculateNormals } from 'playcanvas';

const file = new URL('../public/assets/characters/boii_adult_worker_project.glb', import.meta.url);
const receiptFile = new URL('../assets/source/phase1/worker-project-glb-receipt.json', import.meta.url);
const input = readFileSync(file);
if (input.readUInt32LE(0) !== 0x46546c67 || input.readUInt32LE(4) !== 2) throw new Error('Expected glTF 2.0 GLB');

const jsonLength = input.readUInt32LE(12);
const jsonType = input.readUInt32LE(16);
if (jsonType !== 0x4e4f534a) throw new Error('Missing JSON chunk');
const json = JSON.parse(input.subarray(20, 20 + jsonLength).toString('utf8').trimEnd());
const binHeader = 20 + jsonLength;
const binLength = input.readUInt32LE(binHeader);
const binType = input.readUInt32LE(binHeader + 4);
if (binType !== 0x004e4942) throw new Error('Missing BIN chunk');
const binary = Buffer.from(input.subarray(binHeader + 8, binHeader + 8 + binLength));

const primitive = json.meshes?.[0]?.primitives?.[0];
if (!primitive) throw new Error('Missing worker primitive');

function accessorInfo(index) {
  const accessor = json.accessors[index];
  const view = json.bufferViews[accessor.bufferView];
  return { accessor, view, byteOffset: (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0) };
}

const pos = accessorInfo(primitive.attributes.POSITION);
const uv = accessorInfo(primitive.attributes.TEXCOORD_0);
const normal = accessorInfo(primitive.attributes.NORMAL);
const idx = accessorInfo(primitive.indices);
if (pos.accessor.componentType !== 5126 || uv.accessor.componentType !== 5126 || normal.accessor.componentType !== 5126) {
  throw new Error('Expected float POSITION/TEXCOORD_0/NORMAL streams');
}
if (idx.accessor.componentType !== 5125) throw new Error('Expected uint32 worker indices');

const vertexCount = pos.accessor.count;
const positions = new Array(vertexCount * 3);
const uvs = new Array(vertexCount * 2);
const view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
for (let i = 0; i < vertexCount; i++) {
  const po = pos.byteOffset + i * 12;
  const uo = uv.byteOffset + i * 8;
  positions[i * 3] = view.getFloat32(po, true);
  positions[i * 3 + 1] = view.getFloat32(po + 4, true);
  positions[i * 3 + 2] = view.getFloat32(po + 8, true);
  uvs[i * 2] = view.getFloat32(uo, true);
  uvs[i * 2 + 1] = view.getFloat32(uo + 4, true);
}

const inRect = (u, v, u0, v0, u1, v1) => u >= u0 && u <= u1 && v >= v0 && v <= v1;
const thirds = { left: [0.0, 1 / 3], middle: [1 / 3, 2 / 3], right: [2 / 3, 1.0] };
const isTunic = (u, v) => inRect(u, v, thirds.left[0], 0, thirds.left[1], 0.5);
const isLeather = (u, v) => inRect(u, v, thirds.right[0], 0, thirds.right[1], 0.5);
const isSkin = (u, v) => inRect(u, v, thirds.left[0], 0.5, thirds.left[1], 1.0);
const isHair = (u, v) => inRect(u, v, thirds.middle[0], 0.5, thirds.middle[1], 1.0);

let shoes = 0, shoulders = 0, hands = 0, beard = 0, ears = 0, face = 0, brows = 0;
for (let i = 0; i < vertexCount; i++) {
  const p = i * 3, t = i * 2;
  let x = positions[p], y = positions[p + 1], z = positions[p + 2];
  const u = uvs[t], v = uvs[t + 1];

  // Shorter/narrower soft shoes; retain a ground-contact minimum near y=0.
  if (isLeather(u, v) && y < 0.16) {
    const cx = x < 0 ? -0.115 : 0.115;
    x = cx + (x - cx) * 0.86;
    y = 0.060 + (y - 0.075) * 0.83;
    z = 0.055 + (z - 0.060) * 0.78;
    shoes++;
  }

  // Pull the spherical shoulder caps into the tunic silhouette instead of armour-like bulges.
  if (isTunic(u, v) && y > 1.22 && y < 1.48 && Math.abs(x) > 0.20) {
    const sign = Math.sign(x) || 1;
    x = sign * (0.20 + (Math.abs(x) - 0.20) * 0.55);
    z *= 0.90;
    shoulders++;
  }

  // Smaller hands, still readable at RTS distance.
  if (isSkin(u, v) && y > 0.68 && y < 0.94 && Math.abs(x) > 0.26) {
    const cx = x < 0 ? -0.360 : 0.360;
    x = cx + (x - cx) * 0.72;
    y = 0.815 + (y - 0.815) * 0.82;
    z = 0.068 + (z - 0.068) * 0.72;
    hands++;
  }

  // Flatten the separate beard volume into a restrained chin patch.
  if (isHair(u, v) && y > 1.43 && y < 1.60 && z > 0.075) {
    x *= 0.86;
    y = 1.525 + (y - 1.525) * 0.72;
    z = 0.103 + (z - 0.116) * 0.38;
    beard++;
  }

  // Reduce ear/head-side protrusion; this intentionally preserves the generic head silhouette.
  if (isSkin(u, v) && y > 1.54 && y < 1.64 && Math.abs(x) > 0.108 && z < 0.055) {
    const sign = Math.sign(x) || 1;
    x = sign * (0.108 + (Math.abs(x) - 0.108) * 0.62);
    y = 1.590 + (y - 1.590) * 0.84;
    z = 0.018 + (z - 0.018) * 0.74;
    ears++;
  }

  // Restrain the procedural nose/front-of-face protrusion.
  if (isSkin(u, v) && y > 1.54 && y < 1.63 && Math.abs(x) < 0.045 && z > 0.105) {
    x *= 0.78;
    y = 1.585 + (y - 1.585) * 0.82;
    z = 0.105 + (z - 0.111) * 0.68;
    face++;
  }

  // Keep brows as subtle hair blocks rather than a visor-like bar.
  if (isHair(u, v) && y > 1.60 && y < 1.635 && z > 0.095) {
    x *= 0.84;
    y = 1.615 + (y - 1.615) * 0.70;
    z = 0.102 + (z - 0.111) * 0.42;
    brows++;
  }

  positions[p] = x; positions[p + 1] = y; positions[p + 2] = z;
  const po = pos.byteOffset + i * 12;
  view.setFloat32(po, x, true);
  view.setFloat32(po + 4, y, true);
  view.setFloat32(po + 8, z, true);
}

const indexCount = idx.accessor.count;
const indices = new Array(indexCount);
for (let i = 0; i < indexCount; i++) indices[i] = view.getUint32(idx.byteOffset + i * 4, true);
const normals = calculateNormals(positions, indices);
if (normals.length !== vertexCount * 3) throw new Error('Normal regeneration length mismatch');
for (let i = 0; i < normals.length; i++) view.setFloat32(normal.byteOffset + i * 4, normals[i], true);

const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < positions.length; i += 3) {
  for (let axis = 0; axis < 3; axis++) {
    min[axis] = Math.min(min[axis], positions[i + axis]);
    max[axis] = Math.max(max[axis], positions[i + axis]);
  }
}
pos.accessor.min = min;
pos.accessor.max = max;

const jsonBytes = Buffer.from(JSON.stringify(json));
const jsonChunk = Buffer.concat([jsonBytes, Buffer.alloc((4 - jsonBytes.length % 4) % 4, 0x20)]);
const binChunk = Buffer.concat([binary, Buffer.alloc((4 - binary.length % 4) % 4)]);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8);
const chunkHeader = (size, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(size, 0); b.writeUInt32LE(type, 4); return b; };
const output = Buffer.concat([header, chunkHeader(jsonChunk.length, 0x4e4f534a), jsonChunk, chunkHeader(binChunk.length, 0x004e4942), binChunk]);
writeFileSync(file, output);

const stats = {
  triangles: indexCount / 3,
  vertices: vertexCount,
  width: max[0] - min[0],
  height: max[1] - min[1],
  depth: max[2] - min[2],
};
const receipt = JSON.parse(readFileSync(receiptFile, 'utf8'));
receipt.sha256 = createHash('sha256').update(output).digest('hex');
receipt.bytes = output.length;
receipt.stats = stats;
receipt.art_refinement = {
  script: 'scripts/refine-project-adult-worker-glb.mjs',
  topology_changed: false,
  normals_regenerated: true,
  bounds_regenerated: true,
  transformed_vertices: { shoes, shoulders, hands, beard, ears, face, brows },
  purpose: 'Reduce close-up toy-like exaggeration while preserving the RTS silhouette and 26,140-triangle budget',
};
writeFileSync(receiptFile, JSON.stringify(receipt, null, 2) + '\n');

console.log(JSON.stringify({
  output: 'public/assets/characters/boii_adult_worker_project.glb',
  bytes: output.length,
  sha256: receipt.sha256,
  stats,
  transformed: receipt.art_refinement.transformed_vertices,
}, null, 2));
