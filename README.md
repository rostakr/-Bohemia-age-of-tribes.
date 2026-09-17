# BOHEMIA: AGE OF TRIBES

**Forge a tribe. Rule the land. Shape Bohemia.**

A historically grounded 3D real-time strategy game for desktop browsers. The chronological campaign follows the peoples who shaped Bohemia; any skirmish that mixes periods must be labeled explicitly as anachronistic.

This package is a **partial Phase 1 environment study** with one generated rectangular dwelling integrated for evaluation; the roundhouse, workshop, inhabitant and tree model slots remain empty, and visual, historical and performance QA are pending. It includes a 220 m landscape, stream, path, textured ground, procedural meadow detail and an inspection camera. It is not an accepted professional visual benchmark or a playable RTS yet.

Controls: drag to orbit, Shift-drag or middle-drag to pan, wheel to zoom, WASD/arrows to move, Q/E to rotate, 1/2/3 to select a view. Append `?scene=calibration` for the preserved Phase 0 regression scene. Inspect `docs/HANDOFF_PHASE_1.md` for the current blocker and next steps.

## Technology

- PlayCanvas Engine **2.22.1**, with its engine-owned render loop
- Strict TypeScript and ES modules, built with Vite
- WebGPU priority using native built-in WGSL, with WebGL2 fallback
- Static HTTPS deployment from `dist/`; Vite uses a relative base by default

## Architecture

| Path | Responsibility |
| --- | --- |
| `src/core` | Engine-free fixed-step clock and command contracts |
| `src/render` | PlayCanvas runtime scene and explicit `enter` / `update` / `destroy` lifetime |
| `src/debug` | Bounded diagnostic telemetry |
| `src/config.ts` | Runtime configuration |
| `src/main.ts` | Browser entry point and composition root |
| `scripts/check-core.mjs` | Focused Node checks for core behavior |

The simulation clock runs at 20 Hz and caps catch-up work. Commands are tick-indexed contracts for `move`, `attack`, `gather`, `build`, `repair`, and `stop`; Phase 0 provides no gameplay handlers for them.

## Run and validate

```sh
npm ci
npm run validate
npm run dev
```

`validate` runs type checking, focused Node tests, and the production build. To inspect that build locally:

```sh
npm run preview
```

Use Node.js 24 LTS (`.nvmrc`). Install from the lockfile; do not replace pinned dependencies with `latest` during QA.

Append `?debug=1` to show the renderer, simulation tick, rolling frame timings, simulation CPU time and dropped wall time. Append `?renderer=webgl2&debug=1` to exercise the compatibility path. The pause button freezes simulation ticks while rendering continues. Hidden tabs discard pending simulation time and resume without catching up the whole absence. These diagnostics are instrumentation, not a performance certification.

For deployment, serve `dist/` over HTTPS (localhost is sufficient for development). Do not open `index.html` with `file://`. Runtime resources must be served from the same deployment base: use `import.meta.env.BASE_URL` when adding public assets. No runtime asset CDN, provider credential or paid service is required. Current Phase 1 asset work is restricted to free tools and noncommercial use.

To publish after QA and repository integration: enable GitHub Pages with **GitHub Actions** as its source, then run **Publish reviewed foundation** on `main`. The workflow validates before deployment. Floot or another static host can also serve `dist/`; no Floot integration has been performed.

Start the next session with [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md) and [docs/HANDOFF_PHASE_0.md](docs/HANDOFF_PHASE_0.md). Phase 1 visual acceptance and Phase 2 must wait for external QA.

GitHub build CI and a manual-only Pages deployment workflow belong to the Phase 0 foundation. No remote or live deployment is implied by this repository.

## Direction after Phase 0

The Phase 1 benchmark is a south/central Bohemian rolling landscape with a stream, mixed deciduous forest, meadow, path, three Boii structures, and five inhabitants. Commercial asset choices must pass the manifest gate before mass production.

Historical pillars:

- **Boii, Late La Tène:** trade, metallurgy, and oppida.
- **Marcomanni, early Roman Imperial:** prestige, raids, and retinues.
- **Slavs, 6th–7th centuries:** settlement networks and agriculture.

Avoid fantasy language and generic medieval castles. Core resources are food, wood, stone, iron, and trade wealth.

## Engine references

- [PlayCanvas standalone engine](https://developer.playcanvas.com/user-manual/engine/standalone/)
- [PlayCanvas `createGraphicsDevice`](https://api.playcanvas.com/engine/functions/createGraphicsDevice.html)
