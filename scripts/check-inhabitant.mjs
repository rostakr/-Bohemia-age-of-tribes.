import test from 'node:test';
import assert from 'node:assert/strict';
import { createBoiiInhabitantGeometry, inhabitantStats } from '../src/render/inhabitant.ts';

test('procedural Boii inhabitant is finite, indexed and readable at RTS scale', () => {
  const data = createBoiiInhabitantGeometry();
  assert.ok(data.positions.length > 0, 'inhabitant needs vertices');
  assert.equal(data.positions.length % 3, 0, 'positions must be xyz triplets');
  assert.equal(data.indices.length % 3, 0, 'indices must form triangles');
  assert.equal(data.uvs.length, data.positions.length / 3 * 2, 'UV count must match vertices');
  assert.equal(data.colors?.length, data.positions.length / 3 * 4, 'RGBA count must match vertices');
  assert.ok(data.positions.every(Number.isFinite), 'positions must be finite');
  assert.ok(data.uvs.every(Number.isFinite), 'UVs must be finite');
  assert.ok(data.colors?.every(Number.isFinite), 'colors must be finite');
  const vertices = data.positions.length / 3;
  assert.ok(data.indices.every(index => Number.isInteger(index) && index >= 0 && index < vertices), 'indices must stay in range');

  const stats = inhabitantStats(data);
  console.log('inhabitant-stats', JSON.stringify(stats));
  assert.ok(stats.triangles >= 1_200 && stats.triangles <= 3_000, `unexpected inhabitant triangle count: ${stats.triangles}`);
  assert.ok(stats.height >= 1.65 && stats.height <= 1.80, `unexpected inhabitant height: ${stats.height}`);
  assert.ok(stats.width >= 0.55 && stats.width <= 0.85, `unexpected inhabitant width: ${stats.width}`);
  assert.ok(stats.depth >= 0.28 && stats.depth <= 0.45, `unexpected inhabitant depth: ${stats.depth}`);
});

test('procedural Boii inhabitant has no degenerate triangles', () => {
  const data = createBoiiInhabitantGeometry();
  for (let i = 0; i < data.indices.length; i += 3) {
    const ia = data.indices[i]! * 3;
    const ib = data.indices[i + 1]! * 3;
    const ic = data.indices[i + 2]! * 3;
    const ax = data.positions[ia]!, ay = data.positions[ia + 1]!, az = data.positions[ia + 2]!;
    const abx = data.positions[ib]! - ax, aby = data.positions[ib + 1]! - ay, abz = data.positions[ib + 2]! - az;
    const acx = data.positions[ic]! - ax, acy = data.positions[ic + 1]! - ay, acz = data.positions[ic + 2]! - az;
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    assert.ok(nx * nx + ny * ny + nz * nz > 1e-12, `degenerate triangle at ${i / 3}`);
  }
});
