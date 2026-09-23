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
  "phase_3_status": "RECONCILED_BASE_FOR_PHASE_4",
  "active_milestone": "PHASE_4_WOOD_GATHERING_VERTICAL_SLICE",
  "phase_4_status": "DEV_STABILIZATION_AWAITING_INDEPENDENT_QA",
  "phase_4": {
    "task": "P4-WOOD-GATHERING-VERTICAL-SLICE",
    "pr": 92,
    "base_branch": "qa/phase4-integration",
    "base_sha": "0289dfc7b71fbf5a6ceb3e9b352c9d9870f9c30b",
    "head_branch": "phase4/wood-gathering-vertical-slice",
    "implementation_head_before_state_update": "f9feb23e5d465bee3e92e62eb28e12dd70a648ab",
    "pr_state": "OPEN_DRAFT",
    "main_modified": false,
    "independent_qa": "NOT_YET_RECORDED_FOR_CURRENT_HEAD"
  },
  "phase_4_implemented_scope": [
    "ResourceEconomy remains authoritative for finite resource nodes and stockpiles",
    "GatherLoop remains authoritative for worker cargo and gather state",
    "GatherCoordinator orchestrates accepted movement with gather and drop-off",
    "existing deciduous trees map to stable wood resource IDs",
    "existing Boii storehouse maps to a reachable drop-off apron",
    "RMB on mapped wood issues GATHER and RMB terrain MOVE replaces gather routing",
    "carried cargo survives MOVE replacement",
    "finite wood extraction cannot duplicate or go negative",
    "production constants are carry 10, gather 2 wood/s and 100 wood/tree",
    "debug acceleration is restricted to phase4=1&debug=1",
    "selected-worker HUD exposes Gather/Return/Idle task state and carried wood",
    "stalled or lost gather approach routes are deterministically re-issued"
  ],
  "phase_4_dev_evidence": {
    "previous_green_head": "f148ee12b0f8bf0b93d15f26c328f58eba7ea741",
    "previous_green_phase4_workflow_run": 35851056033,
    "previous_green_node_tests": "45/45 passed",
    "previous_green_phase2_smoke": "passed",
    "previous_green_phase3_smoke": "passed",
    "previous_green_phase4_smoke": "passed",
    "previous_green_resource_nodes": 8,
    "previous_green_initial_wood": 800,
    "previous_green_deposited_wood": 2,
    "previous_green_remaining_after_deposit": 790,
    "previous_green_evidence_artifact_id": 10746061441,
    "previous_green_evidence_sha256": "492b9437768ba295c368357f6fbe5a030c0fffb0f9a9d8b44aaf0ce19f8ebcce",
    "current_phase4_workflow_run": 35855768177,
    "current_validation": "in_progress_at_documentation_time",
    "current_full_repository_validation": "passed",
    "current_phase2_smoke": "passed"
  },
  "known_limits": [
    "Worker R2 remains static/unrigged and has no walk or harvesting animation",
    "SwiftShader CI is regression evidence, not desktop-GPU performance evidence",
    "actual desktop-hardware performance remains unmeasured",
    "legacy PROJECT_STATE content lagged behind the reconciled Phase 3/Phase 4 branch history; this file records the reconciled current state without inventing missing historical QA admission claims"
  ],
  "next_step": "Complete CI for the documentation head, then independent QA must test the exact PR #92 head before any merge into qa/phase4-integration. Do not merge to main and do not start a new gameplay phase."
}
```

## Current decision

Phase 4 wood gathering is the active milestone. Development remains on PR #92 from `phase4/wood-gathering-vertical-slice` into `qa/phase4-integration`. The reconciled base is `0289dfc7b71fbf5a6ceb3e9b352c9d9870f9c30b`. The branch consolidation left `main`, `qa/phase4-integration` and `phase4/wood-gathering-vertical-slice`; `main` is not the Phase 4 target.

The previous `PROJECT_STATE.md` was stale and still described Phase 2 as active even on the reconciled Phase 4 base. This update does not manufacture a historical Phase 3 acceptance record. It records that Phase 3 scalable movement and the accepted economy/gather foundation are present in the reconciled base used by the approved Phase 4 task.

## Phase 4 development status

The wood loop is implemented as an engine-independent simulation path coupled to PlayCanvas presentation only at the controller/scene boundary. Production values remain 10 wood carry capacity, 2 wood/second gather rate and 100 wood per mapped tree. Debug acceleration is valid only under `?phase4=1&debug=1`.

Two stabilization changes were added after the previously green Phase 4 head:

1. gather/drop-off routing now detects a finished or lost movement route that is still outside interaction range and deterministically re-issues the approach instead of leaving the worker stranded;
2. the Phase 4 HUD exposes the current selected-worker task (`Gather`, `Return` or `Idle`) and carried wood directly from simulation state, with browser smoke coverage for command, MOVE replacement and remount reset.

## Evidence and QA gate

The previously green head `f148ee12b0f8bf0b93d15f26c328f58eba7ea741` passed workflow `35851056033`: 45/45 Node tests, production build, Phase 2 browser regression, Phase 3 browser regression and Phase 4 browser smoke. The Phase 4 smoke observed 8 mapped nodes / 800 initial wood, a 2-wood deposit and 790 remaining wood, and produced evidence artifact `10746061441` with SHA-256 `492b9437768ba295c368357f6fbe5a030c0fffb0f9a9d8b44aaf0ce19f8ebcce`.

For the newer implementation head `f9feb23e5d465bee3e92e62eb28e12dd70a648ab`, workflow `35855768177` had already passed full repository validation and the Phase 2 browser regression when this documentation update was authored. Remaining CI steps and independent QA must be recorded against the final PR head; no unexecuted check is treated as PASS.

## Phase gate

**PHASE 0: PASS / ACCEPTED.**  
**PHASE 0.5: PASS / COMPLETE_VERIFIED.**  
**PHASE 1: QA-DESIGNATED BASE USED FOR PHASE 2.**  
**PHASE 2: PASS / ACCEPTED IN QA INTEGRATION.**  
**PHASE 3: RECONCILED BASE PRESENT FOR PHASE 4; historical state file was stale.**  
**PHASE 4: DEV STABILIZATION / AWAITING FINAL CI + INDEPENDENT QA.**
