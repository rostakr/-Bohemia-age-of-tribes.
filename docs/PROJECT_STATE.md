# Project state

```json
{
  "schema_version": 1,
  "project": "BOHEMIA: AGE OF TRIBES",
  "updated": "2026-09-17",
  "main_sha_before_this_state_update": "1d2257fb6b377f1f8a48c2bbf3c7e36b974ba604",
  "phase_0_runtime_sha": "52e4f6a2edb53a5ed833f60a0276cf2e4e8880f8",
  "phase_0_status": "COMPLETE_ACCEPTED",
  "phase_0_acceptance": "owner-confirmed on 2026-09-17",
  "active_milestone": "PHASE_0_COMPLETE_AWAITING_PHASE_1_AUTHORIZATION",
  "next_phase_authorized": false,
  "engine": "playcanvas@2.22.1",
  "deployment": {
    "provider": "github_pages",
    "url": "https://rostakr.github.io/-Bohemia-age-of-tribes./",
    "workflow_run": 35214332852,
    "artifact_id": 10494373413,
    "status": "passed"
  },
  "latest_validation": {
    "run": 35224575573,
    "result": "passed",
    "npm_ci": "passed",
    "typescript": "passed",
    "focused_node_tests": "5/5 passed",
    "production_build": "passed",
    "webgl2_software_smoke": "passed",
    "interaction_smoke": "passed",
    "webgpu_software_smoke": "passed"
  },
  "hardware_acceptance_note": "Accepted by project owner. Detailed browser/OS/GPU/FPS measurements were not supplied in chat and are not fabricated here."
}
```

## COMPLETED

- Phase 0 package integrated into the correct repository without starting Phase 1.
- Strict TypeScript/Vite/PlayCanvas foundation, fixed-step timing, telemetry, renderer bootstrap, calibration scene and lifecycle handling integrated.
- CI covers typecheck, 5 focused tests, production build, forced software WebGL2, fallback/failure UI, pause/resume, visibility path, resize, context loss/restore, repeated reload and software WebGPU.
- Reviewed Phase 0 artifact is deployed over HTTPS at `https://rostakr.github.io/-Bohemia-age-of-tribes./`.
- Project owner explicitly accepted the remaining Phase 0 hardware gate on 2026-09-17.

## CURRENT BUGS

- No known P0/P1 Phase 0 defect.
- Known non-blocking build advisories remain: Vite large-chunk advisory and optional PlayCanvas worker externalization warnings.

## CURRENT PERFORMANCE

- Software CI proves functional renderer paths only; it is not a hardware performance benchmark.
- No hardware FPS/frame-time figures are recorded in this document because none were supplied explicitly.

## CURRENT VISUAL QA

- Calibration scene and renderer diagnostics passed automated smoke coverage.
- Phase 0 visual/hardware acceptance is owner-confirmed.

## NEXT TASK

- Phase 1 is intentionally NOT authorized yet.
- Do not implement terrain, RTS camera, navigation, selection, economy, combat, AI, fog, trade, production art or other Phase 1 systems until explicitly authorized.
- No Astra task is currently justified; use Astra only if the next authorized milestone contains a genuinely difficult senior implementation problem.

## RELEVANT FILES

- `docs/HANDOFF_PHASE_0.md`
- `docs/PHASE_0_BROWSER_QA.md`
- `docs/ARCHITECTURE.md`
- `docs/ART_BIBLE.md`
- `docs/ASSET_MANIFEST.md`
- `.github/workflows/validate.yml`
- `.github/workflows/deploy-pages.yml`
- `src/`

## PHASE GATE

**PHASE 0: PASS / ACCEPTED.**

**PHASE 1: NOT AUTHORIZED.**
