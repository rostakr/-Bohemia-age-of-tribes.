import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function pad4(buffer, fill = 0) {
  const padding = (4 - buffer.length % 4) % 4;
  return padding ? Buffer.concat([buffer, Buffer.alloc(padding, fill)]) : buffer;
}

function createTriangleGlbWithoutNormals() {
  const positions = Buffer.alloc(3 * 3 * 4);
  [[0,0,0],[1,0,0],[0,1,0]].forEach((value, index) => value.forEach((component, axis) => positions.writeFloatLE(component, (index * 3 + axis) * 4)));
  const uvs = Buffer.alloc(3 * 2 * 4);
  [[0,0],[1,0],[0,1]].forEach((value, index) => value.forEach((component, axis) => uvs.writeFloatLE(component, (index * 2 + axis) * 4)));
  const indices = Buffer.alloc(6);
  [0,1,2].forEach((value, index) => indices.writeUInt16LE(value, index * 2));
  const bin = pad4(Buffer.concat([positions, uvs, indices]), 0);
  const gltf = {
    asset: { version: '2.0', generator: 'Phase 1 GLB tool self-test' },
    buffers: [{ byteLength: bin.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.length, target: 34962 },
      { buffer: 0, byteOffset: positions.length, byteLength: uvs.length, target: 34962 },
      { buffer: 0, byteOffset: positions.length + uvs.length, byteLength: indices.length, target: 34963 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' },
      { bufferView: 1, componentType: 5126, count: 3, type: 'VEC2' },
      { bufferView: 2, componentType: 5123, count: 3, type: 'SCALAR' },
    ],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, indices: 2, mode: 4 }] }],
    nodes: [{ mesh: 0 }],
    scenes: [{ nodes: [0] }],
    scene: 0,
  };
  const json = pad4(Buffer.from(JSON.stringify(gltf), 'utf8'), 0x20);
  const total = 12 + 8 + json.length + 8 + bin.length;
  const output = Buffer.alloc(total);
  output.write('glTF', 0, 'ascii');
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(total, 8);
  let offset = 12;
  output.writeUInt32LE(json.length, offset);
  output.writeUInt32LE(0x4E4F534A, offset + 4);
  json.copy(output, offset + 8);
  offset += 8 + json.length;
  output.writeUInt32LE(bin.length, offset);
  output.writeUInt32LE(0x004E4942, offset + 4);
  bin.copy(output, offset + 8);
  return output;
}

function run(args) {
  return spawnSync(process.execPath, args, { encoding: 'utf8' });
}

test('GLB normal preparation turns a UV-mapped triangle into a strict admission candidate', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bohemia-glb-tools-'));
  try {
    const input = join(directory, 'input.glb');
    const output = join(directory, 'output.glb');
    await writeFile(input, createTriangleGlbWithoutNormals());

    const rejected = run(['scripts/check-glb.mjs', input, '--min-tris', '1', '--max-tris', '1', '--require-normals', '--require-uv0']);
    assert.equal(rejected.status, 1, `raw fixture should fail strict admission:\n${rejected.stdout}\n${rejected.stderr}`);
    assert.match(rejected.stderr, /missing required NORMAL accessor/);

    const prepared = run(['scripts/add-glb-normals.mjs', input, output]);
    assert.equal(prepared.status, 0, `normal preparation failed:\n${prepared.stdout}\n${prepared.stderr}`);
    assert.match(prepared.stdout, /"addedPrimitives": 1/);

    const admitted = run(['scripts/check-glb.mjs', output, '--min-tris', '1', '--max-tris', '1', '--require-normals', '--require-uv0']);
    assert.equal(admitted.status, 0, `prepared fixture should pass strict admission:\n${admitted.stdout}\n${admitted.stderr}`);
    const report = JSON.parse(admitted.stdout);
    assert.equal(report.triangles, 1);
    assert.equal(report.vertices, 3);
    assert.equal(report.normalPrimitives, 1);
    assert.equal(report.uv0Primitives, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
