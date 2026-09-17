# Phase 0 browser QA automation

This file documents the repeatable CI-only portion of the Phase 0 browser gate. These checks improve regression coverage but do not replace real hardware/browser acceptance.

## Automated in GitHub Actions

`npm run smoke:webgl2` starts the production Vite preview and launches runner Chrome in headless mode with ANGLE SwiftShader. It verifies:

- forced `renderer=webgl2` reports `WEBGL2 · Foundation running`;
- the fixed-step simulation tick advances;
- diagnostics report `failed: false` and `deviceLost: false`;
- drawing-buffer dimensions are valid at 1280×720 and 1920×1080 and grow with the larger viewport;
- a 1920×1080 technical evidence screenshot can be captured;
- with WebGPU disabled, the default renderer path reaches healthy WebGL2, exercising the automatic fallback path in software CI;
- with WebGL disabled, the application presents the visible `Renderer unavailable` state and actionable error copy rather than a silent blank screen.

`npm run smoke:interactions` drives the same production build through Chrome DevTools Protocol, still using software WebGL2. It verifies:

- Pause freezes the authoritative simulation tick and Resume restarts normal tick progress;
- the application visibility-change handler can remain hidden for more than 10 seconds without advancing ticks or producing a catch-up burst on return;
- live viewport changes update the PlayCanvas drawing buffer in the expected direction;
- `WEBGL_lose_context` propagates to `deviceLost: true`, restoration returns to `deviceLost: false`, and the runtime remains healthy;
- three production reloads each return to exactly one live canvas/runtime with no failure/device-loss state.

GitHub Actions run `35201007076` passed the full validation, browser smoke and interaction smoke sequence on Ubuntu 24.04 / Node 24.20.0 / Chrome 152.0.7977.82.

The screenshot and SwiftShader results are technical evidence only. They are not commercial-art review and they are not hardware performance results.

## Still manual / hardware-dependent

CI does **not** substitute for:

- real hardware WebGPU confirmation with diagnostics explicitly reporting `webgpu`;
- real hardware WebGL2 confirmation and fallback on a browser/device where WebGPU is genuinely unavailable;
- native tab hide/background/restore behavior on the target desktop browser (CI currently exercises the same application handler synthetically);
- repeated development HMR resource inspection; CI covers full production reloads, not HMR replacement;
- hardware graphics-device loss/restoration behavior;
- an idle 1080p hardware FPS/GPU baseline with browser, OS and GPU recorded.

Phase 1 remains unauthorized until the remaining hardware-dependent checks required by `docs/HANDOFF_PHASE_0.md` are accepted.
