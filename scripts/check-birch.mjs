import test from 'node:test';
import assert from 'node:assert/strict';
import { createYoungBirchGeometry, birchStats } from '../src/render/birch.ts';

function validateMeshData(data, label) {
  assert.equal(data.positions.length % 3, 0, label + ': position array must contain xyz triplets');
  assert.equal(data.indices.length % 3, 0, label + ': indices must form triangles');
  assert.equal(data.uvs.length, data.positions.length / 3 * 2, label + ': UV count must match vertices');
  assert.ok(data.positions.every(Number.isFinite), label + ': positions must be finite');
  assert.ok(data.uvs.every(Number.isFinite), label + ': UVs must be finite');
  const vertices = data.positions.length / 3;
  for (const index of data.indices) {
    assert.ok(Number.isInteger(index) && index >= 0 && index < vertices, label + ': index outside vertex range');
  }
}

test('young silver-birch candidate stays finite, indexed and within the Phase 1 LOD0 budget', () => {
  const geometry = createYoungBirchGeometry();
  for (const [label, data] of Object.entries(geometry)) validateMeshData(data, label);

  const stats = birchStats(geometry);
  console.log('birch-stats', JSON.stringify(stats));
  assert.ok(stats.triangles >= 15_000 && stats.triangles <= 40_000, 'birch LOD0 must stay inside 15k-40k target');
  assert.ok(stats.vertices > 0);
  assert.ok(stats.height >= 10 && stats.height <= 15, 'young birch height must stay inside the 10-15 m milestone target');
  assert.ok(stats.width >= 3.5 && stats.width <= 10, 'birch crown width outside expected range');
  assert.ok(stats.depth >= 3.5 && stats.depth <= 10, 'birch crown depth outside expected range');
});

test('young birch triangles are non-degenerate', () => {
  const geometry = createYoungBirchGeometry();
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
      assert.ok(nx * nx + ny * ny + nz * nz > 1e-12, label + ': degenerate triangle at index ' + i / 3);
    }
  }
});
