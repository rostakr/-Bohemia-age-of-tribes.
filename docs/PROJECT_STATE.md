# Project state

```json
{
  "schema_version": 1,
  "project": "BOHEMIA: AGE OF TRIBES",
  "updated": "2026-09-17",
  "validated_phase_0_main_sha": "fe7933aff631a1bb7d103268238a1d13e19bb598",
  "phase_0_import_sha": "5decba22ee42f55de3430cb367663a776fb6f37d",
  "integration_pr": 1,
  "browser_smoke_pr": 2,
  "browser_smoke_source_sha": "38f9ada32c5a3388a01a8a682e8b401481e1fc77",
  "active_milestone": "PHASE_0_FOUNDATION",
  "status": "phase_0_integrated_ci_webgl2_passed_awaiting_hardware_gpu_qa",
  "engine": "playcanvas@2.22.1",
  "next_phase_authorized": false,
  "deployment": null,
  "latest_qa": {
    "github_actions": "passed: Phase 0 integration and browser-smoke PR runs",
    "npm_ci": "passed on Node 24.20.0",
    "typescript": "passed",
    "focused_node_tests": "5/5 passed locally and in CI",
    "production_build": "passed in CI",
    "static_root_path": "passed: HTTP 200, relative assets present",
    "static_nested_path": "passed: /bohemia/ HTTP 200, relative assets present",
    "license_notice": "passed: served at root and nested path",
    "webgl2_ci_software": "passed: GitHub Actions run 35197836188, Chrome 152.0.7977.82, ANGLE SwiftShader",
    "webgl2_ci_evidence": "passed: visible floor and marker, renderer webgl2, tick advanced, failed=false, deviceLost=false, 1920x1080 screenshot artifact",
    "webgpu_hardware": "unverified",
    "webgl2_hardware": "unverified",
    "automatic_fallback": "unverified",
    "device_loss_recovery": "unverified",
    "gpu_performance": "not_measured"
  }
}
```

## Completed systems

- Correct repository resolved as `rostakr/-Bohemia-age-of-tribes.` and the Phase 0 package integrated through PR #1 without starting Phase 1.
- Phase 0 integration was squash-merged to `main` at `fe7933aff631a1bb7d103268238a1d13e19bb598` after successful PR validation.
- Strict TypeScript ES modules; pinned npm dependencies and lockfile; Vite relative-base static build.
- PlayCanvas device bootstrap: WebGPU preference, WebGL2 fallback and forced compatibility URL.
- Application/scene ownership, disposal on HMR/unload, viewport resize and capped pixel ratio.
- 20 Hz engine-independent timing, bounded catch-up, pause/resume and hidden-tab timing reset.
- Typed future command/resource/culture/terrain contracts; commands do not execute yet.
- Bounded frame/simulation telemetry and visible startup/runtime error panel.
- Static 20 m calibration floor and 1.8 m marker; no production art.
- GitHub Actions validation and manual-only Pages deployment workflows integrated.
- Asset categories and provenance/rights gate; project/art/architecture documents integrated.
- Repeatable Phase 0 WebGL2 browser smoke added in PR #2 using runner Chrome + ANGLE SwiftShader; no gameplay or Phase 1 systems are introduced.

## QA evidence

- GitHub Actions Phase 0 integration validation passed on Ubuntu 24.04 with Node 24.20.0 and npm 11.19.0.
- `npm ci` installs the pinned dependency set and reports 0 vulnerabilities.
- `npm run validate` passes strict TypeScript, all 5 focused Node tests, and the Vite production build.
- Build output remains approximately 2.03 MB minified / 520.79 kB gzip plus source map; the known Vite chunk-size advisory remains.
- PlayCanvas optional worker paths continue to emit the documented `node:worker_threads` browser-externalization warnings; Phase 0 does not invoke those optional paths.
- Static HTTP checks passed at `/` and `/bohemia/`; generated HTML uses relative JS/CSS paths and the PlayCanvas MIT notice is served.
- Local browser automation remains blocked by environment policy on localhost; this is not treated as a runtime failure.
- GitHub Actions run `35197836188` executed the production build in Google Chrome `152.0.7977.82` with ANGLE SwiftShader and forced WebGL2. The smoke reported tick `4`, `failed: false`, `deviceLost: false`, valid drawing-buffer dimensions at both tested viewports, and captured a 1920×1080 technical screenshot.
- The captured screenshot was inspected: the calibration floor and 1.8 m marker are visible, the UI reports `WEBGL2 · Foundation running`, and the debug panel reports `renderer: webgl2`, `tick: 4`, `failed: false`, and `deviceLost: false`.
- This is software-rendered CI evidence, not a real-GPU performance result and not a WebGPU pass.

## Known broken or unverified systems

- No observed Phase 0 failures in dependency installation, typecheck, focused Node tests, production build, static-path serving, or software WebGL2 browser startup/render-loop smoke.
- Actual WebGPU rendering remains unverified on a real desktop GPU/browser.
- Hardware WebGL2 and automatic WebGPU-to-WebGL2 fallback remain unverified.
- Pause/resume UI interaction, 10-second hidden-tab return, repeated reload/HMR resource behavior, graphics-device loss/restoration, and total renderer failure UI still require browser/hardware validation.
- No production deployment has been performed.
- Terrain, RTS camera, navigation, selection, command execution, economy, construction, production, combat, AI, fog, trade and victory conditions are future milestones, not broken Phase 0 features.

## Concrete technical risks / performance state

- Build includes an approximately 2.03 MB minified engine/application JS chunk (~521 kB gzip), plus source map. Vite reports the 500 kB chunk advisory; no code-splitting requirement is claimed for Phase 0.
- Engine browser bundle produces `node:worker_threads` externalization warnings from optional Draco/Gaussian-splat worker paths. Revalidate before those features are admitted.
- 60 FPS / 1080p and hundreds of units are targets only. SwiftShader CI results are functional evidence only and make no GPU-performance claim.
- No custom GLSL, KTX2, Meshopt/Draco decoder configuration, asset loader wrapper, navigation library, or worker simulation has been added.
- Fixed-step scheduling is not a cross-platform deterministic multiplayer guarantee.

## Phase gate

**Phase 0 is integrated and code/CI/software-WebGL2 QA passes, but the phase gate remains OPEN until real desktop browser/GPU QA is completed. Phase 1 is not authorized.**

## Next work

Complete the remaining hardware-dependent checks from `docs/HANDOFF_PHASE_0.md`: real WebGPU with renderer explicitly reporting `webgpu`, hardware WebGL2/automatic fallback, pause/resume, 10-second hidden-tab recovery, repeated reload/HMR inspection, graphics-device loss/restoration, failure UI and an idle 1080p hardware baseline with browser/OS/GPU recorded. Do not begin Phase 1 until this evidence is accepted.
