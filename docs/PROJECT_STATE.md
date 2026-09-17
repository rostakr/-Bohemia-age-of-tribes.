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
  "active_milestone": "PHASE_1_INTEGRATION_RECONCILIATION",
  "phase_0_5_status": "COMPLETE_VERIFIED",
  "phase_0_5_pr": 9,
  "phase_0_5_implementation_sha": "5893eef9fdffc38b8d94b373f830b69b8d8300c7",
  "phase_0_5_merge_sha": "1b1b28bbfea91689d22455b117d12f412f5a24c2",
  "phase_1_authorized": true,
  "phase_1_pr": 8,
  "phase_1_status": "CHECKPOINT_REQUIRES_RECONCILIATION_WITH_PHASE_0_5",
  "hosting_strategy": "Vite/GitHub Pages reference build; no Floot migration performed",
  "deployment": {
    "provider": "github_pages",
    "url": "https://rostakr.github.io/-Bohemia-age-of-tribes./",
    "status": "passed",
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
- Phase 0.5 integration repair is complete and objectively verified. PR #9 was merged without force-pushing `main`.
- PlayCanvas remains the primary 3D/gameplay engine and owns the engine/render loop; no React/Floot rewrite or duplicate loop was introduced.
- The runtime exposes explicit initialize/start/pause/resume/resize/visibility/destroy lifecycle operations and can be remounted repeatedly without a page reload.
- Browser/DOM lifecycle ownership remains in `src/main.ts`; the PlayCanvas runtime is no longer coupled to a specific HTML layout.
- Failed initialization cleans up the failed mount's host listeners before the runtime reference is released.
- Logical runtime assets are resolved centrally beneath `public/assets` with relative/subpath/injected-host base support.
- Final repair CI passed static validation, 9/9 Node tests, production build, WebGL2/fallback/failure UI, interactions, 3/3 remount cycles and software WebGPU.
- The repaired foundation was published through the reviewed GitHub Pages workflow. GitHub reported deployment success for build `aacc1317504d09832eb6a9eeeab16234e89de7ef` at `https://rostakr.github.io/-Bohemia-age-of-tribes./`.
- A separate production smoke then fetched the public page twice with cache busting/no-cache, verified the published JS/CSS resources with HTTP 200, and launched headless Chrome against the public URL until the PlayCanvas diagnostics reached `WEBGL2 · Foundation running`.
- The temporary deployment bootstrap trigger was removed after the successful publish; Pages publishing is manual-only again.

## CURRENT REPOSITORY STATE

- `main` now contains the verified Phase 0.5 integration foundation plus its repeatable public deployment smoke workflow.
- PR #9 (Phase 0.5 repair), PR #10 (one-time Pages bootstrap), PR #11 (restore manual-only publishing) and PR #12 (production Pages smoke) have served their integration/QA purpose.
- PR #8 remains a draft Phase 1 environment checkpoint created from the pre-Phase-0.5 baseline. It is not ready to merge directly because its base predates the lifecycle/asset-resolution repair and GitHub currently reports it non-mergeable.
- Phase 1 may now resume, but only by reconciling its checkpoint onto the verified Phase 0.5 baseline without discarding either set of work.
- Floot/React remains unnecessary for the current deployment. If introduced later, it must be a thin host around the existing PlayCanvas runtime and must not own the game loop.

## PHASE 0.5 VALIDATION EVIDENCE

- `npm ci`: PASS; dependency audit reported 0 vulnerabilities in the verified repair runs.
- `npm run typecheck`: PASS under strict TypeScript.
- `npm test`: PASS, 9/9 tests — five fixed-step/telemetry tests plus four asset resolver tests.
- `npm run build`: PASS with Vite 8.3.0.
- `npm run smoke:webgl2`: PASS, including resize, automatic fallback and explicit total-renderer-failure UI.
- `npm run smoke:interactions`: PASS for pause/resume, hidden-tab behavior, resize, WebGL context loss/restoration and reload regression.
- `npm run smoke:lifecycle`: PASS for three full unmount/mount cycles on the same canvas.
- `npm run smoke:webgpu`: PASS under software Vulkan/SwiftShader.
- Post-merge validation on `main`: PASS in workflow run `35249907956`.
- GitHub Pages deployment: PASS in workflow run `35250435890`.
- Public production smoke: PASS in workflow run `35250992614`.
- Published JS observed by production smoke: `assets/index-CZ4eO7z7.js` — HTTP 200.
- Published CSS observed by production smoke: `assets/index-BjnsYadS.css` — HTTP 200.
- Public WebGL2 browser state: `WEBGL2 · Foundation running`.

These graphics checks establish runtime, fallback, lifecycle and deployment correctness in software-backed CI. They are not an actual-hardware GPU performance certification and do not establish a 60 FPS Phase 1 performance target.

## CURRENT LIMITS / RISKS

- Actual-hardware GPU performance and Phase 1 visual/historical acceptance remain separate QA tasks.
- Known non-blocking build advisories remain: the Vite large-chunk advisory and optional PlayCanvas `node:worker_threads` browser-externalization warnings.
- Phase 0.5 intentionally does not implement terrain, navigation, economy, combat, AI or production game content.
- Phase 1 PR #8 contains useful checkpoint work but must be reconciled with the newer runtime/lifecycle/asset resolver before acceptance.

## NEXT TASK

Reconcile Phase 1 PR #8 onto the verified Phase 0.5 baseline. Preserve the Phase 0.5 runtime contract and central asset resolver, port the Phase 1-specific environment/assets/smoke coverage, resolve overlapping bootstrap/runtime/workflow changes explicitly, then run the complete Phase 0 regression suite plus the Phase 1 benchmark smoke before any Phase 1 merge decision.

## PHASE GATE

**PHASE 0: PASS / ACCEPTED.**

**PHASE 0.5: PASS / COMPLETE_VERIFIED / DEPLOYED.**

**PHASE 1: AUTHORIZED / CHECKPOINT PRESENT / RECONCILIATION REQUIRED BEFORE QA ACCEPTANCE.**
