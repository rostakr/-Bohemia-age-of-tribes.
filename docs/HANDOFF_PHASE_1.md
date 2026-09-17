# Phase 1 checkpoint — RECONCILED / NOT ACCEPTED

## STATUS

The Phase 1 environment checkpoint has been rebuilt on top of the verified Phase 0.5 baseline rather than merging the stale pre-repair branch directly.

Source checkpoint PR: `#8` (`a144a6f3e4d0c395086c2d296a0af661109fd14f`)  
Reconciliation PR: `#14`  
Validated reconciliation runtime SHA: `6ad76483cde4e2cf5c18e41c930af8cd347573f1`  
Validation workflow run: `35262530231`  
Result: **CI PASS; visual/historical/actual-hardware GPU acceptance pending**.

Phase 0.5 remains authoritative for runtime lifecycle, host ownership, fixed-step timing, WebGPU/WebGL2 fallback and asset addressing.

## IMPLEMENTED

- 220 m rolling South/Central Bohemian environment study.
- Recessed stream bed with animated ripple material.
- Feathered earth path and woodland leaf-litter surface.
- Procedural meadow detail; CI diagnostics reported 4,678 grass clumps.
- Terrain-aware inspection camera with orbit, pan, zoom, keyboard movement/rotation and three preset views.
- Nine acquired Poly Haven CC0 terrain textures (three diffuse/OpenGL-normal/roughness sets).
- One rectangular Boii dwelling candidate integrated for runtime evaluation.
- Asynchronous scene initialization and scene-scoped GLB/texture ownership.
- Bounds-based model normalization and grounding.
- Scene diagnostics merged into the existing host-neutral `GameRuntime.snapshot()` without replacing the Phase 0.5 runtime contract.
- Default route displays the Phase 1 benchmark; `?scene=calibration` preserves the Phase 0 regression scene.

The storehouse, workshop, inhabitant and tree model slots remain intentionally empty. No primitive substitutes are silently used for missing production assets.

## PHASE 0.5 RECONCILIATION

The old Phase 1 checkpoint used the pre-repair `createRuntime` API and owned browser resize/visibility listeners inside runtime code. Those changes were not ported. The reconciliation instead:

- retains `createGameRuntime()` with explicit initialize/start/pause/resume/resize/visibility/destroy operations;
- retains the debug mount/unmount/remount bridge and three-cycle lifecycle regression;
- retains host-owned window/document/UI event wiring in `src/main.ts`;
- retains PlayCanvas ownership of rendering and fixed-step integration;
- adds only the optional scene diagnostics needed by the benchmark;
- routes scene GLB/texture loads through the central `resolveAsset()` pipeline;
- keeps every Phase 0 browser test on `?scene=calibration` while adding a separate `smoke:phase1` gate.

## ASSETS

The original checkpoint's binary asset blobs were reused directly in Git rather than downloaded and re-uploaded. The current dwelling candidate is:

- file: `public/assets/buildings/boii_dwelling_rectangular.glb`
- size: 5,621,848 bytes
- SHA-256: `faa41587ee4631017dc0cf8abdaceb06a4b7ef93996c4914458b5ed80c9382aa`
- vertices: 105,019
- triangles: 99,298
- embedded textures: two 2048×2048 WebP maps
- LOD: none

The dwelling was generated through the free official Microsoft TRELLIS.2 Hugging Face Space for the user's authorized noncommercial project use. Structural/container/texture checks passed, but this does **not** establish historical, visual or final production acceptance. Its 99,298 triangles are also above the 25k–60k target in the asset brief, so optimization/LOD review is required before treating it as a production-ready RTS asset.

Terrain provenance, licenses and hashes remain recorded in `assets/source/phase1/terrain-receipt.json`, `public/ASSET_CREDITS.txt` and `docs/ASSET_MANIFEST.md`.

## VALIDATION — RUN 35262530231

The reconciled branch passed the combined Phase 0 + Phase 1 CI suite:

- `npm ci`: PASS; 0 vulnerabilities reported.
- strict TypeScript: PASS.
- Node tests: **11/11 PASS** — fixed-step/telemetry, central asset resolver and landscape geometry checks.
- production Vite build: PASS.
- Phase 0 WebGL2 smoke: PASS, including automatic fallback and failure UI.
- Phase 0 interactions: PASS.
- Phase 0 lifecycle remount: PASS, 3/3 cycles on the same canvas.
- Phase 0 software WebGPU: PASS (`webgpu` under Vulkan SwiftShader).
- Phase 1 benchmark WebGL2 smoke: PASS.

Phase 1 smoke diagnostics at evidence capture:

```text
structures:   1
inhabitants:  0
trees:        0
grassClumps:  4678
drawCalls:    124
tick:         2
fps:          ~15.0
frameMs:      ~66.65
```

The ~15 FPS value is from software SwiftShader CI and is **not** a real-GPU performance benchmark or a 60 FPS failure determination.

Evidence artifacts from run `35262530231`:

- static build: artifact `10515331207`, ZIP SHA-256 `1e453155d5b3a8f29aece4d18caf49f80d8bb8327897c4ee029ed74a1284cd76`
- Phase 0 screenshot: artifact `10515136710`
- Phase 1 screenshot: artifact `10515106681`, ZIP SHA-256 `8aa9b8dfbb2421c6510b415f6a36c5fe762c83e8cf947686c20d49d80b769809`

## DEPLOYMENT

The public GitHub Pages URL remains the verified Phase 0.5 release:

`https://rostakr.github.io/-Bohemia-age-of-tribes./`

PR #14 has **not** been promoted to the reference public deployment. Pages publishing remains manual-only. Do not describe the public URL as a Phase 1 release until a reviewed Phase 1 publish and production smoke have occurred.

## REMAINING QA / BLOCKERS

Before Phase 1 acceptance:

1. Inspect the Phase 1 evidence screenshot and then the scene on an actual GPU at the intended desktop resolution.
2. Check terrain/path/water joins, normal orientation, TAA ghosting, fog/readability, dwelling grounding and generated backside quality.
3. Perform historical review of the dwelling against Late La Tène Boii construction evidence.
4. Measure actual-hardware GPU performance; the software SwiftShader FPS number is not suitable for acceptance.
5. Optimize or replace the 99,298-triangle dwelling and define LOD policy if it is retained.
6. Acquire/integrate historically plausible storehouse, workshop, inhabitants and Central-European trees through approved free/noncommercial routes; record provenance before admission.
7. Add batching/instancing/LOD strategy once actual vegetation assets exist.
8. Keep Phase 0 calibration regressions passing throughout.

No Phase 2 acceptance should be inferred from this checkpoint.

## HANDOFF RULE

Continue implementation only from the reconciled Phase 0.5-based branch/PR #14 or its accepted descendant. Do not merge old PR #8 directly and do not restore its obsolete runtime/bootstrap implementations. PR #8 remains useful as an audit/source checkpoint until reconciliation is fully accepted.
