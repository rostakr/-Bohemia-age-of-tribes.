import test from 'node:test';
import assert from 'node:assert/strict';
import { terrainMesh, pathMesh, riverMesh, landscape, riverCenter, SETTLEMENT, WATER_HEIGHT } from '../src/render/landscape.ts';

test('terrain, path and river have finite vertices, valid indices and upward winding', () => {
  for (const [name, data] of [['terrain', terrainMesh()], ['path', pathMesh()], ['river', riverMesh()]]) {
    assert.ok(data.positions.every(Number.isFinite), name);
    assert.equal(data.uvs.length, data.positions.length / 3 * 2, name);
    assert.ok(data.indices.every(i => Number.isInteger(i) && i >= 0 && i < data.positions.length / 3), name);
    for (let i = 0; i < data.indices.length; i += 3) {
      const [a, b, c] = data.indices.slice(i, i + 3).map(v => v * 3);
      const ny = (data.positions[b + 2] - data.positions[a + 2]) * (data.positions[c] - data.positions[a])
        - (data.positions[b] - data.positions[a]) * (data.positions[c + 2] - data.positions[a + 2]);
      assert.ok(ny > 0, `${name}: triangle ${i / 3} faces down or is degenerate`);
    }
  }
});

test('riverbed stays below water and admitted building pads are level', () => {
  for (let z = -110; z <= 110; z++) assert.ok(landscape.heightAt(riverCenter(z), z) < WATER_HEIGHT);
  for (const pad of SETTLEMENT) {
    for (const [dx, dz] of [[0, 0], [2, 2], [-2, 2], [2, -2], [-2, -2]]) {
      assert.equal(landscape.heightAt(pad.x + dx, pad.z + dz), pad.y);
    }
  }
});
