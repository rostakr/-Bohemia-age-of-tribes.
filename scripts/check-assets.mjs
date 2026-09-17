import assert from 'node:assert/strict';
import test from 'node:test';
import { createAssetResolver, normalizeAssetPath } from '../src/assets/resolve-asset.ts';

test('asset resolver preserves relative Vite base paths', () => {
  assert.equal(createAssetResolver('./')('environment/tree_oak.glb'), './environment/tree_oak.glb');
  assert.equal(createAssetResolver('/-Bohemia-age-of-tribes./')('materials/mud.jpg'), '/-Bohemia-age-of-tribes./materials/mud.jpg');
});

test('asset resolver normalizes leading slashes without assuming root hosting', () => {
  assert.equal(createAssetResolver('/game/')('/characters/boii.glb'), '/game/characters/boii.glb');
  assert.equal(normalizeAssetPath('  ui/icon.png  '), 'ui/icon.png');
});

test('asset resolver rejects production URLs and parent traversal', () => {
  assert.throws(() => normalizeAssetPath('https://example.com/tree.glb'), /project-relative/);
  assert.throws(() => normalizeAssetPath('//cdn.example.com/tree.glb'), /project-relative/);
  assert.throws(() => normalizeAssetPath('../secret.glb'), /must not escape/);
});
