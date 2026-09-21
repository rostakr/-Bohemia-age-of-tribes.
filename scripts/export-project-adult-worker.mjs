// Offline project-owned adult-worker R2 export for Phase 1 QA. Not a runtime dependency.
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
  { name: 'tunic', col: 0, row: 0, rgb: [118, 82, 47] },
  { name: 'trousers', col: 1, row: 0, rgb: [65, 62, 54] },
  { name: 'leather', col: 2, row: 0, rgb: [72, 43, 25] },
  { name: 'skin', col: 0, row: 1, rgb: [181, 132, 96] },
  { name: 'face', col: 1, row: 1, rgb: [181, 132, 96] },
  { name: 'accent', col: 2, row: 1, rgb: [90, 94, 88] },
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
  const width = ATLAS_SIZE;
  const height = ATLAS_SIZE;
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
        const weave = Math.sin(localX * 0.17) * 4 + Math.sin(localY * 0.13) * 3;
        r += weave; g += weave; b += weave;
        if ((localX + localY) % 41 === 0) { r -= 7; g -= 7; b -= 7; }
      } else if (tile.name === 'leather') {
        const grain = Math.sin(localX * 0.09 + localY * 0.05) * 5;
        r += grain; g += grain * 0.7; b += grain * 0.5;
        if ((localX * 3 + localY) % 79 === 0) { r -= 8; g -= 6; b -= 4; }
      } else if (tile.name === 'skin') {
        const skinTone = Math.sin(localX * 0.05) * 1.5 + Math.sin(localY * 0.06) * 1.2;
        r += skinTone; g += skinTone * 0.7; b += skinTone * 0.5;
      } else if (tile.name === 'face') {
        const skinTone = Math.sin(localX * 0.04) * 1.8 + Math.sin(localY * 0.05) * 1.4;
        r += skinTone; g += skinTone * 0.7; b += skinTone * 0.5;

        // Head UV seam is at the back; camera-facing facial meridian is U=0.5.
        const hairLine = 0.765 + 0.018 * Math.cos((localU - 0.5) * Math.PI * 8);
        const sideHair = Math.abs(localU - 0.5) > 0.34 && localV > 0.54;
        if (localV >= hairLine || sideHair) {
          [r, g, b] = [57, 39, 27];
          if ((localX + Math.floor(localY / 4)) % 23 === 0) { r -= 6; g -= 5; b -= 4; }
        }

        const leftEye = ellipse(localU, localV, 0.435, 0.575, 0.024, 0.014);
        const rightEye = ellipse(localU, localV, 0.565, 0.575, 0.024, 0.014);
        if (leftEye || rightEye) [r, g, b] = [52, 39, 31];

        const leftBrow = Math.abs(localV - 0.622) < 0.008 && localU > 0.395 && localU < 0.470;
        const rightBrow = Math.abs(localV - 0.622) < 0.008 && localU > 0.530 && localU < 0.605;
        if (leftBrow || rightBrow) [r, g, b] = [65, 44, 31];

        if (ellipse(localU, localV, 0.500, 0.455, 0.018, 0.060)) {
          r -= 8; g -= 5; b -= 3;
        }
        if (ellipse(localU, localV, 0.415, 0.445, 0.050, 0.070) ||
            ellipse(localU, localV, 0.585, 0.445, 0.050, 0.070)) {
          r += 4; g += 2;
        }

        const mouth = Math.abs(localV - 0.295) < 0.007 && localU > 0.455 && localU < 0.545;
        if (mouth) [r, g, b] = [107, 68, 53];

        const jawShadow = localV < 0.245 && Math.abs(localU - 0.5) < 0.23;
        if (jawShadow) { r -= 5; g -= 4; b -= 3; }
      }

      const divider =
        Math.abs(x - Math.floor(third)) <= 1 ||
        Math.abs(x - Math.floor(third * 2)) <= 1 ||
        Math.abs(y - half) <= 1;
      if (divider) r = g = b = 20;

      const offset = rowStart + 1 + x * 3;
      raw[offset] = Math.max(0, Math.min(255, Math.round(r)));
      raw[offset + 1] = Math.max(0, Math.min(255, Math.round(g)));
      raw[offset + 2] = Math.max(0, Math.min(255, Math.round(b)));
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

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
  asset: { version: '2.0', generator: 'BOHEMIA project adult-worker R2 exporter' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ name: 'Boii adult worker R2 — project-owned QA candidate', mesh: 0 }],
  meshes: [{ primitives: [] }],
  materials: [{
    name: 'Worker R2 atlas material',
    pbrMetallicRoughness: {
      baseColorFactor: [1, 1, 1, 1],
      baseColorTexture: { index: 0, texCoord: 0 },
      metallicFactor: 0,
      roughnessFactor: 0.94,
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
  if (padding) {
    chunks.push(Buffer.alloc(padding));
    byteLength += padding;
  }
  const view = gltf.bufferViews.push({
    buffer: 0,
    byteOffset: byteLength,
    byteLength: bytes.length,
    ...(target ? { target } : {}),
  }) - 1;
  chunks.push(bytes);
  byteLength += bytes.length;
  return view;
}

function accessor(values, width, type, componentType, target, bounds = false) {
  const bytes = Buffer.from(values.buffer, values.byteOffset, values.byteLength);
  const view = appendBytes(bytes, target);
  const entry = { bufferView: view, componentType, count: values.length / width, type };
  if (bounds) {
    entry.min = Array(width).fill(Infinity);
    entry.max = Array(width).fill(-Infinity);
    for (let i = 0; i < values.length; i++) {
      const axis = i % width;
      entry.min[axis] = Math.min(entry.min[axis], values[i]);
      entry.max[axis] = Math.max(entry.max[axis], values[i]);
    }
  }
  return gltf.accessors.push(entry) - 1;
}

const atlasView = appendBytes(atlas);
const imageIndex = gltf.images.push({
  name: 'worker-adult-r2-basecolor-2048.png',
  bufferView: atlasView,
  mimeType: 'image/png',
}) - 1;
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
header.writeUInt32LE(0x46546c67);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binary.length, 8);
const chunkHeader = (size, type) => {
  const b = Buffer.alloc(8);
  b.writeUInt32LE(size);
  b.writeUInt32LE(type, 4);
  return b;
};
const glb = Buffer.concat([
  header,
  chunkHeader(jsonChunk.length, 0x4e4f534a),
  jsonChunk,
  chunkHeader(binary.length, 0x004e4942),
  binary,
]);
writeFileSync(output, glb);

const record = {
  schema_version: 2,
  asset: 'boii_adult_worker_project_r2',
  source: 'assets/source/phase1/worker/worker-geometry.ts',
  source_sha256: createHash('sha256')
    .update(readFileSync(new URL('../assets/source/phase1/worker/worker-geometry.ts', import.meta.url)))
    .digest('hex'),
  source_rights: 'Original project R2 geometry and texture-generation code; supplied/rejected worker mesh is not reused',
  output: 'public/assets/characters/boii_adult_worker_project.glb',
  sha256: createHash('sha256').update(glb).digest('hex'),
  bytes: glb.length,
  stats,
  units: 'metres',
  up_axis: 'Y',
  pivot: 'ground-centred near origin; shoe sole reaches approximately y=0',
  pose: 'neutral relaxed standing pose',
  construction: {
    torso: 'continuous lofted tunic with sloped shoulders and restrained folds',
    limbs: 'multi-ring swept limbs with natural taper and bend',
    hands: 'tapered palm/finger sweep with separate small thumb branch',
    shoes: 'lengthwise swept leather shoe profile with tapered toe',
    head: 'custom lofted anatomical profile with geometric nose/brow/chin relief; no facial primitive overlays',
  },
  atlas: {
    qa_output: 'artifacts/phase1/worker-adult-basecolor-2048.png',
    width: ATLAS_SIZE,
    height: ATLAS_SIZE,
    bytes: atlas.length,
    sha256: createHash('sha256').update(atlas).digest('hex'),
    slots: atlasTiles.map(tile => tile.name),
    generation: 'deterministic project-owned RGB PNG; face tile maps directly to the head UVs; no external generator or third-party texture',
  },
  materials: 1,
  textures: 1,
  maps: ['baseColor'],
  rig: null,
  animations: 0,
  historical_brief: 'Late La Tène Boii generic adult worker: knee-length wool tunic, trousers, simple leather shoes, restrained earth palette, no armour/status jewellery/fantasy/Roman/medieval cues',
  validation: 'Requires geometry tests, strict GLB intake, isolated PlayCanvas RTS/close-up review and full foundation regressions before QA admission',
  limitations: [
    'Static character; no rig or animation in this Phase 1 milestone',
    'Base-color atlas only; no normal/roughness/AO maps',
    'Not wired into ADMITTED_MODELS or default benchmark',
    'Independent visual/historical QA remains required',
  ],
  admission: { canonical_runtime_changed: false, art_gate_passed: false },
};

writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify(record, null, 2));
