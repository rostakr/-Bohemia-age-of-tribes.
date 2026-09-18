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
  "phase_1_tree_pr": 29,
  "phase_1_tree_merge_sha": "89c482e99452a125757b26a37dde4622efddb0ee",
  "phase_1_inhabitant_pr": 33,
  "phase_1_inhabitant_merge_sha": "58e67913ef906cb2c077d90c1afbf900c3172b7f",
  "phase_1_status": "BENCHMARK_CONTENT_CLASSES_PRESENT_ART_GATE_OPEN",
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
    "tree_post_merge_main_workflow_run": 35293965484,
    "inhabitant_post_merge_main_workflow_run": 35336308622,
    "result": "passed",
    "npm_ci": "passed; 0 vulnerabilities",
    "typescript": "passed",
    "node_tests": "19/19 passed",
    "production_build": "passed",
    "phase_0_webgl2_regression": "passed",
    "phase_0_interaction_regression": "passed",
    "phase_1_lifecycle_remount": "3/3 cycles passed",
    "phase_0_webgpu_regression": "passed",
    "phase_1_webgl2_render_smoke": "passed",
    "benchmark_structures": 3,
    "benchmark_inhabitants": 5,
    "benchmark_trees": 32,
    "benchmark_grass_clumps": 4678,
    "benchmark_storehouse_triangles": 15550,
    "benchmark_workshop_triangles": 22480,
    "benchmark_tree_triangles": 15980,
    "benchmark_inhabitant_triangles": 1404,
    "benchmark_draw_calls_ci": 307,
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
- Phase 1 checkpoint reconciliation is complete. PR #15 was merged into `main` as `e542bcf48ebe6f79bf08fd2b0a0a9e4441432c62`; the older pre-Phase-0.5 PR #8 is superseded and must not be merged.
- PlayCanvas remains the sole 3D/gameplay engine and owns the render/game loop. No React/Floot rewrite or duplicate loop was introduced.
- The host-neutral initialize/start/pause/resume/resize/visibility/destroy lifecycle and central asset resolver are preserved.
- Phase 1 assets use the central resolver rather than hardcoded production URLs.
- Async scene teardown is guarded so unmount during texture/GLB loading cannot resurrect a destroyed scene.
- A fresh scene instance is created for every mount/remount.
- Runtime-authoritative diagnostics cannot be overwritten by scene diagnostics.
- The benchmark now contains every required Phase 1 content class: the 220 m Stream Valley terrain, stream, path, procedural meadow, inspection camera, rectangular Boii dwelling candidate, project-owned storehouse/workshop WIP candidates, 32 project-owned deciduous-tree instances and five project-owned low-poly inhabitant readability prototypes.
- Storehouse PR #21, workshop PR #25, tree PR #29 and reconciled inhabitant PR #33 are merged.
- Latest post-merge `main` validation run `35336308622` passed 19/19 Node tests, production build, all Phase 0 browser/lifecycle regressions, software WebGPU and the rendered Phase 1 WebGL2 smoke.
- Alternative forest PR #28 and its stacked inhabitant PR #30 were closed without merge after their useful inhabitant-specific work was reconciled in PR #33.

## CURRENT REPOSITORY STATE

- `main` contains the verified Phase 0.5 runtime foundation and the complete set of Phase 1 benchmark content classes.
- The Phase 1 benchmark is technically integrated but is not a completed art milestone: runtime diagnostics explicitly report `artGatePassed=false`.
- Current benchmark content: three visible structures, five static inhabitant readability prototypes, 32 shared-mesh deciduous-tree instances and procedural meadow ground cover around the stream/path environment.
- Production GLB slots for storehouse, workshop, inhabitant and tree remain intentionally unfilled. The procedural candidates are explicit WIP content and are not represented as admitted final production assets.
- The current public GitHub Pages deployment is still the previously verified Phase 0.5 foundation. Phase 1 has not been published through the manual release workflow.
- Floot/React remains unnecessary. If introduced later it must remain a thin host around the PlayCanvas runtime and must not own the game loop.

## PHASE 1 CURRENT CONTENT EVIDENCE

- Latest post-merge `main` validation: PASS in workflow run `35336308622` on merge SHA `58e67913ef906cb2c077d90c1afbf900c3172b7f`.
- `npm ci`: PASS; dependency audit reported 0 vulnerabilities.
- Strict TypeScript: PASS.
- Node tests: PASS, 19/19.
- Production build: PASS with Vite 8.3.0.
- Phase 0 WebGL2 startup/fallback/failure UI regression: PASS.
- Phase 0 interactions (pause/resume, hidden-tab recovery, resize, context loss/restoration, reload): PASS.
- Phase 1 lifecycle remount: PASS for three full unmount/mount cycles with the complete current benchmark content.
- Phase 0 software WebGPU regression: PASS under Vulkan/SwiftShader.
- Phase 1 rendered WebGL2 smoke: PASS; observed three structures, five inhabitants, 32 trees, 4,678 grass clumps and 307 draw calls in the CI evidence capture.
- Storehouse candidate: 15,550 triangles.
- Workshop candidate: 22,480 triangles.
- Deciduous-tree candidate: 15,980 triangles per shared candidate mesh, 32 runtime instances.
- Inhabitant readability prototype: 1,404 triangles / 910 vertices, approximately 1.717 m high, shared across five static entities.
- The inhabitant prototype is deliberately below the production `boii_adult_worker.glb` request of 25k–50k triangles with one 2K atlas. It proves scale/readability only and must not be treated as satisfying the production character brief.

These graphics checks establish integration/runtime correctness in software-backed CI. They are not actual-hardware GPU performance certification and the CI FPS/frame-time values are not production performance targets.

## CURRENT LIMITS / RISKS

- `artGatePassed=false`: all benchmark content classes exist, but production art acceptance is not complete.
- The current inhabitant is only a low-poly static readability prototype. A production adult worker candidate matching the 25k–50k triangle / 2K atlas brief remains required before character art acceptance; rig/animation is optional for this milestone but remains desirable for later gameplay.
- The dwelling candidate still requires final visual/historical and actual-hardware performance acceptance.
- Storehouse and workshop are project-owned procedural WIP candidates; their production-model/LOD strategy and final historical/visual acceptance remain open.
- The deciduous tree is a project-owned composition candidate; botanical acceptance, lower-detail LOD implementation and actual-hardware performance thresholds remain open.
- Terrain, stream banks, path edges, vegetation distribution, lighting/material balance and settlement composition still need production art polish.
- Actual-hardware GPU performance for the complete Phase 1 benchmark remains unmeasured.
- Known non-blocking build advisories remain: Vite large-chunk advisory and optional PlayCanvas `node:worker_threads` browser-externalization warnings.

## NEXT TASK

Move from content-class completion to the Phase 1 art/acceptance gate. Priorities:

1. Replace or upgrade the inhabitant readability prototype with a production adult-worker candidate matching the documented 25k–50k triangle / 2K atlas brief while preserving five-instance settlement readability.
2. Perform historical/visual review of dwelling, storehouse, workshop and inhabitant content, plus botanical review of the deciduous-tree candidate.
3. Perform an actual desktop-GPU 1080p benchmark of the complete scene before selecting useful LOD thresholds.
4. Implement and validate the required tree/building LOD strategy based on measured hardware evidence rather than software-CI FPS.
5. Polish stream banks, path edges, vegetation distribution, lighting/material balance and settlement composition.
6. Set `artGatePassed=true` only after those gates are explicitly satisfied.

Do not begin large economy/combat/AI production systems merely because all visual content classes are now present; complete or explicitly waive the Phase 1 art/acceptance gate first.

## PHASE GATE

**PHASE 0: PASS / ACCEPTED.**

**PHASE 0.5: PASS / COMPLETE_VERIFIED / DEPLOYED.**

**PHASE 1: AUTHORIZED / ALL BENCHMARK CONTENT CLASSES PRESENT / ART GATE OPEN.**
