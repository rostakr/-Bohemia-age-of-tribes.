# Phase 0 handoff

## IMPLEMENTED

PlayCanvas 2.22.1 + strict TypeScript/Vite foundation, preferred WebGPU and WebGL2 compatibility path, scene lifecycle and cleanup, viewport sizing, static calibration scene, fixed-step simulation timing, domain command contracts, pause/visibility handling, bounded diagnostics, error UI, build/CI/manual deployment definitions, asset layout and compact state documentation. No gameplay systems or production art have been represented as complete.

## FILES CHANGED

All paths below are relative to the `bohemia-age-of-tribes/` source package root. This is a new package, not a patch against an existing remote SHA.

```text
.gitignore
.nvmrc
.github/workflows/validate.yml
.github/workflows/deploy-pages.yml
AGENTS.md
README.md
package.json
package-lock.json
tsconfig.json
vite.config.ts
index.html
src/main.ts
src/config.ts
src/style.css
src/core/fixed-step.ts
src/core/contracts.ts
src/debug/telemetry.ts
src/render/runtime.ts
src/render/scene.ts
src/render/calibration-scene.ts
scripts/check-core.mjs
docs/PROJECT_STATE.md
docs/ART_BIBLE.md
docs/ASSET_MANIFEST.md
docs/DECISIONS.md
docs/HANDOFF_PHASE_0.md
public/PLAYCANVAS-LICENSE.txt
public/assets/buildings/.gitkeep
public/assets/characters/.gitkeep
public/assets/environment/.gitkeep
public/assets/materials/.gitkeep
public/assets/animations/.gitkeep
public/assets/ui/.gitkeep
assets/source/.gitkeep
```

`dist/` is generated output included in the handoff archive for static-host inspection; it is gitignored and must be rebuilt after source changes. No node_modules or Git credentials are included.

## ASSETS ADDED/CHANGED

Only code-generated calibration floor (20 m) and scale marker (1.8 m). Original temporary geometry; no third-party art, generated historical assets, textures or paid generation jobs. PlayCanvas MIT notice is included in the served public directory. Asset intake is defined in `docs/ASSET_MANIFEST.md`.

## MINIMUM VALIDATION PERFORMED

- Installed exact dependency versions and generated lockfile.
- `npm run validate`: strict TypeScript passed, five Node tests passed, Vite production build passed.
- Focused tests cover frame-rate independence, bounded stalls, pause-time discard, invalid timing input and bounded diagnostic storage.
- Browser startup attempted at local dev server, blocked by browser environment (`ERR_BLOCKED_BY_CLIENT`); no GPU screenshot, runtime pass or FPS claim.
- GitHub metadata/file reads returned 404; no remote integration/deployment performed.

## QA HANDOFF — GPT-5.6 SOL

1. Resolve the authorized GitHub repository and current main SHA before integration. Read any existing AGENTS/state/package files; merge narrowly without overwriting later work. Do not assume this package is current main. Record the actual imported commit SHA in PROJECT_STATE in a subsequent state update (avoid a self-referential SHA).
2. With Node 24, run `npm ci && npm run validate`; retain command output. Serve `dist/` with `npm run preview`, using `?debug=1`.
3. On a WebGPU-capable desktop with HTTPS or localhost, verify visible floor, marker, lighting and continuously advancing tick. Verify the diagnostic renderer actually reads `webgpu`; a fallback is not a WebGPU pass. Record browser, OS and GPU.
4. Load `?renderer=webgl2&debug=1`; confirm renderer reads `webgl2`, geometry is visible and logs have no startup/render errors. Also test automatic fallback on a browser/device without WebGPU.
5. Pause: tick stops while the UI remains responsive. Resume: tick advances without catching up paused time. Hide the tab for at least 10 seconds and return: no accumulated catch-up burst. Check diagnostics for finite values.
6. Resize between 1280×720 and 1920×1080; check canvas drawing size/aspect, title/buttons and absence of stale viewport dimensions. Pixel ratio is capped at 1.5.
7. Reload/HMR several times; verify one live canvas/runtime, no duplicate event behavior, and no steadily growing GPU resources. Test graphics context loss/restoration using browser tooling, then test total renderer failure: actionable error UI, no blank silent failure.
8. Serve under a nested path (e.g. `/bohemia/`) as well as root; inspect missing requests and console errors. Confirm license notice ships. GitHub workflows are authored but need a first real Actions run.
9. Capture one calibration screenshot per renderer only as technical evidence; do not review it as commercial art. Collect an idle 1080p baseline with hardware details, explicitly excluding any claim about hundreds of units.
10. Update `docs/PROJECT_STATE.md` with pass/fail, actual source SHA and precise reproduction/logs for blockers. Do not begin Phase 1 automatically.

## KNOWN RISKS

Runtime/GPU behavior has not been demonstrated in this environment. Optional engine worker imports produce browser externalization warnings; the engine bundle triggers a size advisory. Remote main and GitHub deployment are inaccessible/unverified. Professional art, asset decoder pipelines and RTS scale performance are not part of this phase.

## NEXT HIGH-VALUE ASTRA TASK

Only after external acceptance: Phase 1 benchmark scene integration from a licensed, technically specified asset pack and concise historical/art reference brief. Keep mass content, economic simulation and combat out of that ticket.
