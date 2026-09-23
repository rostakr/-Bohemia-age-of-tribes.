# Project state

```json
{
  "schema_version": 4,
  "project": "BOHEMIA: AGE OF TRIBES",
  "updated": "2026-09-23",
  "engine": "playcanvas@2.22.1",
  "phase_0_status": "COMPLETE_ACCEPTED",
  "phase_0_5_status": "COMPLETE_VERIFIED",
  "phase_1_status": "QA_DESIGNATED_ACCEPTED_BASE_FOR_PHASE_2",
  "active_milestone": "PHASE_2_RTS_INTERACTION_FOUNDATION",
  "phase_2_status": "ACCEPTED_IN_QA_INTEGRATION",
  "phase_3_status": "NOT_AUTHORIZED_SCOPE_UNDEFINED",
  "qa_integration": {
    "branch": "qa/phase2-integration",
    "accepted_pr": 76,
    "accepted_head": "8e6b0f5f00b18661811d1e5a4d984341de4a6f1e",
    "merge_sha": "8916dcb35c68f3b976fda730bf73cd3e9a48d3ea",
    "main_modified_by_phase_2_admission": false,
    "flow": "feature DEV branch -> qa/phase2-integration -> independent QA -> integration",
    "next_step": "post-acceptance cleanup and explicit definition of the next milestone before any large economy/combat/AI implementation"
  },
  "phase_2_validation": {
    "foundation_workflow_run": 35844829656,
    "compact_storehouse_workflow_run": 35844829668,
    "worker_r2_workflow_run": 35844829657,
    "phase_1_completion_workflow_run": 35844829718,
    "phase_2_rts_workflow_run": 35844829713,
    "result": "all_success",
    "node_tests": "28/28 passed",
    "production_build": "passed",
    "webgl2_phase_2_smoke": "passed",
    "five_unit_selection": 5,
    "forty_unit_debug_active": 40,
    "forty_unit_visible_box_selection": 11,
    "evidence_artifact_id": 10742942507,
    "evidence_artifact_sha256": "134dda8d9b3cce0013bfe95a2e6c019197d5f8f6138f2289ff04e4de894b4f81"
  },
  "phase_2_accepted_scope": [
    "RTS camera input ownership: WASD/arrows, Q/E rotation, middle-drag pan, wheel zoom and viewport edge-scroll",
    "stable simulation unit IDs independent of PlayCanvas entities",
    "fixed-step MOVE simulation with render interpolation",
    "click, drag-box and Shift selection",
    "contextual right-click MOVE commands with deterministic replacement",
    "terrain-derived bounded A* navigation",
    "building and river blockers with explicit ford crossing",
    "no diagonal corner cutting and bounded nearest-reachable destination resolution",
    "deterministic group destination slots and lightweight separation",
    "bounded path-solving queue including a 40-unit debug case",
    "selection rings, drag rectangle, command markers, selected count and feedback",
    "Phase 2 diagnostics and browser regression evidence"
  ],
  "deferred_scope": [
    "economy",
    "combat",
    "construction",
    "production",
    "AI",
    "fog of war",
    "control groups and advanced formations",
    "multiplayer",
    "mobile controls",
    "engine migration"
  ],
  "known_limits": [
    "Worker R2 is static/unrigged and has no walk animation",
    "SwiftShader CI is regression evidence, not desktop-GPU performance evidence",
    "actual desktop-hardware performance remains unmeasured",
    "Phase 2 admission does not authorize an undefined Phase 3 scope"
  ]
}
```

## Current decision

Phase 2 RTS interaction foundation is accepted into `qa/phase2-integration`. The accepted PR is #76. The exact reviewed head was `8e6b0f5f00b18661811d1e5a4d984341de4a6f1e`, merged as `8916dcb35c68f3b976fda730bf73cd3e9a48d3ea`.

This branch is now the authoritative integration baseline for further Phase 2 cleanup and for defining the next milestone. Do not start new work from the older Phase 1 integration branch or from the pre-Phase-2 feature branch.

## Phase 2 acceptance evidence

The final reviewed head passed all repository workflows that were active for the PR:

- foundation: `35844829656` — PASS;
- compact storehouse current baseline: `35844829668` — PASS;
- Worker R2 candidate: `35844829657` — PASS;
- Phase 1 completion candidate: `35844829718` — PASS;
- Phase 2 RTS interaction foundation: `35844829713` — PASS.

The Phase 2 workflow passed strict TypeScript, 28/28 Node tests, the production Vite build and the WebGL2 interaction smoke. The smoke selected all five normal workers, exercised MOVE, remount, and the 40-worker debug scene. The final evidence artifact is `10742942507` with SHA-256 `134dda8d9b3cce0013bfe95a2e6c019197d5f8f6138f2289ff04e4de894b4f81`.

## Accepted runtime behavior

The integration baseline now contains a real RTS interaction layer rather than the old inspection-only input model. Selection is handled by left click/drag with Shift toggle. MOVE is issued with right click. Camera control uses keyboard/edge pan, middle-drag pan, wheel zoom and Q/E rotation. Simulation remains engine-independent and fixed-step, while PlayCanvas remains the sole render/game engine.

Navigation is terrain-derived and bounded. River/building blockers are respected, the explicit ford is traversable, diagonal corner cutting is prevented, and invalid targets can resolve to bounded reachable ground. Group MOVE uses deterministic destination slots and bounded path solving.

## Scope still excluded

Phase 2 acceptance does not include economy, combat, construction, production, AI, fog of war, control groups, advanced formations, multiplayer, mobile controls or any engine migration. Those systems require an explicitly defined subsequent milestone before implementation.

## Known limitations

Worker R2 remains intentionally static/unrigged, so movement currently has no fabricated walk animation. CI rendering uses SwiftShader/software WebGL2 and therefore must not be used to claim production FPS or desktop-GPU performance. Actual-hardware performance remains a separate future gate.

The post-acceptance cleanup branch updates the stale host control copy and ensures `index.html` changes trigger the dedicated Phase 2 validation workflow.

## Phase gate

**PHASE 0: PASS / ACCEPTED.**  
**PHASE 0.5: PASS / COMPLETE_VERIFIED.**  
**PHASE 1: QA-DESIGNATED BASE USED FOR PHASE 2.**  
**PHASE 2 RTS INTERACTION FOUNDATION: PASS / ACCEPTED INTO `qa/phase2-integration`.**  
**PHASE 3: NOT AUTHORIZED / SCOPE NOT YET DEFINED.**
