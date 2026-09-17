# Decisions

## Phase 0 decisions

| Area | Decision | Consequence |
| --- | --- | --- |
| Scope | Build the technical foundation and static inspection scene only | Terrain gameplay, navigation, RTS camera behavior, command handlers, factions, and production content wait for later phases |
| Runtime | Desktop browser with PlayCanvas Engine pinned to 2.22.1, strict TypeScript, ES modules, and Vite | Reproducible engine API and a small static web build |
| Graphics | Prefer WebGPU through PlayCanvas using native built-in WGSL; retain WebGL2 fallback | Startup must select a supported device without maintaining a separate custom shader language path in Phase 0 |
| Loop ownership | PlayCanvas owns the render loop | Runtime scene updates attach to the engine lifecycle rather than creating another animation loop |
| Scene lifetime | Runtime scenes expose explicit `enter`, `update`, and `destroy` stages | Resources and subscriptions have clear ownership and teardown |
| Simulation | Keep an engine-free fixed-step clock at 20 Hz with capped catch-up | Core timing can be checked in Node and cannot spiral through unbounded delayed ticks |
| Commands | Define tick-indexed contracts for `move`, `attack`, `gather`, `build`, `repair`, and `stop` | Interfaces can stabilize before gameplay execution; Phase 0 has no handlers |
| Diagnostics | Keep debug telemetry bounded | Long sessions cannot grow diagnostic history without limit |
| View | Use a static inspection camera | A full RTS camera is outside Phase 0 |
| Art | Use only generated primitive floor and height-marker calibration geometry | All visible Phase 0 geometry is disposable internal greybox work, never production art |
| Assets | Gate commercial assets through provenance, licensing, historical, visual, and technical review | No professional asset is imported or mass-produced in Phase 0 |
| Deployment | Build a relative-base Vite `dist` for static HTTPS hosting; keep Pages deployment manual-only | CI may verify builds, but no remote or deployment is created or claimed by this milestone |

## Product constraints carried forward

- The chronological campaign distinguishes Boii (Late La Tène), Marcomanni (early Roman Imperial), and Slavs (6th–7th centuries).
- Any mixed-period skirmish is labeled anachronistic.
- The setting avoids fantasy and generic medieval castles.
- Resources are food, wood, stone, iron, and trade wealth.
- Phase 1's benchmark is a rolling south/central Bohemian landscape with stream, mixed deciduous forest, meadow, path, three Boii structures, and five inhabitants.

## Validation and handoff

The intended clean setup is `npm ci`, followed by `npm run validate` for type checking, focused Node tests, and a production build. Use `npm run dev` for development and `npm run preview` to inspect the built output. Record actual validation results in `docs/PROJECT_STATE.md`; this document does not claim results or a commit SHA.
