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

test('sediment margins overlap the water edge and extend outward on both banks', () => {
  const margin = riverMarginMesh();
  const water = riverMesh();
  const rowVertices = 4;
  const rows = 221;
  for (let row = 0; row < rows; row += 22) {
    const offset = row * rowVertices * 3;
    const marginLeftOuter = margin.positions[offset]!;
    const marginLeftInner = margin.positions[offset + 3]!;
    const marginRightInner = margin.positions[offset + 6]!;
    const marginRightOuter = margin.positions[offset + 9]!;
    const waterLeft = water.positions[offset]!;
    const waterRight = water.positions[offset + 9]!;
    assert.ok(marginLeftOuter < waterLeft, `row ${row}: left sediment does not extend beyond water`);
    assert.ok(marginLeftInner > waterLeft, `row ${row}: left sediment should overlap water edge slightly`);
    assert.ok(marginRightInner < waterRight, `row ${row}: right sediment should overlap water edge slightly`);
    assert.ok(marginRightOuter > waterRight, `row ${row}: right sediment does not extend beyond water`);
  }
  const alphas = margin.colors?.filter((_value, index) => index % 4 === 3) ?? [];
  assert.ok(alphas.some(value => value === 0), 'margin needs transparent outer shoulders');
  assert.ok(alphas.some(value => value > 0.4), 'margin needs visible inner sediment');
});

test('river water carries a shallow-edge to channel opacity gradient', () => {
  const river = riverMesh();
  assert.equal(river.colors?.length, river.positions.length / 3 * 4, 'river vertex colors must match vertex count');
  const alphas = river.colors?.filter((_value, index) => index % 4 === 3) ?? [];
  assert.ok(alphas.length > 0, 'river needs opacity vertex data');
  const min = Math.min(...alphas);
  const max = Math.max(...alphas);
  assert.ok(min >= 0.35 && min <= 0.55, `unexpected shallow alpha ${min}`);
  assert.ok(max >= 0.65 && max <= 0.8, `unexpected channel alpha ${max}`);
  assert.ok(max - min >= 0.18, `water opacity gradient too weak: ${max - min}`);
});
