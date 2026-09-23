# Project state

```json
{
  "schema_version": 6,
  "project": "BOHEMIA: AGE OF TRIBES",
  "updated": "2026-09-23",
  "engine": "playcanvas@2.22.1",
  "phase_0_status": "COMPLETE_ACCEPTED",
  "phase_0_5_status": "COMPLETE_VERIFIED",
  "phase_1_authorized": true,
  "phase_1_status": "COMPLETE_QA_ACCEPTED",
  "art_gate_passed": true,
  "phase_1_accepted_sha": "26546b893fa37df4f0c56934b8fabaac8d942218",
  "phase_1_reviewed_candidate_sha": "853d802e0512f4c89f068eb54f64337cf2a23195",
  "phase_1_integration_merge_sha": "9d4c9fb642a2952efb279c0461378e5527891099",
  "main_documentation_head": "316d64ac2a2b59d1e2c33d83c65c4d5a1f19918e",
  "active_milestone": "PHASE_2_RTS_INTERACTION_FOUNDATION",
  "phase_2_entry_gate": "OPEN",
  "phase_2_base_branch": "phase2/phase1-accepted-base",
  "phase_2_base_sha": "9d4c9fb642a2952efb279c0461378e5527891099",
  "phase_2_integration_branch": "qa/phase2-integration",
  "phase_2_status": "RTS_INTERACTION_FOUNDATION_QA_ACCEPTED",
  "phase_2_pr": 76,
  "phase_2_dev_head": "8e6b0f5f00b18661811d1e5a4d984341de4a6f1e",
  "phase_2_integration_merge_sha": "8916dcb35c68f3b976fda730bf73cd3e9a48d3ea",
  "phase_2_validation_run": 35844829713,
  "phase_2_validation_job": 107128336588,
  "phase_2_evidence_artifact": 10742942507,
  "phase_2_evidence_digest": "sha256:134dda8d9b3cce0013bfe95a2e6c019197d5f8f6138f2289ff04e4de894b4f81",
  "next_task": "DEFINE_NEXT_PHASE_2_INCREMENT"
}
```

## Current QA decision

**PHASE 1: COMPLETE / QA ACCEPTED.**  
**ART GATE: PASS — `artGatePassed=true`.**  
**PHASE 2 RTS INTERACTION FOUNDATION: QA ACCEPTED INTO `qa/phase2-integration`.**

PR #76 (`phase2/rts-interaction-foundation`) was admitted into `qa/phase2-integration` as merge commit `8916dcb35c68f3b976fda730bf73cd3e9a48d3ea`. The accepted development head is `8e6b0f5f00b18661811d1e5a4d984341de4a6f1e`.

The PR implements the bounded Phase 2 RTS interaction foundation only:

- RTS camera ownership: WASD/arrows, Q/E rotation, middle-drag pan, wheel zoom and viewport edge-scroll;
- stable simulation unit IDs and fixed-step/interpolated worker movement;
- click, drag-box and Shift-toggle selection;
- contextual right-click MOVE orders with deterministic replacement;
- terrain-derived bounded A* navigation with building/water blockers, explicit ford and no diagonal corner cutting;
- deterministic group destination slots, separation and bounded path-solving queue;
- selection rings, drag rectangle, valid/invalid MOVE markers, selected-count and feedback UI;
- normal five-worker scene plus debug-only 40-unit stress case;
- Phase 2 diagnostics, Node regressions and dedicated browser smoke coverage.

This admission does **not** include economy, combat, construction, production, AI, fog of war, multiplayer, advanced formations, mobile controls or Phase 3 systems.

## Phase 2 validation evidence

Accepted exact-head workflow run `35844829713`, job `107128336588`:

- `npm ci`: PASS;
- deterministic Phase 1 worker/workshop rebuild inputs: PASS;
- TypeScript typecheck: PASS;
- focused Node test suite: **28/28 PASS**;
- production Vite build: PASS;
- Phase 2 WebGL2 interaction smoke: PASS;
- evidence artifact upload: PASS.

The previously failing navigation regression, `bounded A* uses explicit crossing and does not cross blocked water`, passes in the accepted run.

The browser smoke exercised both milestone scenarios:

- five-unit scene: 5 active / 5 selected;
- 40-unit debug scene: 40 active / 11 selected in the captured evidence;
- renderer: WebGL2 under CI SwiftShader;
- runtime remained initialized, started and free of renderer/device-loss failure;
- remount path passed;
- MOVE feedback/marker path passed after the smoke harness was corrected to exercise the controller's right-button `pointerup` path.

Evidence artifact `10742942507` contains:

- `phase2-five-unit-webgl2.png`;
- `phase2-40-unit-webgl2.png`.

Artifact digest: `sha256:134dda8d9b3cce0013bfe95a2e6c019197d5f8f6138f2289ff04e4de894b4f81`.

The screenshots were visually reviewed after CI: the five-unit scene shows five selected units and the stress scene shows the expected large worker group with eleven selected; canvas, RTS overlay and diagnostics are visible without an error state.

## Performance interpretation

`ACTUAL_DESKTOP_GPU_BENCHMARK: NOT_AVAILABLE_IN_THIS_ENVIRONMENT`

SwiftShader/WebGL2 CI is correctness and regression evidence only. It is not desktop-GPU performance evidence. No production FPS, frame-time, VRAM or hardware-device claim is made from this run.

The production build currently emits a large JavaScript chunk warning. That warning does not fail the Phase 2 interaction foundation gate, but code-splitting remains a later optimization candidate if measurements show it is needed.

## Phase 1 baseline carried forward

The accepted Phase 1 benchmark remains the composition selected by `?candidate=phase1`: dwelling LOD1, compact storehouse, repaired project workshop, five compact R2 workers, terrain, stream, paths, meadow and the current vegetation composition.

The canonical accepted Phase 1 commit is `26546b893fa37df4f0c56934b8fabaac8d942218`. The independently reviewed content candidate is `853d802e0512f4c89f068eb54f64337cf2a23195`; its clean integration/base SHA for Phase 2 is `9d4c9fb642a2952efb279c0461378e5527891099`.

## Current integration contract

- PlayCanvas remains the sole game/render engine.
- The engine-independent fixed-step simulation contract remains intact.
- WebGL2 remains the required fallback and explicit QA path.
- Phase 2 development work must branch from an explicitly recorded accepted/integration state and return through the dedicated DEV/QA flow.
- `main` is not changed by the Phase 2 interaction-foundation admission; the accepted code currently lives in `qa/phase2-integration`.
- Do not start Phase 3 or broad economy/combat/AI production merely because the interaction foundation is accepted.

## Next gate

The next Phase 2 increment must be defined explicitly before implementation. It should build on the accepted interaction/navigation foundation rather than replacing it. Any new scope must preserve the current camera, selection, command, fixed-step and navigation regressions and add focused validation for the new behavior.

## Phase gate

**PHASE 0: PASS / ACCEPTED.**  
**PHASE 0.5: PASS / COMPLETE_VERIFIED / DEPLOYED.**  
**PHASE 1: PASS / COMPLETE / QA ACCEPTED / ART GATE PASSED.**  
**PHASE 2: RTS INTERACTION FOUNDATION PASS / QA ACCEPTED IN INTEGRATION; NEXT INCREMENT NOT YET DEFINED.**

## Historical state

Earlier Phase 1 development blockers, superseded candidates and their detailed evidence remain in Git history, PR discussions, `docs/qa/PHASE1_WORK_QUEUE.md` and archive documents. Older `PROJECT_STATE.md` snapshots that described Phase 1 as blocked or `artGatePassed=false` are historical and are superseded by the final Phase 1 acceptance record and this Phase 2 integration record.
