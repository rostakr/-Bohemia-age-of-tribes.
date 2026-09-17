# Project state

```json
{
  "schema_version": 1,
  "project": "BOHEMIA: AGE OF TRIBES",
  "updated": "2026-09-17",
  "validated_phase_0_main_sha": "14c748e172be278649167075ae4f85eef9ffde6f",
  "phase_0_runtime_sha": "52e4f6a2edb53a5ed833f60a0276cf2e4e8880f8",
  "phase_0_import_sha": "5decba22ee42f55de3430cb367663a776fb6f37d",
  "integration_pr": 1,
  "browser_smoke_pr": 2,
  "interaction_qa_pr": 3,
  "software_webgpu_pr": 4,
  "hardware_acceptance_issue": 5,
  "pages_bootstrap_pr": 6,
  "pages_restore_pr": 7,
  "active_milestone": "PHASE_0_FOUNDATION",
  "status": "phase_0_ci_and_https_deployment_passed_awaiting_real_hardware_gpu_qa",
  "engine": "playcanvas@2.22.1",
  "next_phase_authorized": false,
  "deployment": {
    "provider": "github_pages",
    "successful": true,
    "workflow": "Publish reviewed foundation",
    "run": 35214332852,
    "build_sha": "38a087a723f6ac90eda897a6305e63c5ccbdfcee",
    "artifact_id": 10494373413,
    "build": "passed",
    "deploy": "passed",
    "url": "https://rostakr.github.io/-Bohemia-age-of-tribes./",
    "workflow_manual_only": true
  },
  "latest_qa": {
    "github_actions": "passed on main: run 35214792658 at SHA 14c748e172be278649167075ae4f85eef9ffde6f",
    "npm_ci": "passed on Node 24.20.0",
    "typescript": "passed",
    "focused_node_tests": "5/5 passed",
    "production_build": "passed",
    "static_root_path": "passed",
    "static_nested_path": "passed: /bohemia/",
    "license_notice": "passed",
    "forced_webgl2_ci_software": "passed",
    "automatic_fallback_ci_software": "passed with WebGPU disabled; renderer reported webgl2",
    "webgpu_ci_software": "passed repeatedly with CDP polling; Chrome 152.0.7977.82, vulkan-swiftshader, renderer webgpu, failed=false, deviceLost=false, tick advanced 0->1",
    "webgpu_ci_harness_note": "one-shot dump-dom probe was runner-timing-sensitive and was replaced by CDP state polling; no runtime failure was observed in the flaky sample",
    "pause_resume_ci": "passed; tick remained stable while paused and resumed afterward",
    "visibility_handler_ci": "passed synthetically for >10 seconds with no catch-up burst",
    "resize_ci": "passed; drawing buffer changed with live viewport size",
    "device_loss_restore_ci_software": "passed via WEBGL_lose_context",
    "repeated_reload_ci": "passed: 3 production reloads, one healthy canvas/runtime each",
    "failure_ui_ci": "passed with WebGL disabled; visible actionable renderer error UI",
    "https_pages_deployment": "passed; GitHub Pages URL published successfully",
    "webgpu_hardware": "unverified",
    "webgl2_hardware": "unverified",
    "native_hidden_tab_hardware": "unverified",
    "hmr_resource_inspection": "unverified",
    "gpu_performance": "not_measured"
  }
}
```

## Completed systems

- Correct repository resolved as `rostakr/-Bohemia-age-of-tribes.` and the Phase 0 package integrated through PR #1 without starting Phase 1.
- Phase 0 integration was squash-merged to `main` at `fe7933aff631a1bb7d103268238a1d13e19bb598` after successful PR validation.
- Phase 0 QA extensions through PRs #2-#4 were squash-merged without changing gameplay/production-art scope; the Phase 0 runtime foundation is `52e4f6a2edb53a5ed833f60a0276cf2e4e8880f8`.
- Strict TypeScript ES modules; pinned npm dependencies and lockfile; Vite relative-base static build.
- PlayCanvas device bootstrap: WebGPU preference, WebGL2 fallback and forced compatibility URL.
- Application/scene ownership, disposal on HMR/unload, viewport resize and capped pixel ratio.
- 20 Hz engine-independent timing, bounded catch-up, pause/resume and hidden-tab timing reset.
- Typed future command/resource/culture/terrain contracts; commands do not execute yet.
- Bounded frame/simulation telemetry and visible startup/runtime error panel.
- Static 20 m calibration floor and 1.8 m marker; no production art.
- GitHub Actions validation and manual-only Pages deployment workflows integrated.
- Asset categories and provenance/rights gate; project/art/architecture documents integrated.
- Repeatable software-WebGL2 startup/render smoke, screenshot capture, fallback simulation, failure-UI validation and CDP interaction regression checks are covered in CI.
- Default PlayCanvas WebGPU preference path is exercised in CI through Chrome/Dawn `vulkan-swiftshader` using CDP polling; the software WebGPU simulation tick advances, but this is still not hardware acceptance.
- GitHub Pages is enabled and the reviewed Phase 0 artifact is publicly deployed at `https://rostakr.github.io/-Bohemia-age-of-tribes./`.

## QA evidence

- GitHub Actions main run `35214792658` passed the complete Phase 0 validation sequence at validated main SHA `14c748e172be278649167075ae4f85eef9ffde6f`.
- Main run `35214332854` also passed the complete Phase 0 suite at deployment-bootstrap SHA `38a087a723f6ac90eda897a6305e63c5ccbdfcee`.
- Pages workflow run `35214332852` successfully installed dependencies, ran `npm run validate`, uploaded Pages artifact `10494373413`, and later deployed that artifact successfully after Pages was enabled.
- The successful Pages deployment reported environment URL `https://rostakr.github.io/-Bohemia-age-of-tribes./`.
- Stabilized software-WebGPU CDP coverage passed repeatedly before and after merge.
- `npm ci` installs the pinned dependency set and reports 0 vulnerabilities.
- `npm run validate` passes strict TypeScript, all 5 focused Node tests, and the Vite production build.
- Build output remains approximately 2.03 MB minified / 520.79 kB gzip plus source map; the known Vite chunk-size advisory remains.
- PlayCanvas optional worker paths continue to emit the documented `node:worker_threads` browser-externalization warnings; Phase 0 does not invoke those optional paths.
- Static HTTP checks passed at `/` and `/bohemia/`; generated HTML uses relative JS/CSS paths and the PlayCanvas MIT notice is served.
- Forced software WebGL2 startup/render-loop smoke passes and captures a 1920×1080 technical screenshot.
- With WebGPU disabled in CI, the default renderer path reaches healthy WebGL2, demonstrating the fallback code path in the software environment.
- With WebGL disabled, the app shows the renderer failure status and actionable recovery UI instead of a silent blank screen.
- Interaction smoke passed: Pause froze tick, Resume restarted it, the visibility-change handler stayed hidden for more than 10 seconds without catch-up, live resize changed drawing-buffer dimensions, `WEBGL_lose_context` reached device loss/restoration successfully, and three production reloads returned to one healthy canvas/runtime.
- Stabilized software WebGPU smoke repeatedly passed with the `vulkan-swiftshader` probe: the production page reported `WEBGPU · Foundation running`, `renderer: webgpu`, `failed: false`, `deviceLost: false`, and tick advanced from `0` to `1` during observation.
- These software/headless results and successful HTTPS publication are functional evidence only; they do not count as real-GPU performance, native background-tab, hardware device-loss or hardware WebGPU acceptance.

## Known broken or unverified systems

- No observed Phase 0 application failures in dependency installation, typecheck, focused Node tests, production build, static-path serving, software WebGL2 startup/rendering, software WebGPU initialization/render/simulation path, pause/resume handling, synthetic visibility handling, resize, software context loss/restoration, repeated production reload, fallback simulation, renderer failure UI, or Pages publication.
- Real hardware WebGPU remains unverified on a desktop GPU/browser.
- Hardware WebGL2 and fallback on a browser/device where WebGPU is genuinely unavailable remain unverified.
- Native background-tab behavior remains unverified; CI exercises the same application visibility handler synthetically.
- Repeated development HMR resource behavior remains unverified; CI covers full production reloads.
- Hardware graphics-device loss/restoration remains unverified.
- Idle 1920×1080 real-hardware FPS/frame-time baseline remains unmeasured.
- Terrain, RTS camera, navigation, selection, command execution, economy, construction, production, combat, AI, fog, trade and victory conditions are future milestones, not broken Phase 0 features.

## Concrete technical risks / performance state

- Build includes an approximately 2.03 MB minified engine/application JS chunk (~521 kB gzip), plus source map. Vite reports the 500 kB chunk advisory; no code-splitting requirement is claimed for Phase 0.
- Engine browser bundle produces `node:worker_threads` externalization warnings from optional Draco/Gaussian-splat worker paths. Revalidate before those features are admitted.
- 60 FPS / 1080p and hundreds of units are targets only. SwiftShader/Dawn CI results are functional evidence only and make no GPU-performance claim.
- No custom GLSL, KTX2, Meshopt/Draco decoder configuration, asset loader wrapper, navigation library, or worker simulation has been added.
- Fixed-step scheduling is not a cross-platform deterministic multiplayer guarantee.

## Phase gate

**Phase 0 code/CI/software-WebGL2/software-WebGPU/HTTPS-deployment QA passes, but the phase remains OPEN until real desktop browser/GPU acceptance is completed. Phase 1 is not authorized.**

## Next work

Use the deployed HTTPS target `https://rostakr.github.io/-Bohemia-age-of-tribes./` to complete Issue #5: real WebGPU with diagnostics explicitly reporting `webgpu` and normal advancing simulation, real hardware WebGL2/fallback, native 10-second background-tab return, repeated development HMR resource inspection, hardware graphics-device loss/restoration, and an idle 1080p hardware baseline with browser/OS/GPU recorded. Do not begin Phase 1 until this evidence is accepted.
