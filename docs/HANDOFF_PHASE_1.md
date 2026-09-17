# Phase 1 checkpoint — RECONCILED / VISUAL PASS V2 / CONTENT GATE BLOCKED

## STATUS

The Phase 1 environment checkpoint is running on the verified Phase 0.5 baseline rather than the stale pre-repair runtime.

Source checkpoint PR: `#8` (audit/source only; do not merge directly)  
Authoritative reconciliation PR: `#14`  
Authoritative branch: `integrate/phase1-on-phase0_5`  
Current branch state after v2 regression sync + asset-intake updates: descendant of `f90efc1bd60b75e967844bfebc2c4b8f9e6ec4f4`  
Current verified visual-pass evidence run: `35267593823`  
Technical result: **CI PASS**.  
Professional Phase 1 result: **NOT ACCEPTED — content/composition + historical + real-GPU gates remain open**.

Phase 0.5 remains authoritative for runtime lifecycle, host ownership, fixed-step timing, WebGPU/WebGL2 fallback and asset addressing.

## IMPLEMENTED

- 220 m rolling South/Central Bohemian benchmark landscape.
- Stream with terrain-following sediment shoulders and shallow-edge → channel opacity/color variation.
- Softer variable-width terrain-following worn path.
- Clustered/lower/lighter procedural meadow with deliberate negative space.
- Larger/warped ground UV presentation to reduce obvious terrain tiling.
- More neutral Central-European daylight/grading than the original yellow-green checkpoint.
- Terrain-aware inspection camera with orbit/pan/zoom and preset views.
- Nine Poly Haven CC0 terrain textures.
- One rectangular Boii dwelling evaluation candidate.
- Asynchronous scene initialization and scene-scoped GLB/texture ownership.
- Bounds-based model normalization and grounding.
- Scene diagnostics merged into the existing host-neutral `GameRuntime.snapshot()`.
- Default route displays Phase 1 benchmark; `?scene=calibration` preserves Phase 0 regression scene.
- Generic GLB admission checker and Phase 1 generated-asset intake gate.

No primitive stand-ins are silently substituted for missing production assets.

## PHASE 0.5 RECONCILIATION INVARIANTS

The reconciliation retains:

- `createGameRuntime()` initialize/start/pause/resume/resize/visibility/destroy lifecycle;
- host-owned window/document/UI event wiring;
- debug mount/unmount/remount bridge and three-cycle lifecycle regression;
- PlayCanvas ownership of rendering and fixed-step integration;
- central `resolveAsset()` runtime asset addressing;
- automatic WebGPU → WebGL2 fallback and explicit WebGL2 QA;
- Phase 0 browser tests on `?scene=calibration` plus separate `smoke:phase1`.

Do not regress these while adding Phase 1 content.

## CURRENT VISUAL-PASS V2 EVIDENCE

Run `35267593823` passed:

- strict TypeScript
- Node tests: **14/14**
- production Vite build
- Phase 0 WebGL2 / fallback / failure UI
- Phase 0 interactions
- Phase 0 lifecycle remount 3/3
- Phase 0 software WebGPU
- Phase 1 WebGL2 benchmark smoke

Phase 1 capture diagnostics:

```text
structures:   1
inhabitants:  0
trees:        0
grassClumps:  1161
drawCalls:    126
tick:         2
fps:          ~15.0   # SwiftShader CI only
frameMs:      ~66.65  # SwiftShader CI only
```

Evidence artifact: `10517456076`  
ZIP SHA-256: `5f55bcdb62bd2fc3e7cf131eb324778f7e8a488c26a9a862aff9f8ebedb91300`

The software FPS value is not actual-GPU performance evidence.

## VISUAL QA RESULT

Compared with the original Phase 1 evidence:

- grass clumps fell from `4,678` to `1,161` without a draw-call explosion (`124 → 126`);
- the path is softer, less graphic and variable-width;
- water/bank transition is less artificial and includes a real shallow/channel gradient;
- the palette is less yellow-green;
- terrain tiling is reduced but broad macro repetition remains visible in sparse areas.

The environment itself is materially improved. The current dominant blocker is now **missing real content/composition**, not a need for more procedural grass.

Full review: `docs/PHASE_1_VISUAL_QA.md`.  
Environment blocker tracking: Issue `#16`.  
Missing built/character asset production: Issue `#17`.

## ASSET STATE

### Dwelling — evaluation candidate

`public/assets/buildings/boii_dwelling_rectangular.glb`

- size: `5,621,848` bytes
- SHA-256: `faa41587ee4631017dc0cf8abdaceb06a4b7ef93996c4914458b5ed80c9382aa`
- vertices: `105,019`
- triangles: `99,298`
- embedded textures: two 2048×2048 WebP maps
- LOD: none

Still above the 25k–60k brief target. Requires optimization/LOD or replacement and historical review.

### Storehouse

No GLB candidate captured yet. Target runtime path remains:

`public/assets/buildings/boii_storehouse_small.glb`

Budget: 15k–35k triangles.

### Open carpentry/work shelter

First manual to3D output was structurally readable and visually the correct open-workshop type, but rejected as-is:

- SHA-256: `079a36689153538124c388faf84b0ab6e49b4b3b6d41c41a1f8de2aae5e32b1f`
- vertices: `65,301`
- triangles: **`89,778`**
- embedded 1024×1024 PNG
- no external dependencies / no required glTF extensions
- 0 degenerate triangles

Reason for rejection: exceeds the agreed 20k–45k budget by ~2×. Regenerate/decimate cleanly to ≤45k before runtime admission.

### Adult worker

First manual to3D output was structurally compact but rejected after textured preview:

- SHA-256: `40f00021016c8157459cc4dab9612bba849654afe89c82c45795cdb0d0d21a0c`
- vertices: `9,805`
- triangles: `14,106`
- embedded 1024×1024 PNG
- no external dependencies / no required glTF extensions
- 0 degenerate triangles

Polygon count itself is acceptable for a repeated RTS unit. The problem is visible texture projection corruption/patchwork on face, clothing and rear surfaces. Regenerate for clean texture projection instead of adding polygons.

The worker intake floor was therefore adjusted from 25k to **12k** triangles while retaining the 50k maximum. This allows efficient clean RTS workers without rewarding unnecessary geometry.

Detailed receipt: `assets/source/phase1/TO3D_INTAKE_2026-09-17.md`.

### Trees

Production Central-European tree assets remain missing. Vegetation batching/instancing/LOD policy should be finalized only after real tree assets exist.

## DEPLOYMENT

The public GitHub Pages URL remains the verified Phase 0.5 release:

`https://rostakr.github.io/-Bohemia-age-of-tribes./`

PR #14 has not been promoted to public deployment. Pages publishing remains manual-only.

## NEXT IMPLEMENTATION ORDER

1. Generate a clean small storehouse candidate and admit it structurally.
2. Regenerate/optimize the open workshop to ≤45k tris with clean UV/texture projection.
3. Regenerate the adult worker with clean front/side/rear texture projection; keep efficient geometry if visually sound.
4. Add production Central-European tree assets.
5. Wire only admitted models into `ADMITTED_MODELS`; target initial benchmark counts: 3 structures + ~5 inhabitants + first forest-edge trees.
6. Re-run full combined Phase 0 + Phase 1 CI and capture settlement/workshop/stream evidence.
7. Reassess visual composition and remaining macro terrain repetition.
8. Perform actual-GPU review and historical review before Phase 1 acceptance.
9. Optimize/replace the 99,298-triangle dwelling and define LOD if retained.

## HANDOFF RULE

Continue only from PR #14 / `integrate/phase1-on-phase0_5` or its accepted descendant. Do not merge old PR #8 directly and do not restore its obsolete runtime/bootstrap implementations.

**PHASE 1 remains technically healthy but not accepted. Phase 2 is not released.**
