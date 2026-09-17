import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorehouseGeometry, storehouseStats } from '../src/render/storehouse.ts';

test('procedural Boii storehouse geometry stays finite, indexed and within the Phase 1 candidate budget', () => {
  const geometry = createStorehouseGeometry();
  for (const [name, data] of Object.entries(geometry)) {
    assert.ok(data.positions.length > 0, `${name}: missing vertices`);
    assert.equal(data.positions.length % 3, 0, `${name}: malformed positions`);
    assert.equal(data.uvs.length, data.positions.length / 3 * 2, `${name}: malformed UVs`);
    assert.equal(data.indices.length % 3, 0, `${name}: malformed triangles`);
    assert.ok(data.positions.every(Number.isFinite), `${name}: non-finite vertex`);
    assert.ok(data.uvs.every(Number.isFinite), `${name}: non-finite UV`);
    const vertexCount = data.positions.length / 3;
    assert.ok(data.indices.every(index => Number.isInteger(index) && index >= 0 && index < vertexCount), `${name}: invalid index`);
  }

  const stats = storehouseStats(geometry);
  console.log(`storehouse-stats ${JSON.stringify(stats)}`);
  assert.ok(stats.triangles >= 15_000 && stats.triangles <= 35_000, `triangle target missed: ${stats.triangles}`);
  assert.ok(stats.vertices >= 8_000 && stats.vertices <= 30_000, `unexpected vertex count: ${stats.vertices}`);
  assert.ok(stats.width >= 3.0 && stats.width <= 4.5, `unexpected width: ${stats.width}`);
  assert.ok(stats.depth >= 3.0 && stats.depth <= 4.5, `unexpected depth: ${stats.depth}`);
  assert.ok(stats.height >= 3.1 && stats.height <= 3.7, `unexpected height: ${stats.height}`);
});

test('procedural storehouse triangles are non-degenerate', () => {
  const geometry = createStorehouseGeometry();
  for (const [name, data] of Object.entries(geometry)) {
    for (let i = 0; i < data.indices.length; i += 3) {
      const ai = data.indices[i]! * 3;
      const bi = data.indices[i + 1]! * 3;
      const ci = data.indices[i + 2]! * 3;
      const ax = data.positions[ai]!, ay = data.positions[ai + 1]!, az = data.positions[ai + 2]!;
      const abx = data.positions[bi]! - ax, aby = data.positions[bi + 1]! - ay, abz = data.positions[bi + 2]! - az;
      const acx = data.positions[ci]! - ax, acy = data.positions[ci + 1]! - ay, acz = data.positions[ci + 2]! - az;
      const cx = aby * acz - abz * acy;
      const cy = abz * acx - abx * acz;
      const cz = abx * acy - aby * acx;
      const area2 = Math.hypot(cx, cy, cz);
      assert.ok(area2 > 1e-10, `${name}: degenerate triangle ${i / 3}`);
    }
  }
});
