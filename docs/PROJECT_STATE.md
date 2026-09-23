# Project state

```json
{
  "schema_version": 5,
  "project": "BOHEMIA: AGE OF TRIBES",
  "updated": "2026-09-23",
  "engine": "playcanvas@2.22.1",
  "phase_0_status": "COMPLETE_ACCEPTED",
  "phase_0_5_status": "COMPLETE_VERIFIED",
  "phase_1_status": "QA_DESIGNATED_ACCEPTED_BASE_FOR_PHASE_2",
  "phase_2_status": "ACCEPTED_IN_QA_INTEGRATION",
  "active_milestone": "PHASE_3_WOOD_GATHERING_VERTICAL_SLICE",
  "phase_3_status": "DEV_IMPLEMENTATION_ACTIVE_NOT_ACCEPTED",
  "phase_2_acceptance": {
    "branch": "qa/phase2-integration",
    "accepted_pr": 76,
    "accepted_head": "8e6b0f5f00b18661811d1e5a4d984341de4a6f1e",
    "merge_sha": "8916dcb35c68f3b976fda730bf73cd3e9a48d3ea",
    "post_acceptance_cleanup_pr": 78,
    "post_acceptance_cleanup_merge": "2b1234a590a75ec40c92625fcdd14fc27f45f959",
    "main_modified_by_phase_2_admission": false
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
  "phase_3": {
    "scope_pr": 82,
    "scope_merge_sha": "fe57f983b1bcb01fc89080ccc8d6c948e2eecc7c",
    "scope_document": "docs/PHASE_3_SCOPE_PROPOSAL.md",
    "integration_branch": "qa/phase3-integration",
    "feature_branch": "phase3/wood-gathering-foundation",
    "dev_pr": 84,
    "qa_status": "not_yet_handed_off",
    "goal": "complete deterministic wood source -> carry -> storehouse deposit -> repeat/depletion loop",
    "resource_type": "wood",
    "carry_capacity": 10,
    "gather_rate_per_second": 2,
    "test_tree_amount": 100
  },
  "phase_3_scope": [
    "stable engine-free resource-node IDs and finite wood amounts",
    "player wood stockpile ledger",
    "fixed-step gather/carry/drop-off state machine",
    "GATHER and STOP command execution with deterministic replacement",
    "bounded navigation to resource and storehouse approach points",
    "existing benchmark trees mapped as wood nodes",
    "existing accepted Boii storehouse mapped as drop-off",
    "contextual right-click tree GATHER while right-click ground remains MOVE",
    "minimal resource markers and wood stockpile QA HUD",
    "focused Node regressions and dedicated browser smoke"
  ],
  "phase_3_explicitly_excluded": [
    "food gathering gameplay",
    "stone gathering gameplay",
    "iron gathering gameplay",
    "trade wealth gameplay",
    "construction",
    "repair execution",
    "production queues",
    "population cap",
    "combat",
    "enemy AI",
    "fog of war",
    "multiplayer",
    "worker animation or rigging",
    "new production art",
    "advanced formations and control groups",
    "mobile controls",
    "engine migration"
  ],
  "known_limits": [
    "Worker R2 is static/unrigged and has no walk animation",
    "SwiftShader CI is regression evidence, not desktop-GPU performance evidence",
    "actual desktop-hardware performance remains unmeasured",
    "Phase 3 is development work and is not accepted until independent QA passes on the final exact head"
  ]
}
```

## Current decision

Phase 2 RTS interaction foundation remains the accepted regression baseline. The authoritative Phase 2 integration state includes PR #76 plus post-acceptance cleanup PR #78. `main` was not modified by these QA admissions.

The next milestone is now explicitly defined: **Phase 3 — Wood Gathering Vertical Slice**. Its scope was reviewed and merged through PR #82 as `fe57f983b1bcb01fc89080ccc8d6c948e2eecc7c`. A dedicated `qa/phase3-integration` branch is based on that accepted scope. Implementation is active on `phase3/wood-gathering-foundation` in draft PR #84.

Phase 3 is not yet accepted. No final Phase 3 workflow/evidence IDs may be recorded until the exact handoff HEAD has passed independent QA.

## Phase 2 accepted runtime behavior

Selection uses left click/drag with Shift toggle. MOVE uses contextual right click on terrain. Camera control uses keyboard/edge pan, middle-drag pan, wheel zoom and Q/E rotation. Simulation is engine-independent and fixed-step while PlayCanvas remains the sole render/game engine.

Navigation is terrain-derived and bounded. River/building blockers are respected, the explicit ford is traversable, diagonal corner cutting is prevented, invalid targets resolve only to bounded reachable ground, and group MOVE uses deterministic destination slots with bounded path processing.

## Phase 3 development target

The Phase 3 slice adds one economy loop only: wood. Existing benchmark trees become finite simulation resource nodes and the existing Boii storehouse becomes the local drop-off. Selected workers can be ordered to gather from marked trees, travel using the accepted Phase 2 navigation, extract wood deterministically, carry a bounded amount, return it to the storehouse, deposit it into a player ledger and repeat until depletion or command replacement.

All authoritative resource quantities, carry state and gather timing remain in `src/core/*`. PlayCanvas entities are presentation/mapping objects only. No second game loop is introduced.

## Validation gate

Phase 3 DEV handoff requires strict TypeScript, the complete repository test/build suite, focused wood-gathering Node tests, the existing Phase 2 browser regression, a dedicated Phase 3 WebGL2 browser smoke, screenshots before/after deposit, exact workflow/artifact IDs and independent QA of the final HEAD.

## Phase gate

**PHASE 0: PASS / ACCEPTED.**  
**PHASE 0.5: PASS / COMPLETE_VERIFIED.**  
**PHASE 1: QA-DESIGNATED BASE USED FOR PHASE 2.**  
**PHASE 2 RTS INTERACTION FOUNDATION: PASS / ACCEPTED.**  
**PHASE 3 WOOD GATHERING VERTICAL SLICE: DEV ACTIVE / NOT YET ACCEPTED.**
