# Phase 2 — RTS interaction foundation QA receipt

Date: 2026-09-23

## Status

**QA ACCEPTED into `qa/phase2-integration`.**

This receipt covers PR #76, `phase2/rts-interaction-foundation`, accepted development head `8e6b0f5f00b18661811d1e5a4d984341de4a6f1e`, merged into `qa/phase2-integration` as `8916dcb35c68f3b976fda730bf73cd3e9a48d3ea`.

It does not authorize a merge to `main` and does not expand scope into Phase 3.

## Accepted scope

The admitted increment provides:

- RTS camera controls: keyboard pan, edge-scroll, middle-drag pan, Q/E rotation and wheel zoom;
- stable simulation unit IDs;
- fixed-step worker movement with render interpolation;
- click, drag-box and Shift-toggle selection;
- contextual right-click MOVE orders;
- deterministic replacement of prior MOVE routes;
- terrain-derived bounded A* navigation;
- building and water blockers;
- one explicit passable ford/crossing;
- no diagonal corner cutting;
- bounded nearest-reachable destination resolution;
- deterministic group destination slots;
- bounded separation and path-solving workload;
- selection rings, drag box, selected-count feedback and valid/invalid MOVE markers;
- normal five-worker scene and debug-only 40-unit stress path;
- focused Phase 2 instrumentation and regression tests.

Out of scope: economy, combat, construction, production, AI, fog of war, multiplayer, advanced formations, mobile controls and Phase 3 systems.

## Validation

Accepted workflow:

- run: `35844829713`;
- job: `107128336588`;
- result: SUCCESS.

Observed gates:

- `npm ci` — PASS;
- deterministic worker/workshop rebuild setup — PASS;
- `npm run validate` — PASS;
- TypeScript `tsc --noEmit` — PASS;
- Node tests — **28/28 PASS**;
- Phase 1 asset checks — PASS;
- storehouse runtime structural check — PASS;
- production Vite build — PASS;
- `npm run smoke:phase2` — PASS;
- evidence artifact upload — PASS.

The navigation regression `bounded A* uses explicit crossing and does not cross blocked water` passed in the accepted run.

## Browser smoke observations

The WebGL2 smoke completed through the real PlayCanvas runtime under CI SwiftShader.

Five-unit scenario:

- renderer `webgl2`;
- 5 active units;
- 5 selected units after box selection;
- contextual MOVE feedback/marker path passed;
- remount completed successfully.

40-unit debug scenario:

- 40 active units;
- 11 units selected in the captured test pass;
- bounded path/MOVE path exercised;
- screenshot captured successfully.

The final smoke output explicitly states that the result is SwiftShader/WebGL2 CI regression evidence only and not desktop-GPU performance evidence.

## CI harness repair made during QA

The first browser-smoke attempt failed while waiting for contextual MOVE feedback although the runtime was otherwise healthy. The test helper generated a synthetic `contextmenu` `MouseEvent`, while the controller already implements right-button MOVE on its `pointerup` path.

QA changed the smoke helper to dispatch a right-button `PointerEvent('pointerup')` to the gameplay canvas. No gameplay rule, pathfinding threshold, movement behavior or acceptance assertion was relaxed. The corrected exact head then passed the full repository validation and browser smoke.

Repair commit: `8e6b0f5f00b18661811d1e5a4d984341de4a6f1e`.

## Evidence artifact

Artifact name: `phase2-rts-interaction-evidence`

Artifact ID: `10742942507`

Digest: `sha256:134dda8d9b3cce0013bfe95a2e6c019197d5f8f6138f2289ff04e4de894b4f81`

Files:

- `phase2-five-unit-webgl2.png`;
- `phase2-40-unit-webgl2.png`.

Both screenshots were reviewed after download. They show the expected settlement/runtime scene, selected-unit rings/count, diagnostics overlay and no visible renderer-error state. The stress screenshot visibly contains the larger worker group required by the 40-unit debug scenario.

## Known limits

- No actual desktop-GPU benchmark is available from this CI environment.
- The Vite production build reports a large JavaScript chunk warning; it is not a build failure and is not treated as a Phase 2 interaction blocker.
- This milestone establishes interaction/navigation foundation only; later systems must add their own focused tests rather than weakening these regressions.
- `main` remains outside this QA admission until an explicit later release decision.

## Acceptance decision

The Phase 2 RTS interaction foundation is accepted into `qa/phase2-integration` because the exact accepted head passes static validation, all focused tests, production build, browser interaction smoke, remount coverage and evidence capture, and because the downloaded screenshots are consistent with the expected five-unit and 40-unit scenarios.

Next action: define the next bounded Phase 2 increment before implementation.
