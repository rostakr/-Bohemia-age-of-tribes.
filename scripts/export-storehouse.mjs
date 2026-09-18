// Offline content export, not a test or runtime dependency.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { calculateNormals } from 'playcanvas';

const source = new URL('../src/render/storehouse.ts', import.meta.url);
const temporary = new URL('../src/render/storehouse.node-export.ts', import.meta.url);
const output = new URL('../public/assets/buildings/boii_storehouse_small.glb', import.meta.url);
const receipt = new URL('../assets/source/phase1/storehouse-glb-receipt.json', import.meta.url);
// Node strip-types requires an explicit extension for this bundler-style import.
writeFileSync(temporary, readFileSync(source, 'utf8').replace("from './landscape';", "from './landscape.ts';"), { flag: 'wx' });
try {
  const { createStorehouseGeometry, storehouseStats, STOREHOUSE_UV_REPEAT_METRES } = await import(temporary.href);
  const geometry = createStorehouseGeometry();
  const materials = [
    ['timber', [0.34, 0.23, 0.13], 0.95],
    ['wattle', [0.43, 0.30, 0.14], 0.97],
    ['daub', [0.62, 0.53, 0.38], 0.98],
    ['thatch', [0.49, 0.37, 0.15], 0.985],
    ['earth', [0.28, 0.20, 0.12], 0.99],
  ];
  const gltf = { asset: { version: '2.0', generator: 'BOHEMIA offline storehouse export' },
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: 'Boii small storehouse — WIP', mesh: 0 }],
    meshes: [{ primitives: [] }], materials: [], buffers: [], bufferViews: [], accessors: [] };
  const chunks = [];
  let byteLength = 0;
  const textureRecords = [];
  const textureByMaterial = new Map();
  gltf.images = [];
  gltf.textures = [];
  gltf.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }];
  const textureSpecs = [
    { material: 'timber', file: 'runtime/weathered-oak-basecolor-runtime-512.jpg', mimeType: 'image/jpeg', width: 512, height: 512,
      derivative: 'Pillow 12.3.0; LANCZOS resize; JPEG quality 90; 4:4:4; optimize+progressive' },
    { material: 'thatch', file: 'runtime/straw-thatch-basecolor-runtime-512.jpg', mimeType: 'image/jpeg', width: 512, height: 512,
      derivative: 'Pillow 12.3.0; LANCZOS resize; JPEG quality 90; 4:4:4; optimize+progressive' },
    { material: 'daub', file: 'clay-daub-basecolor.png', mimeType: 'image/png' },
  ];
  for (const spec of textureSpecs) {
    const bytes = readFileSync(new URL(`../assets/source/phase1/materials/${spec.file}`, import.meta.url));
    const padding = (4 - byteLength % 4) % 4;
    if (padding) { chunks.push(Buffer.alloc(padding)); byteLength += padding; }
    const bufferView = gltf.bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: bytes.length }) - 1;
    chunks.push(bytes); byteLength += bytes.length;
    const imageIndex = gltf.images.push({ name: spec.file.split('/').at(-1), bufferView, mimeType: spec.mimeType }) - 1;
    textureByMaterial.set(spec.material, gltf.textures.push({ source: imageIndex, sampler: 0 }) - 1);
    const width = spec.width ?? bytes.readUInt32BE(16);
    const height = spec.height ?? bytes.readUInt32BE(20);
    textureRecords.push({ name: spec.file, material: spec.material, embedded: true,
      mime: spec.mimeType, width, height, bytes: bytes.length,
      ...(spec.derivative ? { derivative: spec.derivative } : { derivative: 'source image embedded unchanged' }),
      sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  function accessor(values, width, type, componentType, target, bounds = false) {
    const padding = (4 - byteLength % 4) % 4;
    if (padding) { chunks.push(Buffer.alloc(padding)); byteLength += padding; }
    const bytes = Buffer.from(values.buffer, values.byteOffset, values.byteLength);
    const view = gltf.bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: bytes.length, target }) - 1;
    chunks.push(bytes); byteLength += bytes.length;
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
  // PlayCanvas diffuse colors are sRGB; glTF baseColorFactor is linear.
  const linear = value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  for (const [name, color, roughness] of materials) {
    const mesh = geometry[name];
    const texture = textureByMaterial.get(name);
    const material = gltf.materials.push({ name, pbrMetallicRoughness: {
      baseColorFactor: texture !== undefined ? [1, 1, 1, 1] : [...color.map(linear), 1],
      ...(texture !== undefined ? { baseColorTexture: { index: texture, texCoord: 0 } } : {}),
      metallicFactor: 0, roughnessFactor: roughness,
    } }) - 1;
    gltf.meshes[0].primitives.push({ mode: 4, material, attributes: {
      POSITION: accessor(new Float32Array(mesh.positions), 3, 'VEC3', 5126, 34962, true),
      NORMAL: accessor(new Float32Array(calculateNormals(mesh.positions, mesh.indices)), 3, 'VEC3', 5126, 34962),
      TEXCOORD_0: accessor(new Float32Array(mesh.uvs), 2, 'VEC2', 5126, 34962),
    }, indices: accessor(new Uint32Array(mesh.indices), 1, 'SCALAR', 5125, 34963) });
  }
  gltf.buffers.push({ byteLength });
  const json = Buffer.from(JSON.stringify(gltf));
  const jsonChunk = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
  const binary = Buffer.concat([...chunks, Buffer.alloc((4 - byteLength % 4) % 4)]);
  const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binary.length, 8);
  function chunkHeader(size, type) { const b = Buffer.alloc(8); b.writeUInt32LE(size); b.writeUInt32LE(type, 4); return b; }
  const glb = Buffer.concat([header, chunkHeader(jsonChunk.length, 0x4e4f534a), jsonChunk,
    chunkHeader(binary.length, 0x004e4942), binary]);
  writeFileSync(output, glb);
  const record = { asset: 'boii_storehouse_small', source: 'src/render/storehouse.ts',
    source_sha256: createHash('sha256').update(readFileSync(source)).digest('hex'),
    source_rights: 'Existing original project geometry; no third-party model imported',
    exporter: 'scripts/export-storehouse.mjs', output: 'public/assets/buildings/boii_storehouse_small.glb',
    sha256: createHash('sha256').update(glb).digest('hex'), bytes: glb.length,
    stats: storehouseStats(geometry), material_groups: materials.map(x => x[0]),
    units: 'metres', up_axis: 'Y', pivot: 'ground-centred source origin',
    uv_strategy: {
      repeat_metres: STOREHOUSE_UV_REPEAT_METRES,
      boxes: 'physical-size UVs per face; repeat sampler preserves approximately constant texel density',
      cylinders: 'duplicated U=0/U=1 seam vertices; V follows member length',
      roof: 'local Z/ridge versus local X/slope UV orientation from source geometry',
    },
    textures: textureRecords,
    texture_transfer_note: 'Original source PNGs remain unchanged. Timber and thatch reuse the established project 512px JPEG runtime derivatives produced with Pillow 12.3.0 (LANCZOS, quality 90, 4:4:4, optimize+progressive). Daub remains its original PNG in this pass.',
    lod: 'none', status: 'Exported WIP candidate; QA-only supplied-storehouse preview route',
    validation: 'Exporter output requires strict GLB check plus browser/visual QA after regeneration',
    limitations: ['Timber/thatch use lossy 512px base-color runtime derivatives; daub uses its source base-color PNG; wattle and earth use solid factors',
      'No normal or roughness maps are inferred from base color',
      'Daub remains the largest unoptimized source texture in this pass',
      '512px JPEG visual parity and generated albedo tileability require QA at intended RTS distance',
      'Roughness uses scalar factors only; visual parity requires external review'] };
  writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n');
  console.log(JSON.stringify({ output: record.output, bytes: record.bytes, stats: record.stats, textures: record.textures, uv: record.uv_strategy }));
} finally { rmSync(temporary, { force: true }); }
