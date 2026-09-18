import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const GLB_JSON = 0x4e4f534a;
const GLB_BIN = 0x004e4942;
const COMPONENTS = new Map([['SCALAR', 1], ['VEC2', 2], ['VEC3', 3], ['VEC4', 4]]);
const BYTES = new Map([[5123, 2], [5125, 4], [5126, 4]]);

function parseGlb(path) {
  const bytes = readFileSync(path);
  if (bytes.toString('ascii', 0, 4) !== 'glTF') throw new Error('Not a GLB file');
  if (bytes.readUInt32LE(4) !== 2) throw new Error('Only GLB 2.0 is supported');
  if (bytes.readUInt32LE(8) !== bytes.length) throw new Error('GLB length mismatch');
  let offset = 12, json, bin;
  while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    offset += 8;
    const chunk = bytes.subarray(offset, offset + length);
    offset += length;
    if (type === GLB_JSON) json = JSON.parse(chunk.toString('utf8').replace(/[\u0000 ]+$/g, ''));
    if (type === GLB_BIN) bin = Buffer.from(chunk);
  }
  if (!json || !bin) throw new Error('GLB is missing JSON or BIN');
  return { json, bin };
}

function accessorArray(doc, index) {
  const accessor = doc.json.accessors[index];
  const view = doc.json.bufferViews[accessor.bufferView];
  if (view.byteStride) throw new Error('Interleaved accessors are not supported');
  const components = COMPONENTS.get(accessor.type);
  const bytesPer = BYTES.get(accessor.componentType);
  if (!components || !bytesPer) throw new Error(`Unsupported accessor ${index}`);
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const count = accessor.count * components;
  const raw = doc.bin.subarray(start, start + count * bytesPer);
  if (accessor.componentType === 5126) return new Float32Array(raw.buffer, raw.byteOffset, count).slice();
  if (accessor.componentType === 5125) return new Uint32Array(raw.buffer, raw.byteOffset, count).slice();
  if (accessor.componentType === 5123) return new Uint16Array(raw.buffer, raw.byteOffset, count).slice();
  throw new Error(`Unsupported component type ${accessor.componentType}`);
}

function embeddedImage(doc, image) {
  if (image.bufferView === undefined || !image.mimeType) throw new Error('Workshop LOD requires embedded source images');
  const view = doc.json.bufferViews[image.bufferView];
  const start = view.byteOffset ?? 0;
  return {
    bytes: Buffer.from(doc.bin.subarray(start, start + view.byteLength)),
    mimeType: image.mimeType,
    name: image.name,
  };
}

function clusterGeometry(positions, uvs, indices, voxel, uvStep) {
  const vertexCount = positions.length / 3;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  for (let i = 0; i < vertexCount; i++) {
    minX = Math.min(minX, positions[i * 3]);
    minY = Math.min(minY, positions[i * 3 + 1]);
    minZ = Math.min(minZ, positions[i * 3 + 2]);
  }

  const clusterByKey = new Map();
  const sourceToCluster = new Uint32Array(vertexCount);
  const sumX = [], sumY = [], sumZ = [], sumU = [], sumV = [], counts = [];

  for (let i = 0; i < vertexCount; i++) {
    const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
    const u = uvs[i * 2], v = uvs[i * 2 + 1];
    const key = [
      Math.floor((x - minX) / voxel + 1e-9),
      Math.floor((y - minY) / voxel + 1e-9),
      Math.floor((z - minZ) / voxel + 1e-9),
      Math.floor(u / uvStep + 1e-9),
      Math.floor(v / uvStep + 1e-9),
    ].join(',');
    let cluster = clusterByKey.get(key);
    if (cluster === undefined) {
      cluster = counts.length;
      clusterByKey.set(key, cluster);
      sumX.push(0); sumY.push(0); sumZ.push(0); sumU.push(0); sumV.push(0); counts.push(0);
    }
    sourceToCluster[i] = cluster;
    sumX[cluster] += x; sumY[cluster] += y; sumZ[cluster] += z;
    sumU[cluster] += u; sumV[cluster] += v; counts[cluster]++;
  }

  const clusteredPositions = new Array(counts.length * 3);
  const clusteredUvs = new Array(counts.length * 2);
  for (let i = 0; i < counts.length; i++) {
    clusteredPositions[i * 3] = sumX[i] / counts[i];
    clusteredPositions[i * 3 + 1] = sumY[i] / counts[i];
    clusteredPositions[i * 3 + 2] = sumZ[i] / counts[i];
    clusteredUvs[i * 2] = sumU[i] / counts[i];
    clusteredUvs[i * 2 + 1] = sumV[i] / counts[i];
  }

  const faces = [];
  const seen = new Set();
  for (let i = 0; i < indices.length; i += 3) {
    const a = sourceToCluster[indices[i]], b = sourceToCluster[indices[i + 1]], c = sourceToCluster[indices[i + 2]];
    if (a === b || b === c || c === a) continue;
    const key = [a, b, c].sort((left, right) => left - right).join(',');
    if (seen.has(key)) continue;
    const ax = clusteredPositions[a * 3], ay = clusteredPositions[a * 3 + 1], az = clusteredPositions[a * 3 + 2];
    const abx = clusteredPositions[b * 3] - ax, aby = clusteredPositions[b * 3 + 1] - ay, abz = clusteredPositions[b * 3 + 2] - az;
    const acx = clusteredPositions[c * 3] - ax, acy = clusteredPositions[c * 3 + 1] - ay, acz = clusteredPositions[c * 3 + 2] - az;
    const nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
    if (nx * nx + ny * ny + nz * nz <= 1e-20) continue;
    seen.add(key);
    faces.push(a, b, c);
  }

  const used = [...new Set(faces)].sort((a, b) => a - b);
  const compact = new Int32Array(counts.length);
  compact.fill(-1);
  const outPositions = new Float32Array(used.length * 3);
  const outUvs = new Float32Array(used.length * 2);
  for (let i = 0; i < used.length; i++) {
    const cluster = used[i];
    compact[cluster] = i;
    outPositions[i * 3] = clusteredPositions[cluster * 3];
    outPositions[i * 3 + 1] = clusteredPositions[cluster * 3 + 1];
    outPositions[i * 3 + 2] = clusteredPositions[cluster * 3 + 2];
    outUvs[i * 2] = clusteredUvs[cluster * 2];
    outUvs[i * 2 + 1] = clusteredUvs[cluster * 2 + 1];
  }

  const outIndices = used.length < 65536 ? new Uint16Array(faces.length) : new Uint32Array(faces.length);
  for (let i = 0; i < faces.length; i++) outIndices[i] = compact[faces[i]];

  const outNormals = new Float32Array(outPositions.length);
  for (let i = 0; i < outIndices.length; i += 3) {
    const a = outIndices[i], b = outIndices[i + 1], c = outIndices[i + 2];
    const ax = outPositions[a * 3], ay = outPositions[a * 3 + 1], az = outPositions[a * 3 + 2];
    const abx = outPositions[b * 3] - ax, aby = outPositions[b * 3 + 1] - ay, abz = outPositions[b * 3 + 2] - az;
    const acx = outPositions[c * 3] - ax, acy = outPositions[c * 3 + 1] - ay, acz = outPositions[c * 3 + 2] - az;
    const nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
    for (const vertex of [a, b, c]) {
      outNormals[vertex * 3] += nx;
      outNormals[vertex * 3 + 1] += ny;
      outNormals[vertex * 3 + 2] += nz;
    }
  }
  for (let i = 0; i < used.length; i++) {
    const x = outNormals[i * 3], y = outNormals[i * 3 + 1], z = outNormals[i * 3 + 2];
    const length = Math.hypot(x, y, z) || 1;
    outNormals[i * 3] = x / length;
    outNormals[i * 3 + 1] = y / length;
    outNormals[i * 3 + 2] = z / length;
  }

  return { positions: outPositions, uvs: outUvs, normals: outNormals, indices: outIndices };
}

function pad4(buffer, fill = 0) {
  const padding = (4 - buffer.length % 4) % 4;
  return padding ? Buffer.concat([buffer, Buffer.alloc(padding, fill)]) : buffer;
}

function typedBuffer(array) {
  return Buffer.from(array.buffer, array.byteOffset, array.byteLength);
}

function minMax(array, stride) {
  const min = Array(stride).fill(Infinity);
  const max = Array(stride).fill(-Infinity);
  for (let i = 0; i < array.length; i += stride) {
    for (let d = 0; d < stride; d++) {
      min[d] = Math.min(min[d], array[i + d]);
      max[d] = Math.max(max[d], array[i + d]);
    }
  }
  return { min, max };
}

function buildWorkshopGlb(source, geometries, label) {
  const chunks = [], bufferViews = [], accessors = [];
  let byteOffset = 0;
  const addChunk = (buffer, target) => {
    const padded = pad4(buffer);
    const index = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset, byteLength: buffer.length, ...(target ? { target } : {}) });
    chunks.push(padded);
    byteOffset += padded.length;
    return index;
  };
  const addAccessor = (array, width, type, componentType, target, bounds = false) => {
    const view = addChunk(typedBuffer(array), target);
    const entry = { bufferView: view, componentType, count: array.length / width, type };
    if (bounds) Object.assign(entry, minMax(array, width));
    if (type === 'SCALAR') {
      let max = 0;
      for (const value of array) max = Math.max(max, value);
      entry.min = [0];
      entry.max = [max];
    }
    accessors.push(entry);
    return accessors.length - 1;
  };

  const primitives = geometries.map((geometry, index) => ({
    mode: 4,
    material: source.json.meshes[0].primitives[index].material,
    attributes: {
      POSITION: addAccessor(geometry.positions, 3, 'VEC3', 5126, 34962, true),
      NORMAL: addAccessor(geometry.normals, 3, 'VEC3', 5126, 34962),
      TEXCOORD_0: addAccessor(geometry.uvs, 2, 'VEC2', 5126, 34962, true),
    },
    indices: addAccessor(geometry.indices, 1, 'SCALAR', geometry.indices.BYTES_PER_ELEMENT === 2 ? 5123 : 5125, 34963),
  }));

  const images = source.json.images.map(image => {
    const embedded = embeddedImage(source, image);
    return { name: embedded.name, mimeType: embedded.mimeType, bufferView: addChunk(embedded.bytes) };
  });

  const json = {
    asset: { version: '2.0', generator: `BOHEMIA deterministic workshop ${label} vertex-cluster LOD generator` },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: `Boii carpentry shelter — ${label}`, mesh: 0 }],
    meshes: [{ primitives }],
    materials: structuredClone(source.json.materials),
    images,
    textures: structuredClone(source.json.textures ?? []),
    samplers: structuredClone(source.json.samplers ?? []),
    buffers: [{ byteLength: byteOffset }],
    bufferViews,
    accessors,
  };

  const jsonBytes = pad4(Buffer.from(JSON.stringify(json), 'utf8'), 0x20);
  const bin = Buffer.concat(chunks);
  const totalLength = 12 + 8 + jsonBytes.length + 8 + bin.length;
  const header = Buffer.alloc(12);
  header.write('glTF', 0, 'ascii');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBytes.length, 0);
  jsonHeader.writeUInt32LE(GLB_JSON, 4);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(bin.length, 0);
  binHeader.writeUInt32LE(GLB_BIN, 4);
  return Buffer.concat([header, jsonHeader, jsonBytes, binHeader, bin]);
}

export function generateWorkshopLod(inputPath, outputDir, voxel = 0.03, uvStep = 0.10) {
  const source = parseGlb(inputPath);
  const sourcePrimitives = source.json.meshes?.[0]?.primitives;
  if (source.json.meshes?.length !== 1 || !sourcePrimitives || sourcePrimitives.length !== 4 || source.json.materials?.length !== 4 || source.json.images?.length !== 2) {
    throw new Error('Workshop source structure changed; review the LOD generator before proceeding');
  }

  const geometries = sourcePrimitives.map((primitive, index) => {
    if (primitive.mode !== 4 || primitive.attributes?.POSITION === undefined || primitive.attributes?.TEXCOORD_0 === undefined || primitive.indices === undefined) {
      throw new Error(`Workshop primitive ${index} is not an indexed UV-mapped TRIANGLES primitive`);
    }
    return clusterGeometry(
      accessorArray(source, primitive.attributes.POSITION),
      accessorArray(source, primitive.attributes.TEXCOORD_0),
      accessorArray(source, primitive.indices),
      voxel,
      uvStep,
    );
  });

  const bytes = buildWorkshopGlb(source, geometries, 'lod1');
  mkdirSync(outputDir, { recursive: true });
  const outputPath = `${outputDir}/boii_carpentry_shed_project_lod1.glb`;
  writeFileSync(outputPath, bytes);
  const stats = {
    label: 'lod1', voxel, uvStep,
    vertices: geometries.reduce((sum, geometry) => sum + geometry.positions.length / 3, 0),
    triangles: geometries.reduce((sum, geometry) => sum + geometry.indices.length / 3, 0),
    bytes: bytes.length,
    primitives: geometries.length,
  };
  console.log(`workshop-lod1-stats ${JSON.stringify(stats)}`);
  return stats;
}

const [, , inputPath, outputDir] = process.argv;
if (inputPath) generateWorkshopLod(inputPath, outputDir ?? 'public/assets/buildings');
