// Deterministic art refinement for the project-owned adult-worker GLB.
// Transforms whole disconnected generated components so close-up cleanup cannot create
// partial-component spikes. Topology, UVs and the 26,140-triangle budget stay unchanged.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { calculateNormals } from 'playcanvas';

const file = new URL('../public/assets/characters/boii_adult_worker_project.glb', import.meta.url);
const receiptFile = new URL('../assets/source/phase1/worker-project-glb-receipt.json', import.meta.url);
const input = readFileSync(file);
if (input.readUInt32LE(0) !== 0x46546c67 || input.readUInt32LE(4) !== 2) throw new Error('Expected glTF 2.0 GLB');

const jsonLength = input.readUInt32LE(12);
if (input.readUInt32LE(16) !== 0x4e4f534a) throw new Error('Missing JSON chunk');
const json = JSON.parse(input.subarray(20, 20 + jsonLength).toString('utf8').trimEnd());
const binHeader = 20 + jsonLength;
const binLength = input.readUInt32LE(binHeader);
if (input.readUInt32LE(binHeader + 4) !== 0x004e4942) throw new Error('Missing BIN chunk');
const binary = Buffer.from(input.subarray(binHeader + 8, binHeader + 8 + binLength));
const primitive = json.meshes?.[0]?.primitives?.[0];
if (!primitive) throw new Error('Missing worker primitive');

function accessorInfo(index) {
  const accessor = json.accessors[index];
  const bufferView = json.bufferViews[accessor.bufferView];
  return { accessor, bufferView, byteOffset: (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0) };
}

const positionInfo = accessorInfo(primitive.attributes.POSITION);
const normalInfo = accessorInfo(primitive.attributes.NORMAL);
const indexInfo = accessorInfo(primitive.indices);
if (positionInfo.accessor.componentType !== 5126 || normalInfo.accessor.componentType !== 5126) {
  throw new Error('Expected float POSITION/NORMAL streams');
}
if (indexInfo.accessor.componentType !== 5125) throw new Error('Expected uint32 indices');

const vertexCount = positionInfo.accessor.count;
const indexCount = indexInfo.accessor.count;
const view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
const positions = new Array(vertexCount * 3);
const indices = new Array(indexCount);
for (let i = 0; i < vertexCount; i++) {
  const offset = positionInfo.byteOffset + i * 12;
  positions[i * 3] = view.getFloat32(offset, true);
  positions[i * 3 + 1] = view.getFloat32(offset + 4, true);
  positions[i * 3 + 2] = view.getFloat32(offset + 8, true);
}
for (let i = 0; i < indexCount; i++) indices[i] = view.getUint32(indexInfo.byteOffset + i * 4, true);

// The generator emits most anatomical/clothing elements as disconnected indexed geometry.
// Union-find lets the refinement operate on complete elements, never a partial surface.
const parent = Array.from({ length: vertexCount }, (_, i) => i);
const rank = new Uint8Array(vertexCount);
function find(value) {
  let root = value;
  while (parent[root] !== root) root = parent[root];
  while (parent[value] !== value) {
    const next = parent[value];
    parent[value] = root;
    value = next;
  }
  return root;
}
function union(a, b) {
  let ra = find(a), rb = find(b);
  if (ra === rb) return;
  if (rank[ra] < rank[rb]) [ra, rb] = [rb, ra];
  parent[rb] = ra;
  if (rank[ra] === rank[rb]) rank[ra]++;
}
for (let i = 0; i < indexCount; i += 3) {
  union(indices[i], indices[i + 1]);
  union(indices[i], indices[i + 2]);
}

const groups = new Map();
for (let i = 0; i < vertexCount; i++) {
  const root = find(i);
  if (!groups.has(root)) groups.set(root, []);
  groups.get(root).push(i);
}

function componentInfo(vertices) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const vertex of vertices) {
    const p = vertex * 3;
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], positions[p + axis]);
      max[axis] = Math.max(max[axis], positions[p + axis]);
    }
  }
  return {
    vertices,
    count: vertices.length,
    min,
    max,
    center: min.map((value, axis) => (value + max[axis]) / 2),
    size: min.map((value, axis) => max[axis] - value),
  };
}
const components = [...groups.values()].map(componentInfo);

function near(value, target, tolerance) { return Math.abs(value - target) <= tolerance; }
function transform(component, scale, shift = [0, 0, 0]) {
  const center = component.center;
  for (const vertex of component.vertices) {
    const p = vertex * 3;
    for (let axis = 0; axis < 3; axis++) {
      positions[p + axis] = center[axis] + (positions[p + axis] - center[axis]) * scale[axis] + shift[axis];
    }
  }
}

const matched = { shoes: 0, shoulders: 0, hands: 0, beard: 0, ears: 0, nose: 0 };
for (const component of components) {
  const [x, y, z] = component.center;
  const count = component.count;
  const ax = Math.abs(x);

  if (count === 658 && near(y, 0.075, 0.02) && near(ax, 0.115, 0.03)) {
    transform(component, [0.86, 0.84, 0.78], [0, -0.008, -0.005]);
    matched.shoes++;
  } else if (count === 302 && near(y, 1.355, 0.025) && near(ax, 0.265, 0.035)) {
    transform(component, [0.70, 0.72, 0.55]);
    matched.shoulders++;
  } else if (count === 822 && near(y, 0.815, 0.025) && near(ax, 0.360, 0.035)) {
    transform(component, [0.72, 0.80, 0.68]);
    matched.hands++;
  } else if (count === 1178 && near(x, 0, 0.02) && near(y, 1.525, 0.03) && z > 0.08) {
    // Beard is optional for this milestone. Keep topology but hide the generated sphere
    // inside the lower face instead of shipping a dark circular protrusion.
    transform(component, [0.28, 0.32, 0.16], [0, -0.010, -0.075]);
    matched.beard++;
  } else if (count === 302 && near(y, 1.590, 0.025) && near(ax, 0.113, 0.02)) {
    transform(component, [0.42, 0.58, 0.42], [x < 0 ? 0.007 : -0.007, 0, -0.004]);
    matched.ears++;
  } else if (count === 530 && near(x, 0, 0.02) && near(y, 1.585, 0.025) && z > 0.10) {
    transform(component, [0.72, 0.78, 0.50], [0, 0, -0.020]);
    matched.nose++;
  }
}

const expected = { shoes: 2, shoulders: 2, hands: 2, beard: 1, ears: 2, nose: 1 };
for (const [key, value] of Object.entries(expected)) {
  if (matched[key] !== value) throw new Error(`Refinement component mismatch for ${key}: expected ${value}, got ${matched[key]}`);
}

// The two brow addBox calls are the final geometry emitted by worker-geometry.ts.
// Each box contributes 24 duplicated face vertices, so the final 48 vertices are an
// exact deterministic range. Verify their raw bounds before moving them.
const browStart = vertexCount - 48;
for (let i = browStart; i < vertexCount; i++) {
  const p = i * 3;
  const x = positions[p], y = positions[p + 1], z = positions[p + 2];
  if (!(y >= 1.606 && y <= 1.624 && Math.abs(x) <= 0.080 && z >= 0.102 && z <= 0.120)) {
    throw new Error(`Unexpected brow vertex ${i}: ${x}, ${y}, ${z}`);
  }
  const centerX = x < 0 ? -0.040 : 0.040;
  positions[p] = centerX + (x - centerX) * 0.50;
  positions[p + 1] = 1.615 + (y - 1.615) * 0.45;
  positions[p + 2] = 0.056 + (z - 0.111) * 0.35;
}
const browVertices = 48;

for (let i = 0; i < vertexCount; i++) {
  const offset = positionInfo.byteOffset + i * 12;
  view.setFloat32(offset, positions[i * 3], true);
  view.setFloat32(offset + 4, positions[i * 3 + 1], true);
  view.setFloat32(offset + 8, positions[i * 3 + 2], true);
}

const normals = calculateNormals(positions, indices);
if (normals.length !== vertexCount * 3) throw new Error('Normal regeneration length mismatch');
for (let i = 0; i < normals.length; i++) view.setFloat32(normalInfo.byteOffset + i * 4, normals[i], true);

const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < positions.length; i += 3) {
  for (let axis = 0; axis < 3; axis++) {
    min[axis] = Math.min(min[axis], positions[i + axis]);
    max[axis] = Math.max(max[axis], positions[i + axis]);
  }
}
positionInfo.accessor.min = min;
positionInfo.accessor.max = max;

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
  method: 'whole disconnected indexed components plus deterministic final 48 brow vertices',
  topology_changed: false,
  normals_regenerated: true,
  bounds_regenerated: true,
  matched_components: matched,
  brow_vertices: browVertices,
  purpose: 'Remove close-up toy-like protrusions without partial-component spikes, while preserving the RTS silhouette and 26,140-triangle budget',
};
writeFileSync(receiptFile, JSON.stringify(receipt, null, 2) + '\n');

console.log(JSON.stringify({
  output: 'public/assets/characters/boii_adult_worker_project.glb',
  bytes: output.length,
  sha256: receipt.sha256,
  stats,
  componentCount: components.length,
  matched,
  browVertices,
}, null, 2));
