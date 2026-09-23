# BOHEMIA: AGE OF TRIBES — Phase 2 handoff

## Status

**PHASE 2 RTS INTERACTION FOUNDATION: ACCEPTED INTO `qa/phase2-integration`.**

- Accepted PR: #76
- Final reviewed feature head: `8e6b0f5f00b18661811d1e5a4d984341de4a6f1e`
- QA integration merge: `8916dcb35c68f3b976fda730bf73cd3e9a48d3ea`
- Target integration branch: `qa/phase2-integration`
- `main`: not modified by this Phase 2 admission
- Phase 3: not authorized; no authoritative scope exists yet

## Implemented scope

Phase 2 converts the Phase 1 benchmark from inspection-only interaction into an RTS interaction/navigation foundation while preserving PlayCanvas 2.22.1, strict TypeScript, the existing lifecycle contract and engine-independent fixed-step simulation.

Implemented behavior:

- RTS camera input: WASD/arrows pan, viewport edge-scroll, middle-drag pan, wheel zoom and Q/E rotation;
- stable numeric simulation unit IDs independent of PlayCanvas entities;
- fixed-step worker MOVE simulation with render interpolation;
- click selection, drag-box selection and Shift toggle/add/remove;
- contextual right-click MOVE orders;
- deterministic replacement of an existing MOVE route;
- terrain-derived bounded navigation grid;
- bounded A* pathfinding;
- building and river blockers;
- explicit ford crossing;
- no diagonal corner cutting;
- bounded nearest-reachable resolution for invalid destinations;
- deterministic group destination slots;
- lightweight separation and bounded path-solving queue;
- selection rings, drag rectangle, valid/invalid command marker, selected count and feedback;
- Phase 2 diagnostics for active/selected units, pending paths, paths solved per tick, simulation time and path failures;
- normal five-worker scene plus debug-only 40-worker stress case.

## Final QA evidence

The exact accepted head passed all active PR workflows before merge:

- `Validate foundation` — run `35844829656`: PASS
- `Validate compact storehouse current baseline` — run `35844829668`: PASS
- `Validate worker R2 candidate` — run `35844829657`: PASS
- `Validate Phase 1 completion candidate` — run `35844829718`: PASS
- `Validate Phase 2 RTS interaction foundation` — run `35844829713`: PASS

The Phase 2 workflow additionally confirmed:

- `npm ci`: PASS
- strict TypeScript: PASS
- Node/core/asset/Phase 2 tests: 28/28 PASS
- production Vite build: PASS
- WebGL2 Phase 2 browser smoke: PASS
- normal active units: 5
- normal box selection: 5
- contextual MOVE feedback/marker: PASS
- runtime remount: PASS
- debug active units: 40
- visible debug box selection: 11
- bounded 40-unit path-solving behavior: covered by focused Node regression

Final evidence artifact:

- artifact ID: `10742942507`
- SHA-256: `134dda8d9b3cce0013bfe95a2e6c019197d5f8f6138f2289ff04e4de894b4f81`
- evidence files: `phase2-five-unit-webgl2.png`, `phase2-40-unit-webgl2.png`

## Right-click QA correction

An earlier headless smoke relied on Chromium/CDP synthesizing `contextmenu` from right-button mouse dispatch. That proved unreliable in CI even though the runtime was otherwise healthy.

The accepted controller explicitly supports the production right-button `pointerup(button=2)` path and retains `contextmenu` handling with duplicate suppression. The final browser smoke exercises the explicit pointerup path rather than depending on browser-specific synthetic context-menu behavior.

## Architecture preserved

- PlayCanvas remains the sole game/render engine.
- React/Floot does not own the game loop.
- Simulation state remains independent from PlayCanvas entity identity.
- Rendering and fixed-step simulation remain separated.
- Existing runtime lifecycle and remount behavior remain regression-tested.
- WebGPU preference and WebGL2 fallback remain intact through the foundation regression suite.
- Runtime asset paths remain within the existing resolver/pipeline.

## Known limits

- Worker R2 is static/unrigged; Phase 2 does not invent a walk animation.
- CI uses SwiftShader/software rendering and is regression evidence only.
- Actual desktop-GPU FPS/frame-time remains unmeasured.
- The 40-unit browser box selects the visible subset while the focused Node regression verifies the full bounded path queue.
- Economy, combat, construction, production, AI, fog of war, control groups, advanced formations, multiplayer and mobile controls are outside Phase 2.

## Post-acceptance cleanup

The follow-up branch `phase2/post-acceptance-cleanup` performs no new gameplay-system expansion. It:

1. updates stale host/canvas control help to the accepted RTS inputs;
2. adds `index.html` to the dedicated Phase 2 workflow path trigger so future host-input copy changes receive the Phase 2 regression suite;
3. synchronizes `docs/PROJECT_STATE.md` and `docs/DECISIONS.md` with the accepted Phase 2 baseline.

## Next gate

Further large gameplay development must start from `qa/phase2-integration` after this cleanup is accepted. Before economy/combat/AI or another broad system begins, the next milestone needs an explicit scope, exclusions, architecture boundary and measurable QA acceptance criteria.
