import { readFileSync, writeFileSync, rmSync } from 'node:fs';

const path = 'docs/ASSET_MANIFEST.md';
let source = readFileSync(path, 'utf8');

function replaceExactly(before, after) {
  if (!source.includes(before)) throw new Error(`ASSET_MANIFEST marker not found: ${before.slice(0, 80)}`);
  if (source.indexOf(before) !== source.lastIndexOf(before)) throw new Error('ASSET_MANIFEST marker not unique');
  source = source.replace(before, after);
}

replaceExactly(
  'One Phase 1 dwelling model is imported for evaluation. The GLB/model slots for storehouse, workshop, inhabitant and tree remain empty; project-owned procedural storehouse, workshop and deciduous-tree candidates are integrated separately and are not represented as admitted production models.',
  'One Phase 1 dwelling model and one project-owned textured storehouse WIP GLB are imported for evaluation. The GLB/model slots for workshop, inhabitant and tree remain empty; project-owned procedural workshop, inhabitant and deciduous-tree candidates remain explicit WIP fallbacks/readability content rather than admitted production models.',
);

replaceExactly(
  '| Small Boii storehouse | Original project code `src/render/storehouse.ts`; internal project work, no third-party art | Deterministic procedural PlayCanvas mesh; no external textures | Overall bounds 3.856 × 3.376 × 3.795 m including roof overhang; raised structural platform ~3.15 × 3.15 m | 15,910 vertices; 15,550 triangles; no LOD | Five solid non-metallic groups: weathered oak, hazel wattle, pale clay daub, straw thatch, packed earth | Boii / Late La Tène small raised storage candidate | Integrated as explicit `procedural-project-owned` WIP candidate; geometry tests, 3/3 lifecycle remount and software-WebGL2 screenshot passed. `ADMITTED_MODELS.storehouse` remains null; visual, historical and actual-hardware performance acceptance pending; `artGatePassed=false`. |',
  '| Small Boii storehouse | Original project geometry `src/render/storehouse.ts`, exported by `scripts/export-storehouse.mjs`; internal project work; project-owned generated base-colour sources retained under `assets/source/phase1/materials/` | GLB 2.0, metres/Y-up/ground-centred; 5 primitives with NORMAL + UV0; 5 materials; 3 embedded base-colour textures; no external dependencies/extensions | Overall bounds 3.856 × 3.376 × 3.795 m including roof overhang; 9,933,356 bytes | 15,910 vertices; 15,550 triangles; no LOD yet | Weathered oak, hazel wattle, pale clay/daub, straw thatch, packed earth; three embedded project-owned base-colour images | Boii / Late La Tène small raised storage WIP candidate | **Admitted as `project-owned-textured-glb-wip`** at `public/assets/buildings/boii_storehouse_small.glb`; strict GLB intake, 22/22 Node checks, 3/3 lifecycle remount, software WebGPU regression and default software-WebGL2 screenshot passed in PR #42/run #120. Full PBR/material polish, historical/visual and actual-hardware/LOD acceptance remain open; `artGatePassed=false`. |',
);

replaceExactly(
  'Exact procedural storehouse source, deterministic seed, geometry statistics and CI evidence are recorded in `assets/source/phase1/storehouse-receipt.json`.',
  'Exact procedural storehouse source, deterministic seed and earlier geometry evidence are recorded in `assets/source/phase1/storehouse-receipt.json`; the textured GLB export, embedded material sources and admission metadata are recorded in `assets/source/phase1/storehouse-glb-receipt.json` and `docs/qa/STOREHOUSE_TEXTURED_ADMISSION.md`.',
);

writeFileSync(path, source);
rmSync('scripts/apply-storehouse-manifest.mjs');
console.log('Storehouse manifest update applied.');
