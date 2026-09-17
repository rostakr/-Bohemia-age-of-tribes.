import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCentralEuropeanTreeStudy } from '../src/render/trees.ts';

function assertMesh(name, data) {
  assert.ok(data.positions.length > 0, `${name}: needs vertices`);
  assert.equal(data.positions.length % 3, 0, `${name}: xyz packing`);
  assert.equal(data.uvs.length, data.positions.length / 3 * 2, `${name}: uv0 count`);
  assert.equal(data.colors?.length, data.positions.length / 3 * 4, `${name}: rgba count`);
  assert.ok(data.positions.every(Number.isFinite), `${name}: finite positions`);
  assert.ok(data.uvs.every(Number.isFinite), `${name}: finite UVs`);
  assert.ok(data.colors?.every(Number.isFinite), `${name}: finite colors`);
  assert.equal(data.indices.length % 3, 0, `${name}: triangle indices`);
  const vertices = data.positions.length / 3;
  assert.ok(data.indices.every(index => Number.isInteger(index) && index >= 0 && index < vertices), `${name}: valid indices`);
}

test('Central-European tree study is deterministic, mixed-species and bounded', () => {
  const first = buildCentralEuropeanTreeStudy(271828, 36);
  const second = buildCentralEuropeanTreeStudy(271828, 36);

  assert.equal(first.trees, 36);
  assert.equal(first.oaks + first.birches, first.trees);
  assert.ok(first.oaks >= 20, `expected oak-dominant edge, got ${first.oaks}`);
  assert.ok(first.birches >= 4, `expected visible birch minority, got ${first.birches}`);
  assert.ok(first.triangles >= 10000 && first.triangles <= 24000, `unexpected tree triangle budget: ${first.triangles}`);

  assertMesh('bark', first.bark);
  assertMesh('foliage', first.foliage);

  assert.equal(first.triangles, second.triangles);
  assert.deepEqual(first.bark.positions.slice(0, 90), second.bark.positions.slice(0, 90));
  assert.deepEqual(first.foliage.positions.slice(0, 90), second.foliage.positions.slice(0, 90));

  const all = first.bark.positions.concat(first.foliage.positions);
  for (let i = 0; i < all.length; i += 3) {
    const x = all[i], y = all[i + 1], z = all[i + 2];
    assert.ok(x >= -115 && x <= 115, `tree x outside benchmark: ${x}`);
    assert.ok(z >= -115 && z <= 115, `tree z outside benchmark: ${z}`);
    assert.ok(y > -5 && y < 30, `tree y outside plausible range: ${y}`);
  }
});
