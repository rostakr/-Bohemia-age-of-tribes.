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
  "active_milestone": "PHASE_1_VISUAL_AND_CONTENT_BENCHMARK",
  "phase_1_authorized": true,
  "phase_1_source_pr": 8,
  "phase_1_reconciliation_pr": 14,
  "phase_1_reconciliation_branch": "integrate/phase1-on-phase0_5",
  "phase_1_visual_pass_runtime_sha": "44867f7b847282b47213b14ff2d0b03fcca831b4",
  "phase_1_visual_pass_test_sync_sha": "f90efc1bd60b75e967844bfebc2c4b8f9e6ec4f4",
  "phase_1_status": "VISUAL_PASS_V2_CI_PASS_CONTENT_GATE_BLOCKED_HISTORICAL_REAL_GPU_QA_PENDING",
  "phase_1_visual_blocker_issue": 16,
  "phase_1_content_issue": 17,
  "hosting_strategy": "Vite/GitHub Pages reference build; no Floot migration performed",
  "deployment": {
    "provider": "github_pages",
    "url": "https://rostakr.github.io/-Bohemia-age-of-tribes./",
    "published_milestone": "phase_0_5",
    "status": "passed",
    "deployed_build_sha": "aacc1317504d09832eb6a9eeeab16234e89de7ef",
    "deployment_workflow_run": 35250435890,
    "publishing_mode": "manual_only",
    "phase_1_deployed": false
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
  "phase_1_visual_pass_validation": {
    "workflow_run": 35267593823,
    "result": "passed",
    "node": "24.20.0",
    "npm_ci": "passed; 0 vulnerabilities",
    "typescript": "passed",
    "node_tests": "14/14 passed",
    "production_build": "passed",
    "phase_0_webgl2": "passed",
    "phase_0_interactions": "passed",
    "phase_0_lifecycle_remount": "3/3 cycles passed",
    "phase_0_webgpu": "passed",
    "phase_1_webgl2_benchmark": "passed",
    "phase_1_structures": 1,
    "phase_1_inhabitants": 0,
    "phase_1_trees": 0,
    "phase_1_grass_clumps": 1161,
    "phase_1_draw_calls": 126,
    "phase_1_ci_fps_swiftshader": 15.003750937734413,
    "phase_1_ci_frame_ms_swiftshader": 66.65000000000009,
    "phase_1_evidence_artifact_id": 10517456076,
    "phase_1_evidence_zip_sha256": "5f55bcdb62bd2fc3e7cf131eb324778f7e8a488c26a9a862aff9f8ebedb91300"
  },
  "phase_1_visual_evidence_review": {
    "resolution": "1920x1080",
    "technical_runtime": "passed",
    "environment_v2": "materially_improved",
    "professional_visual_gate": "not_accepted",
    "dominant_blocker": "missing historical settlement/inhabitant/tree production content",
    "remaining_environment_risk": "macro ground repetition in sparse areas",
    "blocking_document": "docs/PHASE_1_VISUAL_QA.md",
    "actual_gpu_review": "pending",
    "historical_review": "pending"
  },
  "phase_1_asset_intake": {
    "dwelling": "integrated_evaluation_candidate_99298_tris_no_lod",
    "storehouse": "missing",
    "workshop": "candidate_rejected_89778_tris_over_budget",
    "worker": "candidate_rejected_texture_projection_failure_14106_tris",
    "trees": "missing",
    "receipt": "assets/source/phase1/TO3D_INTAKE_2026-09-17.md"
  }
}
```

## COMPLETED

- Phase 0 remains complete and accepted.
- Phase 0.5 is complete, verified and deployed. PlayCanvas remains the sole game/render engine; host-neutral lifecycle, fixed-step simulation, central asset resolver and WebGPU/WebGL2 fallback are preserved.
- The stale Phase 1 checkpoint was reconciled onto Phase 0.5 in draft PR #14 rather than merged directly.
- The Phase 1 benchmark uses the Phase 0.5 lifecycle and central resolver. `?scene=calibration` preserves the Phase 0 regression scene.
- The environment visual pass v2 reduced terrain repetition, softened/varied the path, added stream sediment shoulders and shallow/channel water variation, neutralized the palette and reduced meadow noise.
- The final v2 geometry regression test was copied bit-for-bit from the successful child validation PR into the authoritative Phase 1 branch.
- A generic GLB admission checker and generated-asset intake gate now prevent over-budget candidates from being treated as production assets.
- First to3D workshop and worker candidates were structurally inspected and rejected for specific production-quality reasons rather than silently integrated.

## CURRENT REPOSITORY STATE

- `main` remains the verified Phase 0.5 public reference.
- Draft PR #14 / `integrate/phase1-on-phase0_5` is the only authoritative Phase 1 integration line.
- Old PR #8 must not be merged directly; it remains audit/source history only.
- Validation-only PRs #18 and #19 are closed without merge after their evidence/tests were incorporated or recorded.
- Pages remains manual-only and still serves Phase 0.5, not Phase 1.
- Issue #16 tracks remaining environment/professional visual acceptance.
- Issue #17 tracks storehouse/workshop/worker production assets.
- No React/Floot migration has been performed or demonstrated as necessary.

## PHASE 1 CURRENT CONTENT

- 220 m rolling landscape benchmark with stream, worn path, textured terrain and clustered procedural meadow.
- Terrain-aware inspection camera and preset views.
- Three Poly Haven CC0 terrain material sets (9 textures total).
- One rectangular Boii dwelling evaluation candidate.
- Empty admitted slots: storehouse, workshop, inhabitant and tree.
- No navigation, economy, combat, AI or production gameplay systems are accepted by this checkpoint.

## PHASE 1 VISUAL PASS V2

Run `35267593823` is the current visual-pass evidence baseline:

- `npm ci`: PASS, 0 vulnerabilities.
- strict TypeScript: PASS.
- Node tests: **14/14 PASS**.
- production Vite build: PASS.
- Phase 0 WebGL2/fallback/failure UI: PASS.
- Phase 0 interactions: PASS.
- Phase 0 lifecycle remount: PASS, 3/3 cycles.
- Phase 0 software WebGPU: PASS.
- Phase 1 WebGL2 benchmark smoke: PASS.
- Evidence: 1 structure, 0 inhabitants, 0 trees, **1,161 grass clumps**, **126 draw calls**.
- Evidence artifact: `10517456076`, ZIP SHA-256 `5f55bcdb62bd2fc3e7cf131eb324778f7e8a488c26a9a862aff9f8ebedb91300`.

SwiftShader ~15 FPS / ~66.65 ms is CI-only instrumentation, not real-GPU performance evidence.

## ASSET INTAKE STATUS

### Dwelling

Integrated for evaluation only. 99,298 triangles, no LOD, above the 25k–60k brief target. Requires optimization/LOD or replacement and historical review.

### Storehouse

No GLB candidate yet. Target 15k–35k tris.

### Workshop

First to3D candidate visually reads as the correct open shelter but has 89,778 tris. Rejected as-is against the 20k–45k budget. It must be regenerated/decimated cleanly and revalidated.

### Adult worker

First to3D candidate has an efficient 14,106 tris and intact silhouette, but local textured preview exposed severe patchwork/mis-projected texture regions on face/clothing/rear surfaces. Rejected for production. Regenerate for clean texture projection; do not inflate polygon count unnecessarily. Worker intake budget is now 12k–50k tris.

Detailed receipt: `assets/source/phase1/TO3D_INTAKE_2026-09-17.md`.

### Trees

Production Central-European tree assets remain missing.

## CURRENT LIMITS / RISKS

- Professional Phase 1 acceptance remains blocked primarily by missing production content/composition.
- Some macro terrain repetition remains visible in sparse areas and should be reassessed after real buildings/trees are present rather than hidden by more procedural grass.
- Historical acceptance is pending.
- Actual-hardware GPU performance is unmeasured; no 60 FPS claim is supported.
- The dwelling remains over budget and lacks LOD.
- Tree batching/instancing/LOD cannot be finalized before actual tree assets exist.
- Known non-blocking build advisories remain: Vite large-chunk warning and optional PlayCanvas `node:worker_threads` browser-externalization warnings.

## NEXT TASK

Continue Issue #17 first: obtain a clean storehouse, ≤45k-triangle workshop and clean-textured efficient adult worker. Then add production Central-European trees, wire only admitted models into `ADMITTED_MODELS`, target at least 3 structures + ~5 inhabitants, rerun the complete combined CI suite and reassess the professional visual gate. Issue #16 should remain open until that content-filled evidence is reviewed. Do not merge old PR #8 directly.

## PHASE GATE

**PHASE 0: PASS / ACCEPTED.**

**PHASE 0.5: PASS / COMPLETE_VERIFIED / DEPLOYED.**

**PHASE 1: VISUAL PASS V2 CI PASS / CONTENT GATE BLOCKED / PROFESSIONAL VISUAL + HISTORICAL + ACTUAL-GPU QA PENDING.**

**PHASE 2: NOT YET RELEASED BY PHASE 1 ACCEPTANCE.**
