import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const receiptPath = 'artifacts/phase1/worker-r2-receipt.json';
const assetPath = 'public/assets/characters/boii_adult_worker_r2.glb';
const sourceRecordPath = 'assets/source/phase1/worker-r2-source.json';

const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
const sourceRecord = JSON.parse(readFileSync(sourceRecordPath, 'utf8'));
const asset = readFileSync(assetPath);
const digest = createHash('sha256').update(asset).digest('hex');

assert.equal(receipt.asset, 'boii_adult_worker_r2');
assert.equal(receipt.source.sha256, '0ca4d24829f89ad60815102b5d08a6bcdfb9c5d724653ac08306ffe04dfae1f2');
assert.equal(receipt.source.bytes, 1_639_680);
assert.equal(receipt.source.triangles, 14_106);
assert.equal(receipt.output.triangles, 28_212);
assert.equal(receipt.output.vertices, 20_725);
assert.equal(digest, 'f50f87146909e4a3c7fa18e4a82c636fe05e24f0879f35e6a181c281c4efa21e');
assert.equal(asset.length, 2_106_832);
assert.equal(receipt.transform.compacted, true);
assert.equal(receipt.transform.equivalence_verified, true);
assert.equal(receipt.transform.precompact_vertices, 56_424);
assert.equal(receipt.transform.vertices_removed, 35_699);
assert.equal(receipt.transform.bytes_removed, 1_508_392);
assert.equal(receipt.output.sha256, digest);
assert.equal(receipt.output.bytes, asset.length);
assert.equal(receipt.output.animations, 0);
assert.equal(receipt.output.skins, 0);
assert.equal(receipt.admission.canonical_runtime_changed, false);
assert.equal(receipt.admission.art_gate_passed, false);
assert.equal(sourceRecord.rights.status, 'cleared_for_this_project');
assert.equal(sourceRecord.r2_transform.expected_triangles, 28_212);
assert.equal(sourceRecord.admission.admitted_models_changed, false);
assert.equal(sourceRecord.admission.art_gate_passed, false);

console.log(JSON.stringify({
  asset: receipt.asset,
  bytes: asset.length,
  sha256: digest,
  sourceTriangles: receipt.source.triangles,
  outputTriangles: receipt.output.triangles,
  outputVertices: receipt.output.vertices,
  materials: receipt.output.materials,
  textures: receipt.output.textures,
  images: receipt.output.images,
  canonicalRuntimeChanged: false,
  artGatePassed: false,
}, null, 2));
