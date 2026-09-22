// Offline project-owned workshop export for Phase 1 QA. Not a runtime dependency.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { calculateNormals } from 'playcanvas';
import {
  createWorkshopGeometry,
  workshopStats,
  WORKSHOP_UV_REPEAT_METRES,
} from '../src/render/workshop-repair.ts';

const output = new URL('../public/assets/buildings/boii_carpentry_shed_project.glb', import.meta.url);
const receipt = new URL('../assets/source/phase1/workshop-project-glb-receipt.json', import.meta.url);
const geometry = createWorkshopGeometry();
const materials = [
  ['timber', [0.32, 0.21, 0.12], 0.955, 0],
  ['workwood', [0.56, 0.43, 0.29], 0.94, 0],
  ['thatch', [0.50, 0.38, 0.16], 0.985, 0],
  ['earth', [0.40, 0.34, 0.24], 0.99, 0],
  ['iron', [0.30, 0.31, 0.29], 0.72, 0.65],
];

const gltf = {
  asset: { version: '2.0', generator: 'BOHEMIA offline project workshop export' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ name: 'Boii carpentry shelter — project-owned WIP', mesh: 0 }],
  meshes: [{ primitives: [] }],
  materials: [],
  buffers: [],
  bufferViews: [],
  accessors: [],
  images: [],
  textures: [],
  samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
};

const chunks = [];
let byteLength = 0;
const textureRecords = [];
const textureByMaterial = new Map();
for (const [material, file] of [
  ['timber', 'weathered-oak-basecolor-runtime-512.jpg'],
  ['thatch', 'straw-thatch-basecolor-runtime-512.jpg'],
]) {
  const bytes = readFileSync(new URL(`../assets/source/phase1/materials/runtime/${file}`, import.meta.url));
  const padding = (4 - byteLength % 4) % 4;
  if (padding) { chunks.push(Buffer.alloc(padding)); byteLength += padding; }
  const bufferView = gltf.bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: bytes.length }) - 1;
  chunks.push(bytes); byteLength += bytes.length;
  const imageIndex = gltf.images.push({ name: file, bufferView, mimeType: 'image/jpeg' }) - 1;
  textureByMaterial.set(material, gltf.textures.push({ source: imageIndex, sampler: 0 }) - 1);
  textureRecords.push({
    name: file,
    material,
    embedded: true,
    width: 512,
    height: 512,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}

function accessor(values, width, type, componentType, target, bounds = false) {
  const padding = (4 - byteLength % 4) % 4;
  if (padding) { chunks.push(Buffer.alloc(padding)); byteLength += padding; }
  const bytes = Buffer.from(values.buffer, values.byteOffset, values.byteLength);
  const view = gltf.bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: bytes.length, target }) - 1;
  chunks.push(bytes); byteLength += bytes.length;
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

const linear = value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
for (const [name, color, roughness, metallic] of materials) {
  const mesh = geometry[name];
  const texture = textureByMaterial.get(name);
  let uvs = mesh.uvs;
  if (name === 'thatch') {
    // Workshop roof ridge runs along X. Keep straw scale stable across both roof planes;
    // V follows approximate slope distance from the ridge. This remains a project UV pass,
    // not a claim of physically scanned material coordinates.
    const halfRun = 1.62;
    const slope = Math.hypot(halfRun, 3.48 - 2.30);
    uvs = [];
    for (let i = 0; i < mesh.positions.length; i += 3) {
      const x = mesh.positions[i];
      const z = mesh.positions[i + 2];
      uvs.push(
        x / WORKSHOP_UV_REPEAT_METRES,
        Math.abs(z) * slope / halfRun / WORKSHOP_UV_REPEAT_METRES,
      );
    }
  }
  const material = gltf.materials.push({
    name,
    pbrMetallicRoughness: {
      baseColorFactor: texture !== undefined ? (name === 'thatch' ? [0.52, 0.43, 0.30, 1] : [1, 1, 1, 1]) : [...color.map(linear), 1],
      ...(texture !== undefined ? { baseColorTexture: { index: texture, texCoord: 0 } } : {}),
      metallicFactor: metallic,
      roughnessFactor: roughness,
    },
  }) - 1;
  gltf.meshes[0].primitives.push({
    mode: 4,
    material,
    attributes: {
      POSITION: accessor(new Float32Array(mesh.positions), 3, 'VEC3', 5126, 34962, true),
      NORMAL: accessor(new Float32Array(calculateNormals(mesh.positions, mesh.indices)), 3, 'VEC3', 5126, 34962),
      TEXCOORD_0: accessor(new Float32Array(uvs), 2, 'VEC2', 5126, 34962),
    },
    indices: accessor(new Uint32Array(mesh.indices), 1, 'SCALAR', 5125, 34963),
  });
}

gltf.buffers.push({ byteLength });
const json = Buffer.from(JSON.stringify(gltf));
const jsonChunk = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
const binary = Buffer.concat([...chunks, Buffer.alloc((4 - byteLength % 4) % 4)]);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binary.length, 8);
const chunkHeader = (size, type) => {
  const value = Buffer.alloc(8);
  value.writeUInt32LE(size);
  value.writeUInt32LE(type, 4);
  return value;
};
const glb = Buffer.concat([
  header,
  chunkHeader(jsonChunk.length, 0x4e4f534a), jsonChunk,
  chunkHeader(binary.length, 0x004e4942), binary,
]);
writeFileSync(output, glb);

const record = {
  asset: 'boii_carpentry_shed_project',
  source: 'src/render/workshop-repair.ts',
  source_sha256: createHash('sha256').update(readFileSync(new URL('../src/render/workshop-repair.ts', import.meta.url))).digest('hex'),
  source_rights: 'Existing original project procedural geometry; no third-party model imported',
  exporter: 'scripts/export-workshop-project.mjs',
  output: 'public/assets/buildings/boii_carpentry_shed_project.glb',
  sha256: createHash('sha256').update(glb).digest('hex'),
  bytes: glb.length,
  stats: workshopStats(geometry),
  material_groups: materials.map(entry => entry[0]),
  units: 'metres',
  up_axis: 'Y',
  pivot: 'source origin; runtime normalization/ground contact still requires QA if admitted',
  textures: textureRecords,
  uv_strategy: {
    repeat_metres: WORKSHOP_UV_REPEAT_METRES,
    timber_boxes: 'local physical face dimensions divided by repeat scale',
    timber_cylinders: 'circumference-scaled U, member-length V and duplicated seam vertices',
    thatch: `projected ridge/slope coordinates at ${WORKSHOP_UV_REPEAT_METRES} m repeat`,
    earth: 'physical box-face UVs retained for structural compatibility; solid factor at export',
    iron: 'physical box-face UVs retained for structural compatibility; solid metallic/roughness factors',
  },
  lod: 'none',
  status: 'Project-owned QA candidate only; not admitted to canonical runtime',
  validation: 'Must pass strict GLB structure check and separate browser/visual/historical QA before any runtime admission',
  limitations: [
    'Timber/thatch use base-color textures only; no normal or roughness maps',
    'Existing 512px runtime JPEG derivatives reused and embedded; no new third-party assets',
    'No LOD, rig or animation applies; this is a static structure',
  ],
};
writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify({ output: record.output, bytes: record.bytes, stats: record.stats, sha256: record.sha256 }));
