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
  "phase_4_status": "DEV_STABILIZATION_CI_GREEN_AWAITING_INDEPENDENT_QA",
  "phase_4": {
    "task": "P4-WOOD-GATHERING-VERTICAL-SLICE",
    "pr": 92,
    "base_branch": "qa/phase4-integration",
    "base_sha": "0289dfc7b71fbf5a6ceb3e9b352c9d9870f9c30b",
    "head_branch": "phase4/wood-gathering-vertical-slice",
    "current_code_candidate_sha": "8bb08c50a5f809a79516756a13cbd9edbee918a7",
    "pr_state": "OPEN_DRAFT",
    "main_modified": false,
    "independent_qa": "HANDOFF_POSTED_FOR_CODE_CANDIDATE_RETEST"
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
    "stalled or lost gather approach routes are deterministically re-issued",
    "fixed host information panel stacks above world-space resource markers",
    "fixed diagnostics panel stacks above world-space resource markers"
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
    "current_code_candidate": "8bb08c50a5f809a79516756a13cbd9edbee918a7",
    "current_phase4_workflow_run": 35906865576,
    "current_validation": "passed",
    "current_full_repository_validation": "passed",
    "current_phase2_smoke": "passed",
    "current_phase3_smoke": "passed",
    "current_phase4_smoke": "passed",
    "current_evidence_artifact_id": 10772095789,
    "current_evidence_sha256": "3a361b7d082d31b8a2ec86c51fa96092a81f656a04a36bdbf230818d9f0ca463",
    "dev_visual_evidence_review": "right diagnostics readable in gather-command and wood-deposited 1920x1080 WebGL2 screenshots",
    "qa_handoff_comment": 5801120492
  },
  "qa_findings": {
    "QA-P4-001": "FIXED_IN_CODE_CANDIDATE_AWAITING_EXACT_HEAD_QA_VERDICT",
    "QA-P4-002": "NON_BLOCKING_PER_QA_INTEGRATION_INVARIANT",
    "QA-DOC-001": "PASS_ON_CONTENT_REVIEW",
    "QA-VIS-001": "PASS_FIX_VERIFIED_ON_A1ACAEE",
    "QA-VIS-002": "FIXED_IN_CODE_CANDIDATE_AWAITING_VISUAL_RETEST",
    "QA-CONSOLE-NETWORK-COVERAGE": "COVERAGE_GAP_NOT_REPRODUCED_DEFECT"
  },
  "known_limits": [
    "Worker R2 remains static/unrigged and has no walk or harvesting animation",
    "SwiftShader CI is regression evidence, not desktop-GPU performance evidence",
    "actual desktop-hardware performance remains unmeasured",
    "explicit CDP console/unhandled-rejection/4xx-5xx audit is not part of the current smoke harness and remains a QA coverage gap rather than a reproduced defect",
    "legacy PROJECT_STATE content lagged behind the reconciled Phase 3/Phase 4 branch history; this file records the reconciled current state without inventing missing historical QA admission claims"
  ],
  "next_step": "Independent QA must retest runtime code candidate 8bb08c50... against the current PR contents, especially QA-VIS-002, and issue an evidence-backed verdict before any merge into qa/phase4-integration. This documentation update may itself become the PR tip without changing runtime code. Do not merge to main and do not start a new gameplay phase."
}
```

## Current decision

Phase 4 wood gathering is the active milestone. Development remains on PR #92 from `phase4/wood-gathering-vertical-slice` into `qa/phase4-integration`. The reconciled base is `0289dfc7b71fbf5a6ceb3e9b352c9d9870f9c30b`. The current runtime code candidate is `8bb08c50a5f809a79516756a13cbd9edbee918a7`; this documentation update may itself become the PR tip without changing runtime code. `main` is not the Phase 4 target.

The previous project-state history was stale and still described Phase 2 as active even on the reconciled Phase 4 base. This file does not manufacture a historical Phase 3 QA admission record. It records only the reconciled branch state and evidence that can be tied to concrete commits/workflows.

## Phase 4 development status

The wood loop is implemented as an engine-independent simulation path coupled to PlayCanvas presentation only at the controller/scene boundary. Production values remain 10 wood carry capacity, 2 wood/second gather rate and 100 wood per mapped tree. Debug acceleration is valid only under `?phase4=1&debug=1`.

Stabilization after the previously green Phase 4 head now includes:

1. gather/drop-off routing detects a finished or lost movement route still outside interaction range and deterministically re-issues the approach instead of leaving the worker stranded;
2. the Phase 4 HUD exposes selected-worker task state (`Gather`, `Return`, `Idle`) and carried wood directly from simulation state, with browser smoke coverage for command state, MOVE replacement and remount reset;
3. the fixed host information panel explicitly stacks above world-space resource markers, resolving `QA-VIS-001` without changing Phase 2/3 interaction semantics;
4. the fixed right-side diagnostics panel now also stacks above the Phase 4 world-space marker overlay, addressing `QA-VIS-002` with a CSS-only change;
5. `PROJECT_STATE.md` is reconciled to PR #92 / Phase 4, addressing `QA-DOC-001`.

`QA-P4-002` was downgraded by independent QA to non-blocking because the actual `RtsBenchmarkScene` requires a same-component reachable storehouse apron or fails startup before `GatherCoordinator` is constructed. Generic coordinator hardening remains optional and is not added to this scoped stabilization patch.

## Evidence and QA gate

The previously green head `f148ee12b0f8bf0b93d15f26c328f58eba7ea741` passed workflow `35851056033`: 45/45 Node tests, production build, Phase 2 browser regression, Phase 3 browser regression and Phase 4 browser smoke. The smoke observed 8 mapped nodes / 800 initial wood, a 2-wood deposit and 790 remaining wood, and produced evidence artifact `10746061441` with SHA-256 `492b9437768ba295c368357f6fbe5a030c0fffb0f9a9d8b44aaf0ce19f8ebcce`.

For runtime code candidate `8bb08c50a5f809a79516756a13cbd9edbee918a7`, Phase 4 workflow `35906865576` is PASS: full repository validation, Phase 2 browser regression, Phase 3 scalable movement regression and Phase 4 WebGL2 smoke all succeeded. Evidence artifact `10772095789` has SHA-256 `3a361b7d082d31b8a2ec86c51fa96092a81f656a04a36bdbf230818d9f0ca463`. DEV inspection of `phase4-gather-command-webgl2.png` and `phase4-wood-deposited-webgl2.png` at 1920×1080 confirms the right diagnostics text is no longer overpainted by resource markers. This is development evidence, not a substitute for the independent QA verdict requested in PR comment `5801120492`.

Independent QA already verified `QA-VIS-001` on head `a1acaee972cfd0daadedfa2b58c58ce16c4e654c` and then opened `QA-VIS-002`. Independent QA also recorded that an explicit browser console/unhandled-rejection/404 audit is not currently run; that is a coverage gap, not a reproduced Phase 4 defect.

## Phase gate

**PHASE 0: PASS / ACCEPTED.**  
**PHASE 0.5: PASS / COMPLETE_VERIFIED.**  
**PHASE 1: QA-DESIGNATED BASE USED FOR PHASE 2.**  
**PHASE 2: PASS / ACCEPTED IN QA INTEGRATION.**  
**PHASE 3: RECONCILED BASE PRESENT FOR PHASE 4; historical state file was stale.**  
**PHASE 4: DEV CI GREEN / AWAITING INDEPENDENT QA VERDICT.**
