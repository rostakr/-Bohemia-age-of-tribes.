# Project state

```json
{
  "schema_version": 1,
  "project": "BOHEMIA: AGE OF TRIBES",
  "updated": "2026-09-18",
  "engine": "playcanvas@2.22.1",
  "phase_0_status": "COMPLETE_ACCEPTED",
  "phase_0_reference_sha": "17d0e23c6b70fd8cb3a00ebaad79d717e8bea455",
  "phase_0_runtime_sha": "52e4f6a2edb53a5ed833f60a0276cf2e4e8880f8",
  "phase_0_acceptance": "owner-confirmed on 2026-09-17",
  "phase_0_5_status": "COMPLETE_VERIFIED",
  "phase_0_5_pr": 9,
  "phase_0_5_implementation_sha": "5893eef9fdffc38b8d94b373f830b69b8d8300c7",
  "phase_0_5_merge_sha": "1b1b28bbfea91689d22455b117d12f412f5a24c2",
  "active_milestone": "PHASE_1_CONTENT_ART_GATE",
  "phase_1_authorized": true,
  "phase_1_reconciliation_pr": 15,
  "phase_1_superseded_pr": 8,
  "phase_1_merge_sha": "e542bcf48ebe6f79bf08fd2b0a0a9e4441432c62",
  "phase_1_storehouse_pr": 21,
  "phase_1_storehouse_merge_sha": "b7ca7e822c054227aed3bf9510abd2f3ff0a9a76",
  "phase_1_workshop_pr": 25,
  "phase_1_workshop_merge_sha": "2b0e2f522c1a2d09478879a298796141e4305249",
  "phase_1_status": "THREE_STRUCTURE_CONTENT_CHECKPOINT_ART_GATE_OPEN",
  "hosting_strategy": "Vite/GitHub Pages reference build; no Floot migration performed",
  "deployment": {
    "provider": "github_pages",
    "url": "https://rostakr.github.io/-Bohemia-age-of-tribes./",
    "status": "passed",
    "published_content": "verified Phase 0.5 foundation",
    "phase_1_published": false,
    "deployed_build_sha": "aacc1317504d09832eb6a9eeeab16234e89de7ef",
    "deployment_workflow_run": 35250435890,
    "publishing_mode": "manual_only_after_verified_one_time_publish",
    "manual_mode_restore_sha": "850149f1c857f7374cae263a9951b531712baf6b"
  },
  "phase_0_5_validation": {
    "final_pr_workflow_run": 35239053512,
    "post_merge_main_workflow_run": 35249907956,
    "result": "passed",
    "node": "24.20.0",
    "npm_ci": "passed; 0 vulnerabilities",
    "typescript": "passed",
    "node_tests": "9/9 passed",
    "production_build": "passed",
    "webgl2_software_smoke": "passed",
    "automatic_webgpu_to_webgl2_fallback": "passed",
    "failure_ui": "passed",
    "interaction_smoke": "passed",
    "lifecycle_remount_smoke": "3/3 cycles passed",
    "webgpu_software_smoke": "passed"
  },
  "phase_1_reconciliation_validation": {
    "pr_workflow_run": 35263008250,
    "post_merge_main_workflow_run": 35263504724,
    "result": "passed",
    "node": "24.20.0",
    "npm_ci": "passed; 0 vulnerabilities",
    "typescript": "passed",
    "node_tests": "11/11 passed",
    "production_build": "passed",
    "phase_0_webgl2_regression": "passed",
    "phase_0_interaction_regression": "passed",
    "phase_1_lifecycle_remount": "3/3 cycles passed with async GLB/textures",
    "phase_0_webgpu_regression": "passed",
    "phase_1_webgl2_render_smoke": "passed",
    "benchmark_structures": 1,
    "benchmark_inhabitants": 0,
    "benchmark_trees": 0,
    "benchmark_grass_clumps": 4678,
    "benchmark_draw_calls_ci": 124,
    "art_gate_passed": false
  },
  "phase_1_content_validation": {
    "storehouse_post_merge_main_workflow_run": 35284536145,
    "workshop_post_merge_main_workflow_run": 35285571215,
    "result": "passed",
    "npm_ci": "passed; 0 vulnerabilities",
    "typescript": "passed",
    "node_tests": "15/15 passed",
    "production_build": "passed",
    "phase_0_webgl2_regression": "passed",
    "phase_0_interaction_regression": "passed",
    "phase_1_lifecycle_remount": "3/3 cycles passed",
    "phase_0_webgpu_regression": "passed",
    "phase_1_webgl2_render_smoke": "passed",
    "benchmark_structures": 3,
    "benchmark_inhabitants": 0,
    "benchmark_trees": 0,
    "benchmark_grass_clumps": 4678,
    "benchmark_storehouse_triangles": 15550,
    "benchmark_workshop_triangles": 22480,
    "benchmark_draw_calls_ci": 160,
    "art_gate_passed": false
  },
  "production_deployment_validation": {
    "workflow": "Verify published foundation",
    "workflow_run": 35250992614,
    "workflow_merge_sha": "3abb138e98d8134ecf3691a67a14f57c0074077d",
    "result": "passed",
    "cache_busted_hard_refresh": "passed",
    "published_html": "HTTP 200",
    "published_javascript": "HTTP 200",
    "published_css": "HTTP 200",
    "published_webgl2_runtime": "Foundation running"
  }
}
```

## COMPLETED

- Phase 0 remains complete and accepted as the historical foundation baseline.
- Phase 0.5 integration repair is complete, verified and remains the runtime/lifecycle baseline.
- Phase 1 checkpoint reconciliation is complete. PR #15 was merged into `main` as `e542bcf48ebe6f79bf08fd2b0a0a9e4441432c62`; the older pre-Phase-0.5 PR #8 is closed as superseded and must not be merged.
- PlayCanvas remains the sole 3D/gameplay engine and owns the render/game loop. No React/Floot rewrite or duplicate loop was introduced.
- The host-neutral initialize/start/pause/resume/resize/visibility/destroy lifecycle and central asset resolver are preserved.
- Phase 1 assets use the central resolver rather than hardcoded production URLs.
- Async scene teardown is guarded so unmount during texture/GLB loading cannot resurrect a destroyed scene.
- A fresh scene instance is created for every mount/remount.
- Runtime-authoritative diagnostics cannot be overwritten by scene diagnostics.
- Phase 1 currently contains the 220 m Stream Valley terrain, stream, path, procedural meadow, inspection camera, one admitted rectangular Boii dwelling candidate, and explicit project-owned procedural storehouse and workshop WIP candidates.
- Phase 1 reconciliation CI passed 11/11 Node tests, production build, all Phase 0 browser regressions, three Phase 1 async remount cycles, software WebGPU regression and a rendered Phase 1 WebGL2 smoke.
- Storehouse PR #21 and workshop PR #25 are merged. Post-merge `main` validation passed through 15/15 Node tests, all browser/lifecycle regressions, software WebGPU and a rendered three-structure Phase 1 smoke.

## CURRENT REPOSITORY STATE

- `main` contains the verified Phase 0.5 runtime foundation, the reconciled Phase 1 environment checkpoint, and the merged storehouse/workshop content candidates.
- The Phase 1 checkpoint is technically integrated but is not a completed art milestone: runtime diagnostics explicitly report `artGatePassed=false`.
- Current benchmark content: three visible structures (dwelling plus project-owned procedural storehouse/workshop candidates), no inhabitants, no trees, and procedural meadow ground cover. Production GLB slots for storehouse/workshop/inhabitant/tree remain intentionally unfilled.
- The current public GitHub Pages deployment is still the previously verified Phase 0.5 foundation. Phase 1 has not been published through the manual release workflow.
- Floot/React remains unnecessary. If introduced later it must remain a thin host around the PlayCanvas runtime and must not own the game loop.

## PHASE 1 RECONCILIATION EVIDENCE

- PR #15 validation: PASS in workflow run `35263008250`.
- Post-merge `main` validation: PASS in workflow run `35263504724`.
- `npm ci`: PASS; dependency audit reported 0 vulnerabilities.
- Strict TypeScript: PASS.
- Node tests: PASS, 11/11 — fixed-step/telemetry, asset resolver and landscape topology/river/pad checks.
- Production build: PASS with Vite 8.3.0.
- Phase 0 WebGL2 startup/fallback/failure UI regression: PASS.
- Phase 0 interactions (pause/resume, hidden-tab recovery, resize, context loss/restoration, reload): PASS.
- Phase 1 lifecycle remount: PASS for three full unmount/mount cycles with real async texture and GLB loading.
- Phase 0 software WebGPU regression: PASS under Vulkan/SwiftShader.
- Phase 1 rendered WebGL2 smoke: PASS; observed one structure, 4,678 grass clumps and 124 draw calls in the CI evidence capture.
- The rendered screenshot was reviewed as a functioning WIP benchmark. It confirms the dwelling, path, meadow and stream are present; it does not satisfy the visual/historical art gate.

These graphics checks establish integration/runtime correctness in software-backed CI. They are not an actual-hardware GPU performance certification and the CI FPS values are not a production performance target.

## CURRENT LIMITS / RISKS

- `artGatePassed=false`: the Phase 1 visual benchmark is incomplete.
- Missing benchmark content is now concentrated in suitable south/central Bohemian deciduous trees/forest composition and five readable Boii inhabitants.
- The current dwelling, storehouse and workshop candidates still require visual, historical and actual-hardware performance acceptance; none has a production LOD.
- Terrain, stream banks, vegetation distribution, lighting/material balance and settlement composition need production art polish after the missing object classes exist.
- Actual-hardware GPU performance remains unmeasured.
- Known non-blocking build advisories remain: Vite large-chunk advisory and optional PlayCanvas `node:worker_threads` browser-externalization warnings.

## NEXT TASK

Continue Phase 1 content production. Prioritize the remaining visible benchmark objects before adding new gameplay systems: (1) a suitable central-European deciduous tree/vegetation set, then (2) five readable Boii inhabitants. Keep provenance/receipts for every candidate/admitted asset, preserve lifecycle remount safety, and rerun the complete regression suite and rendered Phase 1 smoke. After all required content exists, perform visual/historical review and actual-hardware performance/LOD QA before setting `artGatePassed=true`.

## PHASE GATE

**PHASE 0: PASS / ACCEPTED.**

**PHASE 0.5: PASS / COMPLETE_VERIFIED / DEPLOYED.**

**PHASE 1: AUTHORIZED / TECHNICAL CHECKPOINT INTEGRATED / ART GATE OPEN.**
