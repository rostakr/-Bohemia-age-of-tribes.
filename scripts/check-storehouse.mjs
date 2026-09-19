import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Production source uses bundler-style extensionless runtime imports. Node's native
// strip-types loader does not resolve those to .ts, so create a temporary test-only
// copy with the one runtime import made explicit. Production source is not rewritten.
const sourceUrl = new URL('../src/render/storehouse.ts', import.meta.url);
const testModuleUrl = new URL('../src/render/storehouse.node-test.ts', import.meta.url);
const source = readFileSync(sourceUrl, 'utf8').replace("from './landscape';", "from './landscape.ts';");
writeFileSync(testModuleUrl, source, 'utf8');
after(() => rmSync(fileURLToPath(testModuleUrl), { force: true }));
const { createStorehouseGeometry, storehouseStats, STOREHOUSE_UV_REPEAT_METRES } = await import(testModuleUrl.href);

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
      const ai = data.indices[i] * 3;
      const bi = data.indices[i + 1] * 3;
      const ci = data.indices[i + 2] * 3;
      const ax = data.positions[ai], ay = data.positions[ai + 1], az = data.positions[ai + 2];
      const abx = data.positions[bi] - ax, aby = data.positions[bi + 1] - ay, abz = data.positions[bi + 2] - az;
      const acx = data.positions[ci] - ax, acy = data.positions[ci + 1] - ay, acz = data.positions[ci + 2] - az;
      const cx = aby * acz - abz * acy;
      const cy = abz * acx - abx * acz;
      const cz = abx * acy - aby * acx;
      const area2 = Math.hypot(cx, cy, cz);
      assert.ok(area2 > 1e-10, `${name}: degenerate triangle ${i / 3}`);
    }
  }
});

test('storehouse UVs preserve physical repeat scale and explicit cylinder seams', () => {
  const geometry = createStorehouseGeometry();
  assert.equal(STOREHOUSE_UV_REPEAT_METRES, 0.65);

  const timberV = geometry.timber.uvs.filter((_, index) => index % 2 === 1);
  const thatchU = geometry.thatch.uvs.filter((_, index) => index % 2 === 0);
  assert.ok(Math.max(...timberV) > 5, 'long timber members must repeat instead of stretching one texture tile');
  assert.ok(Math.max(...thatchU) > 5, 'roof ridge direction must repeat instead of stretching one texture tile');

  // A cylinder seam is represented by coincident vertices carrying U=0 and U=1.
  // Without the duplicated seam vertex the last strip interpolates from U<1 back to U=0.
  const uvByPosition = new Map();
  for (let vertex = 0; vertex < geometry.timber.positions.length / 3; vertex++) {
    const p = geometry.timber.positions.slice(vertex * 3, vertex * 3 + 3).map(value => value.toFixed(7)).join(',');
    const u = geometry.timber.uvs[vertex * 2];
    const v = geometry.timber.uvs[vertex * 2 + 1];
    const entries = uvByPosition.get(p) ?? [];
    entries.push([u, v]);
    uvByPosition.set(p, entries);
  }
  const hasExplicitSeam = [...uvByPosition.values()].some(entries =>
    entries.some(([u0, v0]) => Math.abs(u0) < 1e-9 &&
      entries.some(([u1, v1]) => Math.abs(u1 - 1) < 1e-9 && Math.abs(v1 - v0) < 1e-9)));
  assert.ok(hasExplicitSeam, 'timber cylinders must duplicate U=0/U=1 seam vertices');
});
