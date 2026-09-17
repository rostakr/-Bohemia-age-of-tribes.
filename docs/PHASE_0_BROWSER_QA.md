# Phase 0 browser QA automation

This file documents the repeatable CI-only portion of the Phase 0 browser gate.

## Automated in GitHub Actions

`npm run smoke:webgl2` starts the production Vite preview and launches the Chrome/Chromium binary supplied by the runner in headless mode with ANGLE SwiftShader and forced `renderer=webgl2`.

The smoke check fails unless:

- the Phase 0 status reports `WEBGL2 · Foundation running`;
- the fixed-step simulation tick advances;
- diagnostics report `failed: false`;
- diagnostics report `deviceLost: false`;
- valid canvas dimensions are reported at 1280×720 and 1920×1080;
- the larger viewport does not produce smaller drawing-buffer dimensions;
- a 1920×1080 technical evidence screenshot can be captured.

The screenshot is calibration evidence only and is not an art-quality review.

## Still manual / hardware-dependent

This CI smoke does **not** substitute for:

- real hardware WebGPU confirmation;
- automatic WebGPU→WebGL2 fallback on hardware/browser without WebGPU;
- pause/resume button interaction and 10-second hidden-tab recovery;
- browser-tooling graphics-device loss/restoration;
- repeated HMR resource inspection;
- hardware FPS/GPU baseline.

Phase 1 remains unauthorized until the remaining manual checks required by `docs/HANDOFF_PHASE_0.md` are accepted.
