import { readFileSync, writeFileSync, rmSync } from 'node:fs';

function replaceExactly(path, before, after) {
  const source = readFileSync(path, 'utf8');
  if (!source.includes(before)) throw new Error(`${path}: expected marker not found`);
  const first = source.indexOf(before);
  if (source.indexOf(before, first + before.length) !== -1) throw new Error(`${path}: marker is not unique`);
  writeFileSync(path, source.replace(before, after));
}

replaceExactly(
  'src/render/benchmark-scene.ts',
  "  storehouse: null,",
  "  storehouse: 'buildings/boii_storehouse_small.glb',",
);
replaceExactly(
  'src/render/benchmark-scene.ts',
  "      storehouseCandidate: this.storehouseTriangles > 0 ? 'procedural-project-owned' : 'absent',\n      storehouseTriangles: this.storehouseTriangles,",
  "      storehouseCandidate: this.models.storehouse\n        ? 'project-owned-textured-glb-wip'\n        : this.storehouseTriangles > 0 ? 'procedural-project-owned' : 'absent',\n      storehouseTriangles: this.models.storehouse ? 15_550 : this.storehouseTriangles,",
);

replaceExactly(
  'scripts/browser-phase1-smoke.mjs',
  "      diagnostics.storehouseCandidate === 'procedural-project-owned' &&\n      Number(diagnostics.storehouseTriangles) >= 15_000 &&",
  "      diagnostics.storehouseCandidate === 'project-owned-textured-glb-wip' &&\n      Number(diagnostics.storehouseTriangles) === 15_550 &&",
);
replaceExactly(
  'scripts/browser-phase1-smoke.mjs',
  "    diagnostics?.storehouseCandidate !== 'procedural-project-owned' ||\n    Number(diagnostics?.storehouseTriangles) < 15_000 ||",
  "    diagnostics?.storehouseCandidate !== 'project-owned-textured-glb-wip' ||\n    Number(diagnostics?.storehouseTriangles) !== 15_550 ||",
);

const packagePath = 'package.json';
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
if (!pkg.scripts.test.includes('scripts/check-glb-tools.mjs')) {
  pkg.scripts.test += ' scripts/check-glb-tools.mjs';
}
pkg.scripts['check:glb'] = 'node scripts/check-glb.mjs';
pkg.scripts['prepare:glb-normals'] = 'node scripts/add-glb-normals.mjs';
pkg.scripts['check:phase1-assets'] = 'node --check scripts/check-glb.mjs && node --check scripts/add-glb-normals.mjs && node --check scripts/check-phase1-assets.mjs && node scripts/check-phase1-assets.mjs';
pkg.scripts.validate = 'npm run typecheck && npm test && npm run check:phase1-assets && npm run build';
writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

rmSync('scripts/apply-storehouse-admission.mjs');
console.log('Storehouse admission patch applied.');
