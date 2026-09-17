import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const candidates = [
  {
    label: 'Boii storehouse',
    path: 'public/assets/buildings/boii_storehouse_small.glb',
    min: 15000,
    max: 35000,
  },
  {
    label: 'Boii carpentry shelter',
    path: 'public/assets/buildings/boii_carpentry_shed_open.glb',
    min: 20000,
    max: 45000,
  },
  {
    label: 'Boii adult worker',
    path: 'public/assets/characters/boii_adult_worker.glb',
    // Repeated RTS inhabitants benefit from efficient geometry. 12k still rejects trivial/failed reconstructions.
    min: 12000,
    max: 50000,
  },
];

let failed = false;
let present = 0;
for (const candidate of candidates) {
  if (!existsSync(candidate.path)) {
    console.log(`PENDING: ${candidate.label} — ${candidate.path}`);
    continue;
  }
  present++;
  console.log(`VALIDATE: ${candidate.label} — ${candidate.path}`);
  const result = spawnSync(process.execPath, [
    'scripts/check-glb.mjs',
    candidate.path,
    '--min-tris', String(candidate.min),
    '--max-tris', String(candidate.max),
    '--require-normals',
    '--require-uv0',
  ], { stdio: 'inherit' });
  if (result.status !== 0) failed = true;
}

console.log(`Phase 1 generated asset intake: ${present}/${candidates.length} candidate files present.`);
if (failed) process.exit(1);
