import test from 'node:test';
import assert from 'node:assert/strict';
import { createCentralEuropeanTreeLodGeometry, treeLodStats } from '../src/render/tree-lod.ts';

function validateMeshData(data, label) {
  assert.equal(data.positions.length % 3, 0, `${label}: positions must be xyz triplets`);
  assert.equal(data.indices.length % 3, 0, `${label}: indices must form triangles`);
  assert.equal(data.uvs.length, data.positions.length / 3 * 2, `${label}: UV count must match vertices`);
  assert.ok(data.positions.every(Number.isFinite), `${label}: positions must be finite`);
  assert.ok(data.uvs.every(Number.isFinite), `${label}: UVs must be finite`);
  if (data.colors) {
    assert.equal(data.colors.length, data.positions.length / 3 * 4, `${label}: color count must match vertices`);
    assert.ok(data.colors.every(Number.isFinite), `${label}: colors must be finite`);
  }
  const vertices = data.positions.length / 3;
  for (const index of data.indices) {
    assert.ok(Number.isInteger(index) && index >= 0 && index < vertices, `${label}: index outside vertex range`);
  }
}

function validateNonDegenerate(data, label) {
  for (let i = 0; i < data.indices.length; i += 3) {
    const ia = data.indices[i] * 3;
    const ib = data.indices[i + 1] * 3;
    const ic = data.indices[i + 2] * 3;
    const ax = data.positions[ia], ay = data.positions[ia + 1], az = data.positions[ia + 2];
    const bx = data.positions[ib], by = data.positions[ib + 1], bz = data.positions[ib + 2];
    const cx = data.positions[ic], cy = data.positions[ic + 1], cz = data.positions[ic + 2];
    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const acx = cx - ax, acy = cy - ay, acz = cz - az;
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    assert.ok(nx * nx + ny * ny + nz * nz > 1e-12, `${label}: degenerate triangle at ${i / 3}`);
  }
}

for (const level of [1, 2]) {
  test(`tree LOD${level} geometry is deterministic and structurally valid`, () => {
    const first = createCentralEuropeanTreeLodGeometry(level);
    const second = createCentralEuropeanTreeLodGeometry(level);
    assert.deepEqual(first, second, `LOD${level} must be deterministic`);
    for (const [label, data] of Object.entries(first)) {
      validateMeshData(data, `LOD${level}/${label}`);
      validateNonDegenerate(data, `LOD${level}/${label}`);
    }

    const stats = treeLodStats(first);
    console.log(`tree-lod${level}-stats`, JSON.stringify(stats));
    if (level === 1) {
      assert.equal(stats.triangles, 6084, 'LOD1 topology changed unexpectedly');
      assert.equal(stats.vertices, 3684, 'LOD1 vertex count changed unexpectedly');
      assert.ok(stats.triangles >= 6000 && stats.triangles <= 8000, 'LOD1 must stay inside 6k-8k target');
    } else {
      assert.equal(stats.triangles, 2120, 'LOD2 topology changed unexpectedly');
      assert.equal(stats.vertices, 1320, 'LOD2 vertex count changed unexpectedly');
      assert.ok(stats.triangles >= 1500 && stats.triangles <= 2500, 'LOD2 must stay inside 1.5k-2.5k target');
    }
    assert.ok(stats.height >= 10 && stats.height <= 15, `LOD${level}: height outside 10-15 m target`);
    assert.ok(stats.width >= 7 && stats.width <= 14, `LOD${level}: crown width outside expected mature-deciduous range`);
    assert.ok(stats.depth >= 7 && stats.depth <= 14, `LOD${level}: crown depth outside expected mature-deciduous range`);
    assert.ok(first.foliage.colors && first.foliage.colors.length > 0, `LOD${level}: foliage vertex colors required`);
  });
}
