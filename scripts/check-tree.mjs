import test from 'node:test';
import assert from 'node:assert/strict';
import { createCentralEuropeanTreeGeometry, treeStats } from '../src/render/tree.ts';

function validateMeshData(data, label) {
  assert.equal(data.positions.length % 3, 0, label + ': positions must be xyz triplets');
  assert.equal(data.indices.length % 3, 0, label + ': indices must form triangles');
  assert.equal(data.uvs.length, data.positions.length / 3 * 2, label + ': UV count must match vertices');
  assert.ok(data.positions.every(Number.isFinite), label + ': positions must be finite');
  assert.ok(data.uvs.every(Number.isFinite), label + ': UVs must be finite');
  if (data.colors) {
    assert.equal(data.colors.length, data.positions.length / 3 * 4, label + ': color count must match vertices');
    assert.ok(data.colors.every(Number.isFinite), label + ': colors must be finite');
  }
  const vertices = data.positions.length / 3;
  for (const index of data.indices) {
    assert.ok(Number.isInteger(index) && index >= 0 && index < vertices, label + ': index outside vertex range');
  }
}

test('procedural central-European tree candidate stays finite and inside the Phase 1 LOD0 budget', () => {
  const geometry = createCentralEuropeanTreeGeometry();
  for (const [label, data] of Object.entries(geometry)) validateMeshData(data, label);

  const stats = treeStats(geometry);
  console.log('tree-stats', JSON.stringify(stats));
  assert.ok(stats.triangles >= 15_000 && stats.triangles <= 40_000, 'tree must stay inside 15k-40k LOD0 target');
  assert.ok(stats.height >= 10 && stats.height <= 15, 'tree height must stay inside 10-15 m target');
  assert.ok(stats.width >= 7 && stats.width <= 13, 'tree crown width outside expected mature-deciduous range');
  assert.ok(stats.depth >= 7 && stats.depth <= 13, 'tree crown depth outside expected mature-deciduous range');
  assert.ok(geometry.foliage.colors && geometry.foliage.colors.length > 0, 'foliage needs vertex-color variation');
});

test('procedural tree triangles are non-degenerate', () => {
  const geometry = createCentralEuropeanTreeGeometry();
  for (const [label, data] of Object.entries(geometry)) {
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
      assert.ok(nx * nx + ny * ny + nz * nz > 1e-12, label + ': degenerate triangle at ' + i / 3);
    }
  }
});
