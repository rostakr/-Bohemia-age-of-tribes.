// Deterministic surface polish for the rebuilt project-owned adult-worker GLB.
// The anatomy is created in worker-geometry.ts. This pass tightens silhouette,
// removes QA-rejected overlay shadows, remaps the head to a dedicated face atlas tile,
// and regenerates normals/bounds.
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
const uvInfo = accessorInfo(primitive.attributes.TEXCOORD_0);
const indexInfo = accessorInfo(primitive.indices);
if (positionInfo.accessor.componentType !== 5126 || normalInfo.accessor.componentType !== 5126 || uvInfo.accessor.componentType !== 5126) {
  throw new Error('Expected float POSITION/NORMAL/TEXCOORD streams');
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

function readUv(vertex) {
  const offset = uvInfo.byteOffset + vertex * 8;
  return [view.getFloat32(offset, true), view.getFloat32(offset + 4, true)];
}
function writeUv(vertex, u, v) {
  const offset = uvInfo.byteOffset + vertex * 8;
  view.setFloat32(offset, u, true);
  view.setFloat32(offset + 4, v, true);
}

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

function parkInsideTorso(component, offsetX = 0) {
  const [cx, cy, cz] = component.center;
  transform(component, [0.001, 0.001, 0.001], [offsetX - cx, 1.08 - cy, -cz]);
}

const INSET = 0.006;
const SKIN = { u0: INSET, u1: 1 / 3 - INSET, v0: 1 / 2 + INSET, v1: 1 - INSET };
const LEATHER = { u0: 2 / 3 + INSET, u1: 1 - INSET, v0: INSET, v1: 1 / 2 - INSET };
const FACE = { u0: 2 / 3 + INSET, u1: 1 - INSET, v0: 1 / 2 + INSET, v1: 1 - INSET };

function remapUvRect(vertex, source, target) {
  const [u, v] = readUv(vertex);
  const nu = Math.max(0, Math.min(1, (u - source.u0) / (source.u1 - source.u0)));
  const nv = Math.max(0, Math.min(1, (v - source.v0) / (source.v1 - source.v0)));
  writeUv(vertex,
    target.u0 + (target.u1 - target.u0) * nu,
    target.v0 + (target.v1 - target.v0) * nv);
}

// The former accent slot now contains the face texture. Move any pre-existing accent
// geometry (the tiny buckle) to leather before assigning the head to the face tile.
let accentVerticesRemapped = 0;
for (let vertex = 0; vertex < vertexCount; vertex++) {
  const [u, v] = readUv(vertex);
  if (u >= FACE.u0 - 1e-5 && u <= FACE.u1 + 1e-5 && v >= FACE.v0 - 1e-5 && v <= FACE.v1 + 1e-5) {
    remapUvRect(vertex, FACE, LEATHER);
    accentVerticesRemapped++;
  }
}
if (accentVerticesRemapped !== 24) {
  throw new Error(`Expected 24 former accent/buckle vertices, remapped ${accentVerticesRemapped}`);
}

const matched = { shoes: 0, tunic: 0, sleeves: 0, hands: 0, hair: 0, ears: 0, beard: 0, brows: 0, nose: 0, head: 0 };
for (const component of components) {
  const [x, y] = component.center;
  const ax = Math.abs(x);

  if (component.count === 972 && y < 0.15) {
    transform(component, [0.92, 0.84, 0.61], [0, -0.002, -0.016]);
    for (const vertex of component.vertices) {
      const p = vertex * 3;
      const z = positions[p + 2];
      if (z > 0.095) {
        const t = Math.min(1, (z - 0.095) / 0.070);
        positions[p + 1] -= 0.030 * t;
        positions[p + 2] -= 0.018 * t;
      }
    }
    matched.shoes++;
  } else if (component.count === 584 && y > 0.9 && y < 1.2) {
    transform(component, [0.88, 1.0, 0.93]);
    for (const vertex of component.vertices) {
      const p = vertex * 3;
      const py = positions[p + 1];
      if (py > 1.28) {
        const t = Math.min(1, (py - 1.28) / 0.18);
        const outward = Math.max(0, Math.abs(positions[p]) - 0.045);
        positions[p + 1] -= outward * 0.30 * t;
        positions[p] *= 1 - 0.030 * t;
      }
    }
    matched.tunic++;
  } else if (component.count === 390 && ax > 0.2 && y > 1.0) {
    transform(component, [0.86, 0.97, 0.89], [x < 0 ? 0.028 : -0.028, -0.008, 0]);
    for (const vertex of component.vertices) {
      const p = vertex * 3;
      if (positions[p + 1] > 1.26) {
        positions[p] *= 0.965;
        positions[p + 1] -= 0.014;
      }
    }
    matched.sleeves++;
  } else if (component.count === 456 && ax > 0.25 && y < 0.9) {
    transform(component, [0.78, 0.80, 0.78], [x < 0 ? 0.016 : -0.016, 0.022, -0.006]);
    matched.hands++;
  } else if (component.count === 2323 && y > 1.6) {
    parkInsideTorso(component, 0.020);
    matched.hair++;
  } else if (component.count === 332 && y > 1.55) {
    transform(component, [0.42, 0.66, 0.40], [x < 0 ? 0.007 : -0.007, 0, -0.007]);
    matched.ears++;
  } else if (component.count === 328 && y > 1.48 && y < 1.59) {
    parkInsideTorso(component, -0.020);
    matched.beard++;
  } else if (component.count === 4 && y > 1.60) {
    parkInsideTorso(component, x < 0 ? -0.010 : 0.010);
    matched.brows++;
  } else if (component.count === 6 && y > 1.55 && y < 1.63) {
    transform(component, [0.82, 0.86, 0.30], [0, 0, -0.010]);
    matched.nose++;
  } else if (component.count === 5420 && y > 1.50 && y < 1.68) {
    for (const vertex of component.vertices) remapUvRect(vertex, SKIN, FACE);
    matched.head++;
  }
}

const expected = { shoes: 2, tunic: 1, sleeves: 2, hands: 2, hair: 1, ears: 2, beard: 1, brows: 2, nose: 1, head: 1 };
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
  accent_vertices_remapped_to_leather: accentVerticesRemapped,
  head_uv_remapped_to_face_tile: true,
  notes: [
    'continuous swept legs, sleeves and tapered hands are authored in worker-geometry.ts',
    'tunic shoulders slope down from the neck instead of reading as a horizontal barrel',
    'sleeves and hands are narrowed and moved inward while preserving cuff continuity',
    'shoe toes are shortened and flattened to remove the curled-slipper silhouette',
    'obsolete hair/beard/brow overlays are parked as microscopic geometry inside the opaque tunic so they cannot cast facial shadows',
    'nose relief is flattened toward the face plane to avoid an oversized self-shadow',
    'head UVs use a dedicated 2K atlas face tile with flat hair/eyes/brows/mouth cues and no protruding facial primitives',
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
  accentVerticesRemapped,
}, null, 2));
