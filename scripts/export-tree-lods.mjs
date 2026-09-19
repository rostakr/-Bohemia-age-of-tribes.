import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { calculateNormals } from 'playcanvas';
import { createCentralEuropeanTreeLodGeometry, treeLodStats } from '../src/render/tree-lod.ts';

const OUTPUT_DIR = new URL('../public/assets/environment/', import.meta.url);
mkdirSync(OUTPUT_DIR, { recursive: true });

function align4(value) {
  return (value + 3) & ~3;
}

function exportLevel(level) {
  const geometry = createCentralEuropeanTreeLodGeometry(level);
  const stats = treeLodStats(geometry);
  const gltf = {
    asset: { version: '2.0', generator: 'BOHEMIA deterministic procedural tree LOD exporter' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: `Central European mature deciduous tree LOD${level}`, mesh: 0 }],
    meshes: [{ primitives: [] }],
    materials: [
      { name: 'Tree bark', pbrMetallicRoughness: { baseColorFactor: [0.033, 0.017, 0.007, 1], metallicFactor: 0, roughnessFactor: 0.965 } },
      { name: 'Summer foliage', pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.982 } },
    ],
    buffers: [],
    bufferViews: [],
    accessors: [],
  };

  const chunks = [];
  let byteLength = 0;

  function accessor(values, width, type, componentType, target, bounds = false) {
    const paddedOffset = align4(byteLength);
    if (paddedOffset !== byteLength) chunks.push(Buffer.alloc(paddedOffset - byteLength));
    byteLength = paddedOffset;
    const bytes = Buffer.from(values.buffer, values.byteOffset, values.byteLength);
    const view = gltf.bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: bytes.length, target }) - 1;
    chunks.push(bytes);
    byteLength += bytes.length;
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

  for (const [materialIndex, data] of [geometry.wood, geometry.foliage].entries()) {
    const attributes = {
      POSITION: accessor(new Float32Array(data.positions), 3, 'VEC3', 5126, 34962, true),
      NORMAL: accessor(new Float32Array(calculateNormals(data.positions, data.indices)), 3, 'VEC3', 5126, 34962),
      TEXCOORD_0: accessor(new Float32Array(data.uvs), 2, 'VEC2', 5126, 34962),
    };
    if (data.colors) {
      attributes.COLOR_0 = accessor(new Float32Array(data.colors), 4, 'VEC4', 5126, 34962);
    }
    gltf.meshes[0].primitives.push({
      mode: 4,
      material: materialIndex,
      attributes,
      indices: accessor(new Uint32Array(data.indices), 1, 'SCALAR', 5125, 34963),
    });
  }

  gltf.buffers.push({ byteLength });
  const json = Buffer.from(JSON.stringify(gltf));
  const jsonChunk = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
  const bin = Buffer.concat([...chunks, Buffer.alloc((4 - byteLength % 4) % 4)]);
  const totalLength = 12 + 8 + jsonChunk.length + 8 + bin.length;
  const header = Buffer.alloc(12);
  header.write('glTF', 0, 'ascii');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(bin.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  const glb = Buffer.concat([header, jsonHeader, jsonChunk, binHeader, bin]);

  const fileName = `tree_central_europe_lod${level}.glb`;
  const output = new URL(fileName, OUTPUT_DIR);
  writeFileSync(output, glb);
  return {
    level,
    output: `public/assets/environment/${fileName}`,
    bytes: glb.length,
    sha256: createHash('sha256').update(glb).digest('hex'),
    stats,
    primitives: 2,
    materials: 2,
    foliage_vertex_colors: true,
    textures: 0,
  };
}

const results = [exportLevel(1), exportLevel(2)];
console.log(JSON.stringify(results, null, 2));
