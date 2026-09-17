# BOHEMIA: AGE OF TRIBES

**Forge a tribe. Rule the land. Shape Bohemia.**

A historically grounded 3D real-time strategy game for desktop browsers. The chronological campaign follows the peoples who shaped Bohemia; mixed-period skirmishes must be labeled explicitly as anachronistic.

The current development branch contains a **reconciled Phase 1 environment checkpoint** built on the verified Phase 0.5 runtime foundation. It is not an accepted professional visual benchmark and it is not a playable RTS yet. The checkpoint contains a 220 m South/Central Bohemian landscape study, stream, path, textured terrain, procedural meadow detail, inspection camera and one generated rectangular Boii dwelling admitted for evaluation. Storehouse, workshop, inhabitant and tree production-model slots are still empty.

The original Phase 0 calibration scene is preserved at `?scene=calibration`. The default scene is the Phase 1 environment study. Controls: drag to orbit, Shift-drag or middle-drag to pan, wheel to zoom, WASD/arrows to move, Q/E to rotate, and 1/2/3 to select a view.

## Technology

- PlayCanvas Engine **2.22.1**, with the engine-owned render loop
- Strict TypeScript and ES modules, built with Vite
- WebGPU priority with automatic WebGL2 fallback
- Engine-independent fixed-step simulation clock at 20 Hz
- Static HTTPS deployment from `dist/`, with relative/subpath-safe asset resolution

## Architecture

| Path | Responsibility |
| --- | --- |
| `src/core` | Engine-free fixed-step clock and future RTS command contracts |
| `src/render` | PlayCanvas runtime, calibration scene, Phase 1 benchmark scene and scene-scoped asset ownership |
| `src/assets` | Central logical asset resolver rooted beneath `public/assets` |
| `src/debug` | Bounded diagnostic telemetry |
| `src/config.ts` | Runtime configuration |
| `src/main.ts` | Browser host/composition root; owns DOM, resize, visibility and mount lifecycle |
| `scripts` | Static, browser, lifecycle, deployment and Phase 1 QA checks |

PlayCanvas remains the sole game/render engine. The browser host supplies the canvas and lifecycle signals; it does not own a second game loop. Runtime scenes may initialize asynchronously but do not own window/document listeners. All runtime GLB/texture paths are routed through the central asset resolver.

## Run and validate

```sh
npm ci
npm run validate
npm run smoke:webgl2
npm run smoke:interactions
npm run smoke:lifecycle
npm run smoke:webgpu
npm run smoke:phase1
npm run dev
```

`npm run validate` performs strict TypeScript checking, 11 focused Node tests (core timing/telemetry, asset resolution and Phase 1 landscape geometry) and the production Vite build. CI additionally runs the complete Phase 0 browser regression suite plus the Phase 1 benchmark browser smoke.

Use Node.js 24 LTS (`.nvmrc`). Install from the lockfile; do not replace pinned dependencies with `latest` during QA.

Append `?debug=1` to expose runtime diagnostics. Append `?renderer=webgl2&debug=1` to force the compatibility backend. Append `?scene=calibration` to run the preserved Phase 0 reference scene. Pause freezes simulation ticks while rendering continues; hidden tabs discard pending simulation time rather than catching up an unbounded absence.

## Assets

Runtime resources live beneath `public/assets` and are addressed through `src/assets/resolve-asset.ts`; do not scatter `import.meta.env.BASE_URL` concatenation or hard-coded production URLs through gameplay/render code.

The current Phase 1 checkpoint uses three Poly Haven CC0 terrain material sets and one Microsoft TRELLIS.2-generated Boii dwelling candidate. Asset provenance and receipts are recorded under `assets/source`, `public/ASSET_CREDITS.txt` and `docs/ASSET_MANIFEST.md`. The dwelling is an evaluation asset, not an approved final production model; visual, historical and actual-hardware performance review remain open.

## Deployment

GitHub Pages is the reference public host. Publishing remains **manual-only** after reviewed releases. The currently verified public URL is:

`https://rostakr.github.io/-Bohemia-age-of-tribes./`

That public release is the verified Phase 0.5 foundation. PR #14's reconciled Phase 1 checkpoint has passed CI but has not been published as the reference release yet. `Verify published foundation` independently checks the public calibration route, linked JS/CSS and initialized WebGL2 runtime.

No Floot/React migration has been performed. If a different host is introduced later, it must remain a thin shell around the existing PlayCanvas lifecycle API rather than replacing engine ownership.

## Current gate

Start with `docs/PROJECT_STATE.md` and `docs/HANDOFF_PHASE_1.md`.

- Phase 0: accepted historical foundation.
- Phase 0.5: complete, verified and deployed.
- Phase 1: reconciled checkpoint with CI PASS; visual/historical/actual-GPU QA and missing production asset slots remain open.
- Phase 2: not authorized by Phase 1 acceptance yet.

Historical pillars remain Boii (Late La Tène), Marcomanni (early Roman Imperial) and Slavs (6th–7th centuries). Avoid fantasy language and generic medieval-castle shorthand. Core resources are food, wood, stone, iron and trade wealth.
