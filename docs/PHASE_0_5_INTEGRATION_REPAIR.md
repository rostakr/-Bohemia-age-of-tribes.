# Phase 0.5 integration repair

Status: **complete, verified and deployed**.

Validated implementation SHA: `5893eef9fdffc38b8d94b373f830b69b8d8300c7`  
Repair merge SHA: `1b1b28bbfea91689d22455b117d12f412f5a24c2`  
Repair pull request: `#9`  
Final repair PR validation run: `35239053512`  
Post-merge `main` validation run: `35249907956`  
Deployed Pages build SHA: `aacc1317504d09832eb6a9eeeab16234e89de7ef`  
Pages deployment run: `35250435890`  
Public production smoke run: `35250992614`  
Public URL: `https://rostakr.github.io/-Bohemia-age-of-tribes./`

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
- Ensured failed initialization aborts the failed mount's host event listeners before releasing its runtime reference.
- Allowed `RuntimeScene.enter()` to return either `void` or `Promise<void>` so future scenes can perform controlled asynchronous asset initialization.
- Added `src/assets/resolve-asset.ts` as the central logical asset resolver. Logical paths resolve beneath `public/assets` and honor Vite relative/subpath bases or a future injected host base.
- Added asset-path tests and a browser lifecycle smoke that performs three complete unmount/mount cycles.
- Added the lifecycle smoke to the existing GitHub Actions validation workflow without removing existing WebGL2, interaction or WebGPU coverage.
- Fixed strict-TypeScript narrowing around graphics-device initialization and removed redundant teardown risk during cancelled initialization.
- Added `.github/workflows/verify-pages.yml` so the public GitHub Pages deployment can be checked independently of the local/CI preview build.

## Files changed by the repair

The core Phase 0.5 repair changes infrastructure/test files only; no Phase 1 art/gameplay systems are introduced:

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

The subsequent deployment-verification work also added `.github/workflows/verify-pages.yml`. The Pages deployment workflow was temporarily given a narrowly scoped push trigger for one reviewed publish and then restored to manual-only mode.

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

No React/Floot migration was performed because the current Vite/GitHub Pages deployment is functional and no technical requirement justified replacing the working host. If Floot is later selected, parity should first be demonstrated with a thin shell against this runtime boundary before retiring the reference Vite route.

## Validation results

The implementation and merged foundation passed repeated validation, including final PR CI and post-merge `main` CI.

- `npm ci`: PASS; dependency audit reported 0 vulnerabilities in the verified repair runs.
- `npm run typecheck`: PASS under strict TypeScript.
- `npm test`: PASS, 9/9 tests. Five fixed-step/telemetry tests plus four asset-resolver tests.
- `npm run build`: PASS with Vite 8.3.0.
- `npm run smoke:webgl2`: PASS. Calibration runtime started, canvas resized, automatic WebGPU-disabled fallback selected WebGL2, explicit total renderer failure displayed actionable UI, and screenshot evidence was produced.
- `npm run smoke:interactions`: PASS. Pause/resume, hidden-tab behavior without catch-up burst, viewport resize, WebGL context loss/restoration and repeated reloads remained healthy.
- `npm run smoke:lifecycle`: PASS. Three consecutive unmount/mount cycles on the same canvas completed with a single canvas and healthy remounted runtime state.
- `npm run smoke:webgpu`: PASS under Vulkan SwiftShader; diagnostics reported renderer `webgpu`.
- Post-merge validation of the Phase 0.5 foundation on `main`: PASS in run `35249907956`.

CI software rendering validates lifecycle/fallback correctness. It is not an actual-hardware GPU performance certification.

## Deployment validation

The repaired foundation was published through GitHub Pages from build SHA `aacc1317504d09832eb6a9eeeab16234e89de7ef`. Deployment workflow run `35250435890` completed both `build` and `deploy` jobs successfully and reported the environment URL:

`https://rostakr.github.io/-Bohemia-age-of-tribes./`

The temporary push trigger used to bootstrap that reviewed publication was then removed; the repository returned to manual-only Pages publishing in merge `850149f1c857f7374cae263a9951b531712baf6b`.

A separate production smoke workflow run `35250992614` then tested the actual public URL rather than Vite preview:

- two cache-busted requests with `Cache-Control: no-cache` returned consistent public HTML;
- the expected Foundation title was present;
- published JavaScript `assets/index-CZ4eO7z7.js` returned HTTP 200;
- published CSS `assets/index-BjnsYadS.css` returned HTTP 200;
- headless Chrome opened the public Pages URL with forced WebGL2/debug parameters;
- the live application reached `WEBGL2 · Foundation running` and diagnostics reported renderer `webgl2`.

This closes the deployment, hard-refresh, JS/CSS resource and public browser-runtime checks required by the Phase 0.5 gate. Phase 0 contains no production GLB/audio/font dependencies, so there were no additional runtime asset families to request at this milestone.

## Known limits

- CI graphics are software-backed. The pass establishes runtime/fallback/lifecycle/deployment correctness, not actual-hardware GPU performance or a 60 FPS target.
- The existing Vite large-chunk warning remains; it should be addressed when code splitting has measurable value.
- PlayCanvas optional worker-related `node:worker_threads` browser-externalization warnings remain in the build. The production build succeeds.
- Phase 0.5 does not accept terrain, navigation, economy, combat, AI or production art.
- Phase 1 PR #8 was created from the pre-repair baseline. Its content remains useful, but the branch must be reconciled with the Phase 0.5 runtime/lifecycle/asset-resolution contract before Phase 1 acceptance.

## Recommendation for Phase 1

Use the verified Phase 0.5 `main` as the only integration base. Reconcile the Phase 1 checkpoint onto it rather than overwriting the repaired runtime. Preserve `createGameRuntime`, lifecycle teardown, the central asset resolver and fixed-step core. Port Phase 1-specific environment, art and benchmark smoke coverage explicitly; resolve any overlap in `src/main.ts`, `src/render/*`, `package.json` and CI rather than taking one side wholesale.

Every Phase 1 GLB/texture/audio URL should route through the central resolver. React/Floot must not enter gameplay/simulation code or create a second game loop. Phase 1 visual/historical acceptance and actual-GPU performance evidence remain separate gates.

## Result

**Phase 0.5: PASS / COMPLETE_VERIFIED / DEPLOYED.**

The project is now technically permitted to proceed with Phase 1 reconciliation and QA.
