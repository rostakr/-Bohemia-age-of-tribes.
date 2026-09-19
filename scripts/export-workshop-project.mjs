// Offline project-owned workshop export for Phase 1 QA. Not a runtime dependency.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { calculateNormals } from 'playcanvas';
import { createWorkshopGeometry, workshopStats } from '../src/render/workshop.ts';

const output = new URL('../public/assets/buildings/boii_carpentry_shed_project.glb', import.meta.url);
const receipt = new URL('../assets/source/phase1/workshop-project-glb-receipt.json', import.meta.url);
const geometry = createWorkshopGeometry();
const UV_REPEAT_METRES = 0.65;
const materials = [
  ['timber', [0.32, 0.21, 0.12], 0.955, 0],
  ['thatch', [0.50, 0.38, 0.16], 0.985, 0],
  ['earth', [0.29, 0.22, 0.14], 0.99, 0],
  ['iron', [0.18, 0.19, 0.18], 0.84, 0.65],
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
  const imageIndex = gltf.images.push({ name: file, uri: `../materials/${file}` }) - 1;
  textureByMaterial.set(material, gltf.textures.push({ source: imageIndex, sampler: 0 }) - 1);
  textureRecords.push({
    name: `runtime/${file}`,
    public_path: `public/assets/materials/${file}`,
    uri: `../materials/${file}`,
    material,
    embedded: false,
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
    // V follows approximate slope distance from the ridge. This is a project UV pass,
    // not a claim of physically scanned material coordinates.
    const halfRun = 1.62;
    const slope = Math.hypot(halfRun, 3.48 - 2.30);
    uvs = [];
    for (let i = 0; i < mesh.positions.length; i += 3) {
      const x = mesh.positions[i];
      const z = mesh.positions[i + 2];
      uvs.push(x / UV_REPEAT_METRES, Math.abs(z) * slope / halfRun / UV_REPEAT_METRES);
    }
  }
  const material = gltf.materials.push({
    name,
    pbrMetallicRoughness: {
      baseColorFactor: texture !== undefined ? [1, 1, 1, 1] : [...color.map(linear), 1],
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

const textureBytes = textureRecords.reduce((sum, texture) => sum + texture.bytes, 0);
const record = {
  asset: 'boii_carpentry_shed_project',
  source: 'src/render/workshop.ts',
  source_sha256: createHash('sha256').update(readFileSync(new URL('../src/render/workshop.ts', import.meta.url))).digest('hex'),
  source_rights: 'Existing original project procedural geometry; no third-party model imported',
  exporter: 'scripts/export-workshop-project.mjs',
  output: 'public/assets/buildings/boii_carpentry_shed_project.glb',
  sha256: createHash('sha256').update(glb).digest('hex'),
  bytes: glb.length,
  total_runtime_transfer_bytes: glb.length + textureBytes,
  stats: workshopStats(geometry),
  material_groups: materials.map(entry => entry[0]),
  units: 'metres',
  up_axis: 'Y',
  pivot: 'source origin; runtime normalization/ground contact still requires QA if admitted',
  textures: textureRecords,
  texture_transfer_note: 'Original 1254px RGB PNGs remain unchanged. Runtime workshop base colors are documented 512px JPEG derivatives created with Pillow 12.3.0, LANCZOS resize, quality 90, 4:4:4, optimize+progressive. They are served as external public assets because PlayCanvas/Chrome 152 headless could not decode the same progressive JPEG bytes from embedded GLB image bufferViews.',
  uv_strategy: {
    timber: 'existing project geometry UVs; known stretching remains a visual QA item',
    thatch: `projected ridge/slope coordinates at ${UV_REPEAT_METRES} m repeat`,
    earth: 'solid factor; UV0 retained for structural compatibility',
    iron: 'solid metallic/roughness factors; UV0 retained for structural compatibility',
  },
  lod: 'none',
  status: 'Project-owned QA candidate only; not admitted to canonical runtime',
  validation: 'Must pass strict GLB structure check and separate browser/visual/historical QA before any runtime admission',
  limitations: [
    'Timber/thatch use lossy base-color runtime derivatives only; no normal or roughness maps',
    'Timber UVs still require a production unwrap/physical repeat pass',
    '512px base colors target current RTS-distance evaluation, not final close-up production art',
    'No LOD, rig or animation applies; this is a static structure',
  ],
};
writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify({ output: record.output, bytes: record.bytes, totalRuntimeTransferBytes: record.total_runtime_transfer_bytes, stats: record.stats, sha256: record.sha256 }));
