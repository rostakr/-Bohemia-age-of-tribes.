import { readFileSync, writeFileSync } from 'node:fs';

function replaceOnce(path, from, to) {
  const source = readFileSync(path, 'utf8');
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${path}: expected exactly one match, got ${count}: ${JSON.stringify(from.slice(0, 120))}`);
  writeFileSync(path, source.replace(from, to));
}

// Asset manifest: make the admitted WIP runtime form match the actual branch state.
replaceOnce(
  'docs/ASSET_MANIFEST.md',
  'One Phase 1 dwelling model is imported for evaluation. The GLB/model slots for storehouse, workshop, inhabitant and tree remain empty; project-owned procedural storehouse, workshop and deciduous-tree candidates are integrated separately and are not represented as admitted production models.',
  'One Phase 1 dwelling model and one project-owned textured storehouse GLB are imported for evaluation. The workshop, inhabitant and tree production GLB/model slots remain empty; their project-owned procedural candidates are integrated separately and are not represented as admitted final production models.'
);

replaceOnce(
  'docs/ASSET_MANIFEST.md',
  '| Small Boii storehouse | Original project code `src/render/storehouse.ts`; internal project work, no third-party art | Deterministic procedural PlayCanvas mesh; no external textures | Overall bounds 3.856 × 3.376 × 3.795 m including roof overhang; raised structural platform ~3.15 × 3.15 m | 15,910 vertices; 15,550 triangles; no LOD | Five solid non-metallic groups: weathered oak, hazel wattle, pale clay daub, straw thatch, packed earth | Boii / Late La Tène small raised storage candidate | Integrated as explicit `procedural-project-owned` WIP candidate; geometry tests, 3/3 lifecycle remount and software-WebGL2 screenshot passed. `ADMITTED_MODELS.storehouse` remains null; visual, historical and actual-hardware performance acceptance pending; `artGatePassed=false`. |',
  '| Small Boii storehouse | Original project geometry `src/render/storehouse.ts`, reproducibly exported by `scripts/export-storehouse.mjs`; project-owned generated material sources under `assets/source/phase1/materials/`; no downloaded third-party texture | `public/assets/buildings/boii_storehouse_small.glb`; self-contained GLB with embedded base-color textures | Overall bounds 3.856 × 3.376 × 3.795 m including roof overhang; raised structural platform ~3.15 × 3.15 m | 15,910 vertices; 15,550 triangles; no LOD; 9,933,356-byte GLB | Five non-metallic groups; timber/thatch/daub use three embedded PNG base colors, wattle/earth retain factors; geometry normals present; no normal/roughness maps | Boii / Late La Tène small raised storage candidate | Admitted as explicit `project-owned-glb` WIP after strict GLB validation plus full runtime QA: 22/22 Node tests, 3/3 remount, software WebGPU, standard Phase 1 WebGL2, admission and close-up smokes passed in run `35408681042`; evidence artifact `10573840636`. Visual QA found stable grounding/scale and no obvious UV corruption, but final material polish, LOD, compression, historical/art and actual-hardware performance acceptance remain pending; `artGatePassed=false`. |'
);

replaceOnce(
  'docs/ASSET_MANIFEST.md',
  'Exact procedural storehouse source, deterministic seed, geometry statistics and CI evidence are recorded in `assets/source/phase1/storehouse-receipt.json`.',
  'Exact procedural storehouse source, deterministic seed, geometry statistics and earlier CI evidence are recorded in `assets/source/phase1/storehouse-receipt.json`; the admitted textured GLB export/hash/material limitations are recorded in `assets/source/phase1/storehouse-glb-receipt.json` and `assets/source/phase1/materials/*-receipt.json`.'
);

// Project state: record the new WIP admission without closing the art gate.
replaceOnce('docs/PROJECT_STATE.md', '  "updated": "2026-09-18",', '  "updated": "2026-09-19",');
replaceOnce(
  'docs/PROJECT_STATE.md',
  '  "phase_1_dwelling_lod_merge_sha": "6be481b5619d8558632c94ab0ef74bd6664a28e5",\n  "phase_1_status": "BENCHMARK_CONTENT_CLASSES_PRESENT_DWELLING_LOD1_ART_GATE_OPEN",',
  '  "phase_1_dwelling_lod_merge_sha": "6be481b5619d8558632c94ab0ef74bd6664a28e5",\n  "phase_1_supplied_storehouse_pr": 51,\n  "phase_1_supplied_storehouse_qa_head": "bb9b1783aed4836fb24b4961ec3fb29b33b4bf0b",\n  "phase_1_status": "TEXTURED_STOREHOUSE_WIP_ADMITTED_ART_GATE_OPEN",'
);

replaceOnce(
  'docs/PROJECT_STATE.md',
  '  "production_deployment_validation": {',
  '  "phase_1_supplied_storehouse_validation": {\n    "workflow_run": 35408681042,\n    "result": "passed",\n    "npm_ci": "passed; 0 vulnerabilities",\n    "typescript": "passed",\n    "node_tests": "22/22 passed",\n    "strict_glb_intake": "passed",\n    "storehouse_glb_bytes": 9933356,\n    "storehouse_triangles": 15550,\n    "storehouse_vertices": 15910,\n    "storehouse_primitives_with_normals": "5/5",\n    "storehouse_primitives_with_uv0": "5/5",\n    "embedded_images": 3,\n    "external_dependencies": 0,\n    "phase_0_webgl2_regression": "passed",\n    "phase_0_interaction_regression": "passed",\n    "phase_1_lifecycle_remount": "3/3 cycles passed",\n    "phase_0_webgpu_regression": "passed",\n    "phase_1_webgl2_render_smoke": "passed",\n    "storehouse_admission_smoke": "passed",\n    "storehouse_closeup_smoke": "passed",\n    "evidence_artifact_id": 10573840636,\n    "evidence_artifact_sha256": "eaee51e6987cf4e9d87c66c4d2865d846bf3a3e8753fba06881e6ff7dafb58e2",\n    "visual_review": "passed for WIP runtime admission; stable scale/grounding and no obvious UV corruption; full PBR/LOD/compression/hardware acceptance pending",\n    "art_gate_passed": false\n  },\n  "production_deployment_validation": {'
);

replaceOnce(
  'docs/PROJECT_STATE.md',
  '- Current benchmark content: three visible structures, five static inhabitant readability prototypes, 32 shared-mesh deciduous-tree instances and procedural meadow ground cover around the stream/path environment.',
  '- Current benchmark content: three visible structures including the admitted project-owned textured storehouse GLB, five static inhabitant readability prototypes, 32 shared-mesh deciduous-tree instances and procedural meadow ground cover around the stream/path environment.'
);
replaceOnce(
  'docs/PROJECT_STATE.md',
  '- Production GLB slots for storehouse, workshop, inhabitant and tree remain intentionally unfilled. The procedural candidates are explicit WIP content and are not represented as admitted final production assets.',
  '- The storehouse slot now uses the project-owned textured GLB as a WIP runtime candidate. Workshop, inhabitant and tree production GLB slots remain intentionally unfilled; their procedural candidates are explicit WIP content and are not represented as admitted final production assets.'
);
replaceOnce(
  'docs/PROJECT_STATE.md',
  '- Storehouse candidate: 15,550 triangles.',
  '- Storehouse runtime candidate: project-owned textured GLB, 15,550 triangles / 15,910 vertices / 9,933,356 bytes, with three embedded base-color textures; strict structural and close-up visual QA passed.'
);
replaceOnce(
  'docs/PROJECT_STATE.md',
  '- Storehouse and workshop are project-owned procedural WIP candidates; their production-model/LOD strategy and final historical/visual acceptance remain open.',
  '- Storehouse is now a project-owned textured GLB WIP candidate; compression, full PBR maps, LOD strategy, final historical/visual review and actual-hardware performance remain open. Workshop remains a project-owned procedural WIP candidate. The supplied 89,778-triangle workshop and supplied textured worker were not admitted to runtime; originals/provenance remain archived.'
);
replaceOnce(
  'docs/PROJECT_STATE.md',
  '1. Replace or upgrade the inhabitant readability prototype with a production adult-worker candidate matching the documented 25k–50k triangle / 2K atlas brief while preserving five-instance settlement readability.',
  '1. Replace or upgrade the inhabitant readability prototype with a clean production adult-worker candidate matching the documented character brief while preserving five-instance settlement readability; do not reuse the rejected patchwork-textured supplied worker.'
);

writeFileSync('docs/qa/SUPPLIED_STOREHOUSE_QA.md', `# Supplied textured storehouse — QA result\n\nStatus: **PASS for WIP runtime admission; final art gate remains open.**\n\n- QA head: \`bb9b1783aed4836fb24b4961ec3fb29b33b4bf0b\`\n- Workflow run: \`35408681042\`\n- Evidence artifact: \`10573840636\`\n- Artifact SHA-256: \`eaee51e6987cf4e9d87c66c4d2865d846bf3a3e8753fba06881e6ff7dafb58e2\`\n- GLB: 9,933,356 bytes; 15,550 triangles; 15,910 vertices; 5 primitives/materials; 3 embedded images/textures.\n- Structural gate: 5/5 primitives have NORMAL and UV0; no external dependencies.\n- Runtime: 22/22 Node tests, production build, Phase 0 regressions, 3/3 remount, software WebGPU, Phase 1 WebGL2, admission and close-up smokes all passed.\n- Visual review: scale and raised grounding are plausible in the benchmark; roof orientation is correct; no obvious UV collapse, gross seam or projection corruption was visible.\n- Limits: base-color focused material pass only; no normal/roughness maps, no storehouse LOD, no texture compression; 9.93 MB is heavy for the object size; actual desktop-GPU performance and final historical/art acceptance remain pending.\n\nThe supplied workshop and supplied adult-worker GLBs are **not admitted to runtime**. Their originals remain under \`assets/source/phase1/user-supplied/\` for provenance. The workshop exceeds the target budget and lacks required normals; the worker lacks required normals and its earlier textured preview was visually rejected for projection artifacts.\n\n\`artGatePassed=false\` remains authoritative.\n`);

console.log('Patched supplied-storehouse QA documentation.');
