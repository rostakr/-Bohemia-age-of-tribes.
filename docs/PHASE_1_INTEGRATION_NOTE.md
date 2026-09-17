# Phase 1 reconciliation note

Source checkpoint: draft PR `#8`, branch `integrate/phase1-checkpoint`, head `a144a6f3e4d0c395086c2d296a0af661109fd14f`.

Verified infrastructure baseline: Phase 0.5 on `main`, finalized through `1a080e9bced13c13dbf73e47e45279569ac54a5f`.

Reconciliation branch: `integrate/phase1-on-phase0_5`  
Reconciliation PR: `#14`  
First validated runtime head: `6ad76483cde4e2cf5c18e41c930af8cd347573f1`  
Validation run: `35262530231` — PASS.

## Rules applied

- The old Phase 1 branch was not merged into `main` because it diverged from the verified Phase 0.5 lifecycle/asset-resolution work.
- The checkpoint's binary assets were reused by exact Git blob SHA, avoiding lossy or accidental replacement during transfer.
- The checkpoint copy of coordination state was not allowed to overwrite the newer live repository state.
- `AGENTS.md` and the verified Phase 0.5 repair documentation were preserved from current `main`.
- The obsolete Phase 1 `createRuntime` implementation was not ported. `createGameRuntime()` from Phase 0.5 remains authoritative.
- Window/document resize and visibility ownership stays in the browser host (`src/main.ts`). PlayCanvas still owns the render/game loop.
- Optional `RuntimeScene.diagnostics()` was added to expose Phase 1 scene metrics through the existing runtime snapshot.
- `SceneAssets` was adapted to use the Phase 0.5 central `resolveAsset()` API. A leading checkpoint `assets/` prefix is normalized before resolution so runtime paths remain rooted exactly once beneath `public/assets`.
- The default route is the Phase 1 benchmark; all preserved Phase 0 browser regressions explicitly use `?scene=calibration`.
- `npm test` now combines the existing core + asset-resolver checks with Phase 1 landscape geometry checks.
- CI retains WebGL2, interactions, lifecycle remount and software WebGPU coverage and adds a separate Phase 1 benchmark browser smoke plus evidence artifact.
- The public-deployment verifier explicitly targets the calibration route, so a future default-scene change cannot silently invalidate the Phase 0.5 deployment baseline.

## Result

Run `35262530231` passed 11/11 Node tests, production build, the complete Phase 0 browser regression suite, software WebGPU and the new Phase 1 WebGL2 benchmark smoke. This establishes successful technical reconciliation, not visual/historical/real-GPU acceptance.

Old PR #8 should remain unmerged. After PR #14 is fully reviewed, #8 may be closed as superseded while retaining its history as an audit source.
