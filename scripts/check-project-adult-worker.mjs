import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectAdultWorkerGeometry, projectAdultWorkerStats, WORKER_ATLAS_RECTS } from '../assets/source/phase1/worker/worker-geometry.ts';

function triangleAreaSquared(data, offset) {
  const ia = data.indices[offset] * 3, ib = data.indices[offset + 1] * 3, ic = data.indices[offset + 2] * 3;
  const ax = data.positions[ia], ay = data.positions[ia + 1], az = data.positions[ia + 2];
  const bx = data.positions[ib], by = data.positions[ib + 1], bz = data.positions[ib + 2];
  const cx = data.positions[ic], cy = data.positions[ic + 1], cz = data.positions[ic + 2];
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const acx = cx - ax, acy = cy - ay, acz = cz - az;
  const nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
  return nx * nx + ny * ny + nz * nz;
}

test('project-owned adult worker stays in the Phase 1 production geometry budget', () => {
  const data = createProjectAdultWorkerGeometry();
  const stats = projectAdultWorkerStats(data);
  console.log('project-adult-worker-stats', JSON.stringify(stats));
  assert.equal(data.positions.length % 3, 0);
  assert.equal(data.indices.length % 3, 0);
  assert.equal(data.uvs.length, stats.vertices * 2);
  assert.ok(data.positions.every(Number.isFinite));
  assert.ok(data.uvs.every(Number.isFinite));
  assert.ok(stats.triangles >= 25_000 && stats.triangles <= 50_000, 'worker must stay inside 25k-50k target');
  assert.ok(stats.height >= 1.68 && stats.height <= 1.76, 'worker height must remain near the 1.72 m brief');
  assert.ok(stats.width >= 0.70 && stats.width <= 0.90, 'worker width outside expected neutral-pose range');
  assert.ok(stats.depth >= 0.34 && stats.depth <= 0.48, 'worker depth outside expected neutral-pose range');
  for (const index of data.indices) assert.ok(Number.isInteger(index) && index >= 0 && index < stats.vertices);
  for (let i = 0; i < data.indices.length; i += 3) assert.ok(triangleAreaSquared(data, i) > 1e-14, `degenerate triangle ${i / 3}`);
});

test('adult worker generation is deterministic and all UVs stay inside the single atlas', () => {
  const a = createProjectAdultWorkerGeometry();
  const b = createProjectAdultWorkerGeometry();
  assert.deepEqual(a, b);
  for (const uv of a.uvs) assert.ok(uv >= 0 && uv <= 1, `UV outside atlas: ${uv}`);
  assert.equal(Object.keys(WORKER_ATLAS_RECTS).length, 6);
});
