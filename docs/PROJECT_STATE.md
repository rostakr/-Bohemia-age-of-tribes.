# Project state

```json
{
  "schema_version": 1,
  "project": "BOHEMIA: AGE OF TRIBES",
  "updated": "2026-09-17",
  "engine": "playcanvas@2.22.1",
  "phase_0_status": "COMPLETE_ACCEPTED",
  "phase_0_reference_main_sha": "17d0e23c6b70fd8cb3a00ebaad79d717e8bea455",
  "phase_0_runtime_sha": "52e4f6a2edb53a5ed833f60a0276cf2e4e8880f8",
  "phase_0_acceptance": "owner-confirmed on 2026-09-17",
  "active_milestone": "PHASE_0_5_INTEGRATION_REPAIR",
  "phase_0_5_status": "CI_PASS_EXTERNAL_QA_PENDING",
  "phase_0_5_branch": "repair/integration-phase-0",
  "phase_0_5_pr": 9,
  "phase_0_5_validated_source_sha": "5893eef9fdffc38b8d94b373f830b69b8d8300c7",
  "phase_1_authorized": true,
  "phase_1_pr": 8,
  "phase_1_status": "CHECKPOINT_HELD_PENDING_PHASE_0_5_GATE",
  "hosting_strategy": "Vite/GitHub Pages reference build; no Floot migration performed",
  "deployment": {
    "provider": "github_pages",
    "url": "https://rostakr.github.io/-Bohemia-age-of-tribes./",
    "reference_branch": "main",
    "reference_status": "passed",
    "repair_branch_deployed": false
  },
  "latest_phase_0_5_validation": {
    "workflow_run": 35238771869,
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
    "webgpu_software_smoke": "passed",
    "build_artifact_id": 10504881909,
    "webgl2_evidence_artifact_id": 10504782012
  }
}
```

## COMPLETED

- Phase 0 remains complete and accepted on the untouched `main` reference.
- Phase 0.5 repair has separated the PlayCanvas runtime from the standalone DOM host without changing engine ownership or the fixed-step simulation model.
- The runtime now exposes explicit initialize/start/pause/resume/resize/visibility/destroy lifecycle operations suitable for the current Vite host and a future thin host integration.
- Browser lifecycle ownership (DOM controls, window resize, document visibility and page lifecycle) is contained in `src/main.ts`; PlayCanvas continues to own rendering and the engine update loop.
- Failed initialization now also aborts that mount's host event listeners before releasing the runtime reference, preventing duplicated shell listeners on a later mount.
- A central asset resolver maps logical asset paths beneath `public/assets` while respecting relative, subpath and injected-host deployment bases.
- CI run `35238771869` passed static validation, existing browser regressions, a three-cycle unmount/remount test and software WebGPU validation on final implementation SHA `5893eef9fdffc38b8d94b373f830b69b8d8300c7`.

## CURRENT REPOSITORY STATE

- `main` remains the accepted Phase 0 reference at `17d0e23c6b70fd8cb3a00ebaad79d717e8bea455`; the repair has not overwritten it.
- Draft PR #9 contains the Phase 0.5 integration repair and remains pending independent QA/merge review.
- PR #8 contains the separate Phase 1 environment checkpoint. It must not bypass the Phase 0.5 infrastructure gate; after Phase 0.5 acceptance it should be rebased or otherwise integrated against the accepted repair baseline before Phase 1 acceptance work resumes.
- Floot/React was not introduced because the current Vite/GitHub Pages route is already functional. If Floot is later required, it should be a thin host that supplies the canvas and calls the host-neutral PlayCanvas lifecycle API; it must not own the game loop.

## PHASE 0.5 VALIDATION EVIDENCE

- `npm ci`: passed, 21 packages installed, 0 vulnerabilities.
- `npm run typecheck`: passed under strict TypeScript.
- `npm test`: 9/9 passed, consisting of the five existing fixed-step/telemetry tests and four asset-resolver tests.
- `npm run build`: passed with Vite 8.3.0.
- `npm run smoke:webgl2`: passed in Chrome 152 software rendering, including automatic WebGPU-to-WebGL2 fallback and explicit renderer-failure UI.
- `npm run smoke:interactions`: passed pause/resume, hidden-tab behavior, resize, WebGL context loss/restoration and repeated reload checks.
- `npm run smoke:lifecycle`: passed three full unmount/mount cycles on the same host canvas with no failed/device-lost/destroyed final state.
- `npm run smoke:webgpu`: passed using Vulkan SwiftShader and reported renderer `webgpu`.

These CI renderer results demonstrate browser/runtime correctness in software-backed CI. They are not an actual-hardware GPU performance certification and must not be interpreted as a 60 FPS claim.

## CURRENT LIMITS / RISKS

- Actual-hardware GPU performance and visual acceptance remain outside this Phase 0.5 CI evidence.
- Known non-blocking build advisories remain: the Vite large-chunk advisory and optional PlayCanvas `node:worker_threads` browser-externalization warnings.
- The repair branch is not separately deployed. The existing GitHub Pages deployment from accepted `main` remains the reference public deployment until the repair is accepted and merged.
- Phase 1 art, terrain, units and RTS systems are not part of this repair gate.

## NEXT TASK

Independent QA should inspect PR #9 and its final CI result. If accepted, merge the Phase 0.5 repair without force-pushing `main`. Then rebase/port the Phase 1 checkpoint onto the accepted Phase 0.5 baseline and resume Phase 1 implementation/QA from that foundation.

## PHASE GATE

**PHASE 0: PASS / ACCEPTED.**

**PHASE 0.5: IMPLEMENTED / CI PASS / EXTERNAL QA PENDING.**

**PHASE 1: AUTHORIZED / CHECKPOINT PRESENT / HELD BEHIND PHASE 0.5 GATE.**
