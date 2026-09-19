import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorkshopGeometry,
  workshopStats,
  WORKSHOP_UV_REPEAT_METRES,
} from '../src/render/workshop.ts';

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

function positionKey(data, vertex) {
  const offset = vertex * 3;
  return [data.positions[offset], data.positions[offset + 1], data.positions[offset + 2]]
    .map(value => value.toFixed(7))
    .join(',');
}

test('procedural Boii workshop geometry stays finite, indexed and within the Phase 1 candidate budget', () => {
  const geometry = createWorkshopGeometry();
  for (const [label, data] of Object.entries(geometry)) validateMeshData(data, label);

  const stats = workshopStats(geometry);
  console.log('workshop-stats', JSON.stringify(stats));
  assert.ok(stats.triangles >= 20_000 && stats.triangles <= 45_000, 'workshop must stay inside 20k-45k triangle target');
  assert.ok(stats.vertices > 0);
  assert.ok(stats.width >= 4.8 && stats.width <= 5.6, 'workshop width must remain close to the 5 m brief');
  assert.ok(stats.height >= 3.3 && stats.height <= 3.8, 'workshop height must remain close to the 3.5 m brief');
  assert.ok(stats.depth >= 3.0 && stats.depth <= 4.2, 'workshop roof/footprint depth is outside expected range');
});

test('procedural workshop triangles are non-degenerate', () => {
  const geometry = createWorkshopGeometry();
  for (const [label, data] of Object.entries(geometry)) {
    for (let i = 0; i < data.indices.length; i += 3) {
      const ia = data.indices[i] * 3;
      const ib = data.indices[i + 1] * 3;
      const ic = data.indices[i + 2] * 3;
      const ax = data.positions[ia], ay = data.positions[ia + 1], az = data.positions[ia + 2];
      const bx = data.positions[ib], by = data.positions[ib + 1], bz = data.positions[ib + 2];
      const cx = data.positions[ic], cy = data.positions[ic + 1], cz = data.positions[ic + 2];
      const abx = bx - ax, aby = by - ay, abz = bz - az;
      const acx = cx - ax, acy = cy - ay, acz = cx - ax;
      const nx = aby * acz - abz * acy;
      const ny = abz * acx - abx * acz;
      const nz = abx * acy - aby * acx;
      assert.ok(nx * nx + ny * ny + nz * nz > 1e-12, label + ': degenerate triangle at index ' + i / 3);
    }
  }
});

test('workshop UVs use physical repeat scale and explicit cylinder seam vertices', () => {
  const { timber } = createWorkshopGeometry();
  assert.equal(WORKSHOP_UV_REPEAT_METRES, 0.65);

  let maxU = -Infinity;
  let maxV = -Infinity;
  for (let i = 0; i < timber.uvs.length; i += 2) {
    maxU = Math.max(maxU, timber.uvs[i]);
    maxV = Math.max(maxV, timber.uvs[i + 1]);
  }
  assert.ok(maxU > 3, 'long timber members should repeat the texture more than three times');
  assert.ok(maxV > 3, 'long timber members should repeat the texture along their physical length');

  const verticesByPosition = new Map();
  for (let vertex = 0; vertex < timber.positions.length / 3; vertex++) {
    const key = positionKey(timber, vertex);
    const list = verticesByPosition.get(key) ?? [];
    list.push(vertex);
    verticesByPosition.set(key, list);
  }

  let seamPairs = 0;
  for (const vertices of verticesByPosition.values()) {
    if (vertices.length < 2) continue;
    for (let i = 0; i < vertices.length; i++) {
      for (let j = i + 1; j < vertices.length; j++) {
        const a = vertices[i] * 2;
        const b = vertices[j] * 2;
        const sameV = Math.abs(timber.uvs[a + 1] - timber.uvs[b + 1]) < 1e-7;
        const uDifference = Math.abs(timber.uvs[a] - timber.uvs[b]);
        if (sameV && uDifference > 0.1) seamPairs++;
      }
    }
  }
  assert.ok(seamPairs >= 10, 'textured cylinders should expose duplicated seam vertices with distinct U values');
});
