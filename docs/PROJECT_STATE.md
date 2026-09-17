# Project state

```json
{
  "schema_version": 1,
  "project": "BOHEMIA: AGE OF TRIBES",
  "updated": "2026-09-17",
  "engine": "playcanvas@2.22.1",
  "phase_0_status": "COMPLETE_ACCEPTED",
  "phase_0_reference_sha": "17d0e23c6b70fd8cb3a00ebaad79d717e8bea455",
  "phase_0_runtime_sha": "52e4f6a2edb53a5ed833f60a0276cf2e4e8880f8",
  "phase_0_acceptance": "owner-confirmed on 2026-09-17",
  "phase_0_5_status": "COMPLETE_VERIFIED",
  "phase_0_5_pr": 9,
  "phase_0_5_merge_sha": "1b1b28bbfea91689d22455b117d12f412f5a24c2",
  "phase_0_5_final_state_sha": "1a080e9bced13c13dbf73e47e45279569ac54a5f",
  "active_milestone": "PHASE_1_QA_CHECKPOINT",
  "phase_1_authorized": true,
  "phase_1_source_pr": 8,
  "phase_1_reconciliation_pr": 14,
  "phase_1_reconciliation_branch": "integrate/phase1-on-phase0_5",
  "phase_1_validated_runtime_sha": "6ad76483cde4e2cf5c18e41c930af8cd347573f1",
  "phase_1_status": "RECONCILED_CI_PASS_VISUAL_HISTORICAL_REAL_GPU_QA_PENDING",
  "hosting_strategy": "Vite/GitHub Pages reference build; no Floot migration performed",
  "deployment": {
    "provider": "github_pages",
    "url": "https://rostakr.github.io/-Bohemia-age-of-tribes./",
    "published_milestone": "phase_0_5",
    "status": "passed",
    "deployed_build_sha": "aacc1317504d09832eb6a9eeeab16234e89de7ef",
    "deployment_workflow_run": 35250435890,
    "publishing_mode": "manual_only",
    "phase_1_reconciliation_deployed": false
  },
  "production_deployment_validation": {
    "workflow": "Verify published foundation",
    "workflow_run": 35250992614,
    "result": "passed",
    "cache_busted_hard_refresh": "passed",
    "published_html": "HTTP 200",
    "published_javascript": "HTTP 200",
    "published_css": "HTTP 200",
    "published_webgl2_runtime": "Foundation running"
  },
  "phase_1_reconciliation_validation": {
    "workflow_run": 35262530231,
    "result": "passed",
    "node": "24.20.0",
    "npm_ci": "passed; 0 vulnerabilities",
    "typescript": "passed",
    "node_tests": "11/11 passed",
    "production_build": "passed",
    "phase_0_webgl2": "passed",
    "phase_0_interactions": "passed",
    "phase_0_lifecycle_remount": "3/3 cycles passed",
    "phase_0_webgpu": "passed",
    "phase_1_webgl2_benchmark": "passed",
    "phase_1_structures": 1,
    "phase_1_inhabitants": 0,
    "phase_1_trees": 0,
    "phase_1_grass_clumps": 4678,
    "phase_1_draw_calls": 124,
    "phase_1_ci_fps_swiftshader": 15.003750937734413,
    "phase_1_ci_frame_ms_swiftshader": 66.65000000000009,
    "static_build_artifact_id": 10515331207,
    "phase_0_evidence_artifact_id": 10515136710,
    "phase_1_evidence_artifact_id": 10515106681
  }
}
```

## COMPLETED

- Phase 0 remains complete and accepted as the historical foundation baseline.
- Phase 0.5 is complete, verified, deployed and documented. PlayCanvas remains the sole game/render engine; the host-neutral lifecycle, central asset resolver, fixed-step simulation and WebGPU/WebGL2 paths are preserved.
- The old Phase 1 checkpoint from PR #8 has been reconstructed on a fresh branch from verified Phase 0.5 rather than merged over it.
- The exact checkpoint binary assets were reused by Git blob SHA, including the 5.6 MB dwelling GLB and nine terrain texture maps.
- The Phase 1 benchmark is now integrated with the Phase 0.5 lifecycle. The default route renders the benchmark; `?scene=calibration` preserves the Phase 0 reference scene.
- Phase 1 scene assets load through the central `resolveAsset()` pipeline rather than bypassing it with scattered base-URL concatenation.
- Scene diagnostics are exposed through the existing `GameRuntime.snapshot()` without transferring browser event or game-loop ownership into scene code.
- CI run `35262530231` passed strict TypeScript, 11/11 Node tests, production build, all Phase 0 browser regressions, software WebGPU and the Phase 1 benchmark WebGL2 smoke.
- The Phase 1 smoke successfully rendered one dwelling and the terrain/meadow scene and produced a screenshot evidence artifact.

## CURRENT REPOSITORY STATE

- `main` remains the verified Phase 0.5 reference and public deployment source.
- Draft PR #14 is the authoritative Phase 1 reconciliation candidate. Its first validated runtime head is `6ad76483cde4e2cf5c18e41c930af8cd347573f1`.
- Draft PR #8 is stale relative to Phase 0.5 and must not be merged directly. It remains useful only as the source/audit history for the checkpoint until PR #14 is accepted or superseded.
- The public GitHub Pages URL still serves the verified Phase 0.5 release. Phase 1 has not been promoted to the public reference deployment.
- Pages publishing remains manual-only.
- No React/Floot migration has been performed or demonstrated as necessary.

## PHASE 1 CHECKPOINT CONTENT

- 220 m rolling landscape study with stream, earth path, textured terrain and procedural meadow.
- Terrain-aware inspection camera with orbit/pan/zoom and preset views.
- Three Poly Haven CC0 terrain material sets (9 textures total).
- One generated rectangular Boii dwelling candidate.
- Missing production model slots: storehouse, workshop, inhabitant and tree.
- No navigation, economy, combat, AI or production gameplay systems are accepted by this checkpoint.

## PHASE 1 VALIDATION EVIDENCE

- `npm ci`: PASS; 0 vulnerabilities reported.
- `npm run typecheck`: PASS.
- `npm test`: **11/11 PASS**, combining fixed-step/telemetry, asset resolver and landscape geometry tests.
- `npm run build`: PASS with Vite 8.3.0.
- Phase 0 WebGL2/fallback/failure UI: PASS.
- Phase 0 interactions: PASS.
- Phase 0 lifecycle remount: PASS, 3/3 cycles.
- Phase 0 software WebGPU: PASS.
- Phase 1 WebGL2 benchmark browser smoke: PASS.
- Phase 1 evidence capture reported 1 structure, 0 inhabitants, 0 trees, 4,678 grass clumps and 124 draw calls.
- Software SwiftShader capture reported ~15.0 FPS / ~66.65 ms frame time. This is CI instrumentation only and is not an actual-hardware performance result.
- Phase 1 screenshot evidence: artifact `10515106681` from workflow run `35262530231`.

## CURRENT LIMITS / RISKS

- Phase 1 has not passed historical or visual acceptance.
- Actual-hardware GPU performance is unmeasured; no 60 FPS claim is supported.
- The current dwelling candidate has 99,298 triangles and no LOD, exceeding its 25k–60k asset-brief target. Optimization or replacement is required before production acceptance.
- Storehouse, workshop, inhabitants and trees are still absent.
- Vegetation batching/instancing/LOD cannot be finalized before actual tree assets exist.
- Known non-blocking build advisories remain: Vite large-chunk warning and optional PlayCanvas `node:worker_threads` browser-externalization warnings.
- PR #14 is not deployed; the live Pages verification continues to cover the Phase 0.5 calibration release.

## NEXT TASK

Review the Phase 1 screenshot evidence and perform targeted visual QA. Then validate the checkpoint on an actual GPU, perform historical review of the dwelling, decide whether to optimize or replace it, and acquire/integrate the missing Phase 1 model slots through approved free/noncommercial routes. Keep the full Phase 0 regression suite green after every change. Do not merge old PR #8 directly.

## PHASE GATE

**PHASE 0: PASS / ACCEPTED.**

**PHASE 0.5: PASS / COMPLETE_VERIFIED / DEPLOYED.**

**PHASE 1: RECONCILED / CI PASS / VISUAL + HISTORICAL + ACTUAL-GPU QA PENDING.**

**PHASE 2: NOT YET RELEASED BY PHASE 1 ACCEPTANCE.**
