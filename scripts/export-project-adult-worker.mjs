// Offline project-owned adult-worker export for Phase 1 QA. Not a runtime dependency.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { calculateNormals } from 'playcanvas';
import { createProjectAdultWorkerGeometry, projectAdultWorkerStats } from '../assets/source/phase1/worker/worker-geometry.ts';

const output = new URL('../public/assets/characters/boii_adult_worker_project.glb', import.meta.url);
const atlasOutput = new URL('../artifacts/phase1/worker-adult-basecolor-2048.png', import.meta.url);
const receipt = new URL('../assets/source/phase1/worker-project-glb-receipt.json', import.meta.url);

const ATLAS_SIZE = 2048;
const atlasTiles = [
  { name: 'tunic', col: 0, row: 0, rgb: [126, 88, 50] },
  { name: 'trousers', col: 1, row: 0, rgb: [68, 64, 55] },
  { name: 'leather', col: 2, row: 0, rgb: [72, 42, 24] },
  { name: 'skin', col: 0, row: 1, rgb: [176, 126, 92] },
  { name: 'hair', col: 1, row: 1, rgb: [54, 36, 24] },
  // The former accent slot is dedicated to the face. The tiny buckle is remapped to
  // leather during deterministic polish so this tile can carry non-protruding features.
  { name: 'face', col: 2, row: 1, rgb: [176, 126, 92] },
];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const value of buffer) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBytes, data]);
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0);
  typeBytes.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(body), 8 + data.length);
  return result;
}

function ellipse(u, v, cx, cy, rx, ry) {
  const dx = (u - cx) / rx;
  const dy = (v - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function makeAtlasPng() {
  const width = ATLAS_SIZE, height = ATLAS_SIZE;
  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);
  const third = width / 3;
  const half = height / 2;
  const tileFor = (x, y) => atlasTiles[(y >= half ? 3 : 0) + Math.min(2, Math.floor(x / third))];
  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0;
    for (let x = 0; x < width; x++) {
      const tile = tileFor(x, y);
      let [r, g, b] = tile.rgb;
      const localX = Math.floor(x - tile.col * third);
      const localY = y - tile.row * half;
      const localU = Math.max(0, Math.min(1, localX / third));
      const localV = Math.max(0, Math.min(1, localY / half));
      if (tile.name === 'tunic' || tile.name === 'trousers') {
        if (localY % 24 === 12) { r -= 10; g -= 10; b -= 10; }
        if (localX % 28 === 14) { r += 7; g += 7; b += 7; }
      } else if (tile.name === 'leather' && localY % 64 === Math.floor(localX / 6) % 64) {
        r -= 12; g -= 12; b -= 12;
      } else if (tile.name === 'hair' && (localX + Math.floor(localY / 3)) % 16 === 0) {
        r -= 10; g -= 10; b -= 10;
      } else if (tile.name === 'face') {
        // Head UVs are remapped here by the polish script. U≈0.25 is the front centre;
        // V runs from chin/neck toward crown. Features are texture-only to avoid the
        // primitive-like facial protrusions rejected by QA.
        const hairLine = 0.74 + 0.018 * Math.sin(localU * Math.PI * 10);
        if (localV >= hairLine) {
          [r, g, b] = [58, 39, 27];
          if ((localX + Math.floor(localY / 4)) % 19 === 0) { r -= 7; g -= 7; b -= 7; }
        }
        const leftEye = ellipse(localU, localV, 0.193, 0.585, 0.015, 0.013);
        const rightEye = ellipse(localU, localV, 0.307, 0.585, 0.015, 0.013);
        if (leftEye || rightEye) [r, g, b] = [54, 39, 30];
        const leftBrow = Math.abs(localV - 0.627) < 0.006 && localU > 0.166 && localU < 0.220;
        const rightBrow = Math.abs(localV - 0.627) < 0.006 && localU > 0.280 && localU < 0.334;
        if (leftBrow || rightBrow) [r, g, b] = [66, 43, 29];
        const mouth = Math.abs(localV - 0.305) < 0.006 && localU > 0.217 && localU < 0.283;
        if (mouth) [r, g, b] = [104, 64, 50];
        // Very restrained nose/cheek tonal cues, kept close to base skin colour.
        if (ellipse(localU, localV, 0.250, 0.455, 0.012, 0.050)) { r -= 8; g -= 6; b -= 4; }
        if (ellipse(localU, localV, 0.165, 0.445, 0.045, 0.060) || ellipse(localU, localV, 0.335, 0.445, 0.045, 0.060)) {
          r += 4; g += 2;
        }
      }
      const divider = Math.abs(x - Math.floor(third)) <= 1 || Math.abs(x - Math.floor(third * 2)) <= 1 || Math.abs(y - half) <= 1;
      if (divider) r = g = b = 20;
      const offset = rowStart + 1 + x * 3;
      raw[offset] = Math.max(0, Math.min(255, r));
      raw[offset + 1] = Math.max(0, Math.min(255, g));
      raw[offset + 2] = Math.max(0, Math.min(255, b));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const geometry = createProjectAdultWorkerGeometry();
const stats = projectAdultWorkerStats(geometry);
const atlas = makeAtlasPng();
mkdirSync(new URL('../artifacts/phase1/', import.meta.url), { recursive: true });
writeFileSync(atlasOutput, atlas);

const gltf = {
  asset: { version: '2.0', generator: 'BOHEMIA project adult-worker exporter' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ name: 'Boii adult worker — project-owned QA candidate', mesh: 0 }],
  meshes: [{ primitives: [] }],
  materials: [{
    name: 'Worker atlas material',
    pbrMetallicRoughness: {
      baseColorFactor: [1, 1, 1, 1],
      baseColorTexture: { index: 0, texCoord: 0 },
      metallicFactor: 0,
      roughnessFactor: 0.92,
    },
  }],
  images: [],
  textures: [],
  samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
  buffers: [],
  bufferViews: [],
  accessors: [],
};

const chunks = [];
let byteLength = 0;
function appendBytes(bytes, target) {
  const padding = (4 - byteLength % 4) % 4;
  if (padding) { chunks.push(Buffer.alloc(padding)); byteLength += padding; }
  const view = gltf.bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: bytes.length, ...(target ? { target } : {}) }) - 1;
  chunks.push(bytes); byteLength += bytes.length;
  return view;
}
function accessor(values, width, type, componentType, target, bounds = false) {
  const bytes = Buffer.from(values.buffer, values.byteOffset, values.byteLength);
  const view = appendBytes(bytes, target);
  const entry = { bufferView: view, componentType, count: values.length / width, type };
  if (bounds) {
    entry.min = Array(width).fill(Infinity); entry.max = Array(width).fill(-Infinity);
    for (let i = 0; i < values.length; i++) {
      const axis = i % width;
      entry.min[axis] = Math.min(entry.min[axis], values[i]);
      entry.max[axis] = Math.max(entry.max[axis], values[i]);
    }
  }
  return gltf.accessors.push(entry) - 1;
}

const atlasView = appendBytes(atlas);
const imageIndex = gltf.images.push({ name: 'worker-adult-basecolor-2048.png', bufferView: atlasView, mimeType: 'image/png' }) - 1;
gltf.textures.push({ source: imageIndex, sampler: 0 });
const positions = new Float32Array(geometry.positions);
const indices = new Uint32Array(geometry.indices);
const uvs = new Float32Array(geometry.uvs);
const normals = new Float32Array(calculateNormals(geometry.positions, geometry.indices));
gltf.meshes[0].primitives.push({
  mode: 4,
  material: 0,
  attributes: {
    POSITION: accessor(positions, 3, 'VEC3', 5126, 34962, true),
    NORMAL: accessor(normals, 3, 'VEC3', 5126, 34962),
    TEXCOORD_0: accessor(uvs, 2, 'VEC2', 5126, 34962),
  },
  indices: accessor(indices, 1, 'SCALAR', 5125, 34963),
});

gltf.buffers.push({ byteLength });
const json = Buffer.from(JSON.stringify(gltf));
const jsonChunk = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
const binary = Buffer.concat([...chunks, Buffer.alloc((4 - byteLength % 4) % 4)]);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binary.length, 8);
const chunkHeader = (size, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(size); b.writeUInt32LE(type, 4); return b; };
const glb = Buffer.concat([header, chunkHeader(jsonChunk.length, 0x4e4f534a), jsonChunk, chunkHeader(binary.length, 0x004e4942), binary]);
writeFileSync(output, glb);

const record = {
  schema_version: 1,
  asset: 'boii_adult_worker_project',
  source: 'assets/source/phase1/worker/worker-geometry.ts',
  source_sha256: createHash('sha256').update(readFileSync(new URL('../assets/source/phase1/worker/worker-geometry.ts', import.meta.url))).digest('hex'),
  source_rights: 'Original project geometry and texture-generation code; rejected supplied adult-worker mesh is not reused',
  output: 'public/assets/characters/boii_adult_worker_project.glb',
  sha256: createHash('sha256').update(glb).digest('hex'),
  bytes: glb.length,
  stats,
  units: 'metres',
  up_axis: 'Y',
  pivot: 'ground-centred near origin; lowest shoe surface approximately y=0',
  pose: 'neutral relaxed standing pose',
  atlas: {
    qa_output: 'artifacts/phase1/worker-adult-basecolor-2048.png',
    width: ATLAS_SIZE,
    height: ATLAS_SIZE,
    bytes: atlas.length,
    sha256: createHash('sha256').update(atlas).digest('hex'),
    slots: atlasTiles.map(tile => tile.name),
    generation: 'deterministic project-owned RGB PNG; no external generator or third-party texture; face slot contains flat non-protruding facial/hair cues',
  },
  materials: 1,
  textures: 1,
  maps: ['baseColor'],
  rig: null,
  animations: 0,
  historical_brief: 'Late La Tène Boii generic adult worker: tunic, trousers, simple leather shoes, restrained earth palette, no armour/status jewellery/fantasy equipment',
  validation: 'Requires geometry tests, strict GLB intake, PlayCanvas visual/historical QA and actual-hardware review before canonical admission',
  limitations: [
    'Static character; rig is optional for this milestone and not included',
    'Base-color atlas only; no normal/roughness/AO maps',
    'Facial and cloth detail are procedural and require visual art-direction review',
    'Not wired into ADMITTED_MODELS or the default benchmark',
  ],
  admission: { canonical_runtime_changed: false, art_gate_passed: false },
};
writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify(record, null, 2));