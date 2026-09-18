import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const GLB_JSON = 0x4e4f534a;
const GLB_BIN = 0x004e4942;
const sourcePath = 'public/assets/buildings/boii_dwelling_rectangular.glb';
const lods = [
  {
    label: 'lod1',
    path: 'public/assets/buildings/boii_dwelling_rectangular_lod1.glb',
    vertices: 55089,
    triangles: 53538,
    bytes: 3153728,
    sha256: 'e0b247ef3fd8d3a943999053c5414734e4e940392650209471f4f0e970cdf006',
    min: [-0.4987548589706421, -0.28087466955184937, -0.33600741624832153],
    max: [0.49574288725852966, 0.2786356508731842, 0.338689923286438],
  },
  {
    label: 'lod2',
    path: 'public/assets/buildings/boii_dwelling_rectangular_lod2.glb',
    vertices: 34205,
    triangles: 31286,
    bytes: 2351928,
    sha256: 'ae8ea6e88fa3c2a9eb0b3d53cb01363b4bf61a41e8f553aeb2dcebe35bd311f7',
    min: [-0.49725550413131714, -0.28087466955184937, -0.3346681296825409],
    max: [0.4949585497379303, 0.2764490246772766, 0.33789387345314026],
  },
];

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function parseGlb(path) {
  const bytes = readFileSync(path);
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF', path + ': invalid magic');
  assert.equal(bytes.readUInt32LE(4), 2, path + ': GLB version');
  assert.equal(bytes.readUInt32LE(8), bytes.length, path + ': declared length');
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
  assert.ok(json, path + ': JSON chunk missing');
  assert.ok(bin, path + ': BIN chunk missing');
  return { bytes, json, bin };
}

function embeddedImage(doc, index) {
  const image = doc.json.images[index];
  assert.equal(image.mimeType, 'image/webp', 'embedded image must remain WebP');
  assert.equal(typeof image.bufferView, 'number', 'embedded image bufferView missing');
  const view = doc.json.bufferViews[image.bufferView];
  const start = view.byteOffset ?? 0;
  return doc.bin.subarray(start, start + view.byteLength);
}

function approxArray(actual, expected, epsilon = 1e-6) {
  assert.equal(actual.length, expected.length);
  for (let i = 0; i < actual.length; i++) {
    assert.ok(Math.abs(actual[i] - expected[i]) <= epsilon, `value ${i}: ${actual[i]} != ${expected[i]}`);
  }
}

test('dwelling LOD source remains the admitted TRELLIS candidate', () => {
  const bytes = readFileSync(sourcePath);
  assert.equal(
    sha256(bytes),
    'faa41587ee4631017dc0cf8abdaceb06a4b7ef93996c4914458b5ed80c9382aa',
    'source dwelling changed; re-review generator inputs before accepting new LOD output',
  );
});

test('generated dwelling LODs are deterministic, structurally bounded and preserve embedded PBR images', () => {
  const source = parseGlb(sourcePath);
  const sourceImages = [embeddedImage(source, 0), embeddedImage(source, 1)];

  for (const expected of lods) {
    const doc = parseGlb(expected.path);
    const primitive = doc.json.meshes?.[0]?.primitives?.[0];
    assert.ok(primitive, expected.label + ': primitive missing');
    assert.equal(primitive.mode, 4, expected.label + ': only TRIANGLES are accepted');
    assert.equal(doc.json.meshes.length, 1, expected.label + ': unexpected mesh count');
    assert.equal(doc.json.materials?.length, 1, expected.label + ': unexpected material count');
    assert.equal(doc.json.images?.length, 2, expected.label + ': expected two embedded PBR images');
    assert.ok(doc.json.extensionsUsed?.includes('EXT_texture_webp'), expected.label + ': EXT_texture_webp missing');

    const position = doc.json.accessors[primitive.attributes.POSITION];
    const indices = doc.json.accessors[primitive.indices];
    assert.equal(position.count, expected.vertices, expected.label + ': vertex count changed');
    assert.equal(indices.count / 3, expected.triangles, expected.label + ': triangle count changed');
    assert.equal(doc.bytes.length, expected.bytes, expected.label + ': byte size changed');
    assert.equal(sha256(doc.bytes), expected.sha256, expected.label + ': deterministic output hash changed');
    approxArray(position.min, expected.min);
    approxArray(position.max, expected.max);

    for (let image = 0; image < 2; image++) {
      assert.equal(
        sha256(embeddedImage(doc, image)),
        sha256(sourceImages[image]),
        expected.label + ': embedded source texture bytes changed',
      );
    }

    console.log(`dwelling-${expected.label}-checked ${JSON.stringify({
      vertices: position.count,
      triangles: indices.count / 3,
      bytes: doc.bytes.length,
      sha256: sha256(doc.bytes),
    })}`);
  }
});
