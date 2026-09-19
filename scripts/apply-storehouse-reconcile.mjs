import { readFileSync, writeFileSync } from 'node:fs';

function replaceOnce(path, from, to) {
  const source = readFileSync(path, 'utf8');
  const first = source.indexOf(from);
  if (first < 0) throw new Error(`${path}: expected text not found: ${JSON.stringify(from)}`);
  if (source.indexOf(from, first + from.length) >= 0) throw new Error(`${path}: expected text occurs more than once`);
  writeFileSync(path, source.slice(0, first) + to + source.slice(first + from.length));
}

replaceOnce(
  'src/render/benchmark-scene.ts',
  "  storehouse: null,\n  workshop: null,",
  "  storehouse: SUPPLIED_STOREHOUSE_PATH,\n  workshop: null,",
);
replaceOnce(
  'scripts/browser-phase1-smoke.mjs',
  "diagnostics.storehouseCandidate === 'procedural-project-owned'",
  "diagnostics.storehouseCandidate === 'project-owned-glb'",
);
replaceOnce(
  'scripts/browser-phase1-smoke.mjs',
  "diagnostics?.storehouseCandidate !== 'procedural-project-owned'",
  "diagnostics?.storehouseCandidate !== 'project-owned-glb'",
);

console.log('Applied storehouse-only supplied-content reconciliation.');
