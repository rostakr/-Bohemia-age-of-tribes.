# Project state

```json
{
  "schema_version": 1,
  "project": "BOHEMIA: AGE OF TRIBES",
  "updated": "2026-09-17",
  "validated_phase_0_main_sha": "fe7933aff631a1bb7d103268238a1d13e19bb598",
  "phase_0_import_sha": "5decba22ee42f55de3430cb367663a776fb6f37d",
  "integration_pr": 1,
  "active_milestone": "PHASE_0_FOUNDATION",
  "status": "phase_0_integrated_awaiting_desktop_gpu_qa",
  "engine": "playcanvas@2.22.1",
  "next_phase_authorized": false,
  "deployment": null,
  "latest_qa": {
    "github_actions": "passed: PR runs 35194406557 and 35194619681",
    "npm_ci": "passed on Node 24.20.0",
    "typescript": "passed",
    "focused_node_tests": "5/5 passed locally and in CI",
    "production_build": "passed in CI",
    "static_root_path": "passed: HTTP 200, relative assets present",
    "static_nested_path": "passed: /bohemia/ HTTP 200, relative assets present",
    "license_notice": "passed: served at root and nested path",
    "browser_smoke": "blocked by environment: Chromium ERR_BLOCKED_BY_ADMINISTRATOR on localhost",
    "webgpu": "unverified",
    "webgl2": "unverified",
    "device_loss_recovery": "unverified",
    "gpu_performance": "not_measured"
  }
}
```

## Completed systems

- Correct repository resolved as `rostakr/-Bohemia-age-of-tribes.` and the Phase 0 package integrated through PR #1 without starting Phase 1.
- Phase 0 integration was squash-merged to `main` at `fe7933aff631a1bb7d103268238a1d13e19bb598` after two successful PR validation runs.
- Strict TypeScript ES modules; pinned npm dependencies and lockfile; Vite relative-base static build.
- PlayCanvas device bootstrap: WebGPU preference, WebGL2 fallback and forced compatibility URL.
- Application/scene ownership, disposal on HMR/unload, viewport resize and capped pixel ratio.
- 20 Hz engine-independent timing, bounded catch-up, pause/resume and hidden-tab timing reset.
- Typed future command/resource/culture/terrain contracts; commands do not execute yet.
- Bounded frame/simulation telemetry and visible startup/runtime error panel.
- Static 20 m calibration floor and 1.8 m marker; no production art.
- GitHub Actions validation and manual-only Pages deployment workflows integrated.
- Asset categories and provenance/rights gate; project/art/architecture documents integrated.

## QA evidence

- GitHub Actions PR validation runs `35194406557` and `35194619681` completed successfully.
- The first recorded run used Ubuntu 24.04 with Node 24.20.0 and npm 11.19.0.
- `npm ci` installed 21 packages and reported 0 vulnerabilities.
- `npm run validate` passed strict TypeScript, all 5 focused Node tests, and Vite production build.
- Build output: JS approximately 2.03 MB minified / 520.79 kB gzip plus source map; the known Vite chunk-size advisory remains.
- PlayCanvas optional worker paths emitted the already-documented `node:worker_threads` browser-externalization warnings; Phase 0 does not invoke those paths.
- Local focused Node test execution also passed 5/5.
- Static HTTP checks passed at `/` and `/bohemia/`; generated HTML uses relative JS/CSS paths and the PlayCanvas MIT notice was served at both paths.
- Browser automation was attempted with local Chromium but navigation to localhost was blocked by the execution environment with `ERR_BLOCKED_BY_ADMINISTRATOR`. This is an environment limitation, not evidence of a runtime failure.

## Known broken or unverified systems

- No observed Phase 0 failures in dependency installation, typecheck, focused Node tests, production build, or static-path serving.
- Actual WebGPU rendering remains unverified on a real desktop GPU/browser.
- Forced WebGL2 rendering and automatic WebGPU-to-WebGL2 fallback remain unverified in-browser.
- Pause/resume UI behavior, 10-second hidden-tab return, viewport resize behavior in a live renderer, HMR/reload resource behavior, graphics device loss/restoration, and total renderer failure UI require a browser environment that permits localhost graphics execution.
- No production deployment has been performed.
- Terrain, RTS camera, navigation, selection, command execution, economy, construction, production, combat, AI, fog, trade and victory conditions are future milestones, not broken Phase 0 features.

## Concrete technical risks / performance state

- Build includes an approximately 2.03 MB minified engine/application JS chunk (~521 kB gzip), plus source map. Vite reports the 500 kB chunk advisory; no code-splitting requirement is claimed for Phase 0.
- Engine browser bundle produces `node:worker_threads` externalization warnings from optional Draco/Gaussian-splat worker paths. Revalidate before those features are admitted.
- 60 FPS / 1080p and hundreds of units are targets only. No GPU or RTS-scale performance claim has been made.
- No custom GLSL, KTX2, Meshopt/Draco decoder configuration, asset loader wrapper, navigation library, or worker simulation has been added.
- Fixed-step scheduling is not a cross-platform deterministic multiplayer guarantee.

## Phase gate

**Phase 0 is integrated and code/CI QA passes, but the phase gate remains OPEN until desktop browser/GPU QA is completed. Phase 1 is not authorized.**

## Next work

Run the remaining browser/GPU checks from `docs/HANDOFF_PHASE_0.md` on a WebGPU-capable desktop browser, including forced WebGL2, pause/resume, hidden-tab recovery, resize, repeated reload/HMR, graphics-device loss/restoration, and failure UI. Record browser, OS and GPU. Do not begin Phase 1 until this evidence is accepted.
