// Deterministic surface polish for the rebuilt project-owned adult-worker GLB.
// The anatomy is created in worker-geometry.ts. This pass only tightens silhouette,
// hides optional protruding facial overlays, and regenerates normals/bounds.
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
  };
}
const components = [...groups.values()].map(componentInfo);

function transform(component, scale, shift = [0, 0, 0]) {
  const center = component.center;
  for (const vertex of component.vertices) {
    const p = vertex * 3;
    for (let axis = 0; axis < 3; axis++) {
      positions[p + axis] = center[axis] + (positions[p + axis] - center[axis]) * scale[axis] + shift[axis];
    }
  }
}

const matched = { shoes: 0, tunic: 0, sleeves: 0, hands: 0, hair: 0, ears: 0, beard: 0, brows: 0 };
for (const component of components) {
  const [x, y] = component.center;
  const ax = Math.abs(x);

  if (component.count === 972 && y < 0.15) {
    transform(component, [0.95, 0.96, 0.82], [0, 0, -0.006]);
    matched.shoes++;
  } else if (component.count === 584 && y > 0.9 && y < 1.2) {
    transform(component, [0.92, 1.0, 0.96]);
    matched.tunic++;
  } else if (component.count === 390 && ax > 0.2 && y > 1.0) {
    transform(component, [0.95, 1.0, 0.95], [x < 0 ? 0.012 : -0.012, 0, 0]);
    matched.sleeves++;
  } else if (component.count === 456 && ax > 0.25 && y < 0.9) {
    transform(component, [0.90, 0.98, 0.88], [x < 0 ? 0.010 : -0.010, 0.005, -0.002]);
    matched.hands++;
  } else if (component.count === 2323 && y > 1.6) {
    // Tighten the scalp shell and lift the low front edge to remove sharp temple flaps.
    transform(component, [0.96, 1.0, 0.95], [0, 0.003, -0.002]);
    for (const vertex of component.vertices) {
      const p = vertex * 3;
      const py = positions[p + 1];
      const pz = positions[p + 2];
      if (py < 1.655 && pz > 0.015) {
        const lift = (1.655 - py) * 0.70;
        positions[p + 1] += lift;
        positions[p] *= 0.94;
        positions[p + 2] = 0.006 + (pz - 0.006) * 0.88;
      }
    }
    matched.hair++;
  } else if (component.count === 332 && y > 1.55) {
    transform(component, [0.68, 0.82, 0.65], [x < 0 ? 0.004 : -0.004, 0, -0.002]);
    matched.ears++;
  } else if (component.count === 328 && y > 1.48 && y < 1.59) {
    // Beard is optional. Hide the QA-rejected protruding overlay inside the lower face;
    // the repaired candidate reads as a clean-shaven generic worker instead.
    transform(component, [0.80, 0.78, 0.08], [0, -0.004, -0.052]);
    matched.beard++;
  } else if (component.count === 4 && y > 1.60) {
    // Geometric brow cards read as sticks in close-up; hide them inside the forehead.
    transform(component, [0.85, 0.85, 0.25], [0, 0, -0.035]);
    matched.brows++;
  }
}

const expected = { shoes: 2, tunic: 1, sleeves: 2, hands: 2, hair: 1, ears: 2, beard: 1, brows: 2 };
for (const [key, value] of Object.entries(expected)) {
  if (matched[key] !== value) throw new Error(`Worker polish component mismatch for ${key}: expected ${value}, got ${matched[key]}`);
}

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
receipt.art_repair = {
  source_level_anatomy_rebuild: true,
  surface_polish_script: 'scripts/refine-project-adult-worker-glb.mjs',
  topology_changed_by_polish: false,
  normals_regenerated: true,
  bounds_regenerated: true,
  matched_components: matched,
  notes: [
    'continuous swept legs, sleeves and tapered hands are authored in worker-geometry.ts',
    'tunic shoulder width and limb spacing tightened without changing runtime architecture',
    'optional protruding beard and brow overlays hidden inside the face after close-up review',
    'hair shell tightened and front edge lifted to remove temple flaps',
  ],
};
writeFileSync(receiptFile, JSON.stringify(receipt, null, 2) + '\n');

console.log(JSON.stringify({
  output: 'public/assets/characters/boii_adult_worker_project.glb',
  bytes: output.length,
  sha256: receipt.sha256,
  stats,
  componentCount: components.length,
  matched,
}, null, 2));
