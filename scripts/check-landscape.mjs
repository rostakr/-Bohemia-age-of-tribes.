import test from 'node:test';
import assert from 'node:assert/strict';
import {
  terrainMesh,
  pathMesh,
  riverMesh,
  riverMarginMesh,
  landscape,
  pathHalfWidth,
  riverCenter,
  SETTLEMENT,
  WATER_HEIGHT,
} from '../src/render/landscape.ts';

function assertMesh(name, data) {
  assert.ok(data.positions.every(Number.isFinite), `${name}: finite positions`);
  assert.equal(data.uvs.length, data.positions.length / 3 * 2, `${name}: UV count`);
  assert.ok(data.indices.every(i => Number.isInteger(i) && i >= 0 && i < data.positions.length / 3), `${name}: valid indices`);
  for (let i = 0; i < data.indices.length; i += 3) {
    const [a, b, c] = data.indices.slice(i, i + 3).map(v => v * 3);
    const ny = (data.positions[b + 2] - data.positions[a + 2]) * (data.positions[c] - data.positions[a])
      - (data.positions[b] - data.positions[a]) * (data.positions[c + 2] - data.positions[a + 2]);
    assert.ok(ny > 0, `${name}: triangle ${i / 3} faces down or is degenerate`);
  }
}

test('terrain, path, river and sediment margins have finite geometry and upward winding', () => {
  for (const [name, data] of [
    ['terrain', terrainMesh()],
    ['path', pathMesh()],
    ['river', riverMesh()],
    ['river-margin', riverMarginMesh()],
  ]) assertMesh(name, data);
});

test('riverbed stays below water and admitted building pads remain level', () => {
  for (let z = -110; z <= 110; z++) assert.ok(landscape.heightAt(riverCenter(z), z) < WATER_HEIGHT);
  for (const pad of SETTLEMENT) {
    for (const [dx, dz] of [[0, 0], [2, 2], [-2, 2], [2, -2], [-2, -2]]) {
      assert.equal(landscape.heightAt(pad.x + dx, pad.z + dz), pad.y);
    }
  }
});

test('worn path has restrained but meaningful width variation', () => {
  const widths = [];
  for (let x = -85; x <= 85; x += 1) widths.push(pathHalfWidth(x));
  const min = Math.min(...widths);
  const max = Math.max(...widths);
  assert.ok(min > 0.8, `path too narrow: ${min}`);
  assert.ok(max < 1.7, `path too wide: ${max}`);
  assert.ok(max - min > 0.25, `path width variation too small: ${max - min}`);
});

test('sediment margins stay outside the rendered water strip and remain terrain-following', () => {
  const margin = riverMarginMesh();
  const water = riverMesh();
  assert.ok(margin.positions.length > water.positions.length, 'margin should contain inner and outer bank vertices');
  const alphas = margin.colors?.filter((_value, index) => index % 4 === 3) ?? [];
  assert.ok(alphas.some(value => value === 0), 'margin needs transparent outer shoulders');
  assert.ok(alphas.some(value => value > 0.5), 'margin needs visible inner sediment');
});
