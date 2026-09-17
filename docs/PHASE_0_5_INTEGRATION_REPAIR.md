# Phase 0.5 integration repair

Status: **implementation complete; CI pass; external QA pending**.

Validated implementation SHA: `888b4e7d24ce9d4afded5c1b901d2d0f05a58f4f`  
Validation workflow run: `35238118041`  
Repair branch: `repair/integration-phase-0`  
Pull request: `#9`  
Accepted Phase 0 reference `main`: `17d0e23c6b70fd8cb3a00ebaad79d717e8bea455`

## What was wrong

The accepted Phase 0 build was functional, but its integration boundary was too coupled to the standalone browser page for the next production stages. The PlayCanvas runtime accepted a canvas, but initialization immediately started the engine and runtime code owned browser resize/visibility behavior. The DOM bootstrap and runtime lifecycle therefore did not provide a clean host-neutral contract for repeated mount/unmount or a future thin React/Floot shell. There was also no central runtime asset resolver and no regression test proving that the same host canvas could safely destroy and recreate the engine without a full page reload.

This was an integration-hardening problem, not a reason to replace the engine or discard Phase 0.

## Root cause

Phase 0 correctly prioritized rendering, fixed-step timing, fallback behavior and a minimal static calibration scene. Host portability and repeated mounting were not required by that milestone, so browser lifecycle ownership remained implicit across `src/main.ts` and `src/render/runtime.ts`. Asset directories were reserved, but no production asset-loading pipeline yet required a central base-path resolver. The missing requirements became material only when considering later hosted-shell integration and Phase 1 asset loading.

## Changes made

- Preserved PlayCanvas 2.22.1, strict TypeScript, Vite and the existing fixed-step simulation clock.
- Refactored `src/render/runtime.ts` to expose a host-neutral lifecycle API: `initialize`, `start`, `pause`, `resume`, `resize`, `setVisibility`, `snapshot`, `destroy`.
- Kept PlayCanvas as the owner of the engine/render loop. No second `requestAnimationFrame` or React-owned game loop was added.
- Moved window/document/UI event ownership into the standalone Vite host in `src/main.ts`.
- Added a debug-only host bridge for browser QA that can mount, unmount and remount the same PlayCanvas host without a page reload.
- Allowed `RuntimeScene.enter()` to return either `void` or `Promise<void>` so future scenes can perform controlled asynchronous asset initialization.
- Added `src/assets/resolve-asset.ts` as the central logical asset resolver. Logical paths resolve beneath `public/assets` and honor Vite relative/subpath bases or a future injected host base.
- Added asset-path tests and a browser lifecycle smoke that performs three complete unmount/mount cycles.
- Added the lifecycle smoke to the existing GitHub Actions validation workflow without removing existing WebGL2, interaction or WebGPU coverage.
- Fixed strict-TypeScript narrowing around graphics-device initialization and removed redundant teardown risk during cancelled initialization.

## Files changed

The Phase 0.5 repair changes infrastructure/test files only; no Phase 1 art/gameplay systems are introduced:

```text
.github/workflows/validate.yml
package.json
scripts/browser-lifecycle.mjs
scripts/check-assets.mjs
src/assets/resolve-asset.ts
src/main.ts
src/render/runtime.ts
src/render/scene.ts
docs/PROJECT_STATE.md
docs/DECISIONS.md
docs/PHASE_0_5_INTEGRATION_REPAIR.md
```

## Architecture after repair

```text
Standalone Vite page today
  -> DOM/UI host in src/main.ts
      -> supplies existing canvas
      -> forwards resize / visibility / pause / resume
      -> creates and destroys GameRuntime
          -> PlayCanvas Application
              -> PlayCanvas update/render loop
              -> RuntimeScene
                  -> engine-independent FixedStepClock integration

Optional future Floot/React shell
  -> React component owns only canvas/UI mount lifecycle
      -> calls the same GameRuntime API
          -> PlayCanvas still owns rendering and simulation integration
```

No React/Floot migration was performed because the current Vite/GitHub Pages deployment is already functional and no technical requirement justified replacing the working host. If Floot is later selected for deployment, parity should first be demonstrated with a thin shell against this runtime boundary before retiring the reference Vite route.

## Validation results

GitHub Actions run `35238118041` validated the implementation SHA `888b4e7d24ce9d4afded5c1b901d2d0f05a58f4f` with Node 24.20.0 and Chrome 152.0.7977.82.

- `npm ci`: PASS; 21 packages installed; 0 vulnerabilities reported.
- `npm run typecheck`: PASS under strict TypeScript.
- `npm test`: PASS, 9/9 tests. Five existing fixed-step/telemetry tests plus four asset resolver tests.
- `npm run build`: PASS with Vite 8.3.0.
- `npm run smoke:webgl2`: PASS. Calibration runtime started, canvas resized, automatic WebGPU-disabled fallback selected WebGL2, explicit total renderer failure displayed actionable UI, and a screenshot artifact was captured.
- `npm run smoke:interactions`: PASS. Pause/resume, more than 10 seconds hidden-tab behavior, no catch-up burst, viewport resize, WebGL context loss/restoration and repeated hard reloads remained healthy.
- `npm run smoke:lifecycle`: PASS. Three consecutive unmount/mount cycles on the same canvas completed with a single canvas and `failed=false`, `deviceLost=false`, `destroyed=false` on each remounted runtime.
- `npm run smoke:webgpu`: PASS under Vulkan SwiftShader; diagnostics reported renderer `webgpu`.

Build artifact: GitHub Actions artifact ID `10504361447`, ZIP SHA-256 `e40461b2e1306297b58a8c65c4769a31014580ce8f0926310f22da98a9c3c3a4`.  
WebGL2 evidence artifact: ID `10504526881`, ZIP SHA-256 `ceb6ca58f03bb02cd211869a0ce8fa1891494867fcea8c20d92bda658c85f947`.

## Deployment

Reference deployment remains the already accepted GitHub Pages build from `main`:

`https://rostakr.github.io/-Bohemia-age-of-tribes./`

The Phase 0.5 branch itself is intentionally not published by the current manual Pages workflow because deployment is restricted to `main`. This repair must first pass external review and merge. Therefore this document does not claim that the repair SHA is already live at the public URL.

## Known limits

- CI graphics are software-backed. The pass establishes runtime/fallback/lifecycle correctness, not actual-hardware GPU performance or a 60 FPS target.
- The existing Vite large-chunk warning remains; it is not new to this repair and should be addressed when code splitting has measurable value.
- PlayCanvas optional worker-related `node:worker_threads` browser-externalization warnings remain in the build. The production build succeeds.
- Phase 0 contains only the calibration scene. No terrain, navigation, economy, combat, AI or production art is accepted by this milestone.
- The central asset resolver is infrastructure; Phase 0 itself still contains no production runtime art assets that depend on it.
- PR #8's Phase 1 checkpoint was developed from the pre-repair baseline and must be reconciled with the accepted Phase 0.5 baseline before its own acceptance.

## Recommendation for Phase 1

After external QA accepts and merges PR #9, use that merged `main` as the only new Phase 1 base. Rebase or narrowly port the Phase 1 checkpoint onto it, preserve the host-neutral runtime boundary, and route every runtime GLB/texture/audio URL through the central asset resolver. Do not introduce React/Floot into gameplay code and do not create a second game loop. Continue using the existing fixed-step core for future unit movement, combat, AI, gathering and economy systems.

Phase 1 acceptance should remain separate from this infrastructure gate: visual/historical asset review, actual-GPU performance evidence and the Phase 1 scope still require their own QA.
