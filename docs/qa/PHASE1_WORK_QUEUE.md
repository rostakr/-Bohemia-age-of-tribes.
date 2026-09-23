# Phase 1 QA / DEV work queue

This file is the authoritative closure record for Phase 1.

Updated: 2026-09-23

## Final state

- `PHASE 1: COMPLETE / QA ACCEPTED`
- `artGatePassed=true`
- `QA_ACTIVE: none`
- unresolved Phase 1 blockers: **none**
- Phase 2 authorization: **OPEN**
- canonical accepted Phase 1 commit: `26546b893fa37df4f0c56934b8fabaac8d942218`
- independently reviewed complete candidate: `853d802e0512f4c89f068eb54f64337cf2a23195`
- accepted integration merge: `9d4c9fb642a2952efb279c0461378e5527891099`
- reviewed candidate/integration Git tree: `1fde280d7a8b61f3a1c87299b400fedc532c3b60`
- canonical admission tree: `3b002d9c6801692c6b9561ebbbd103d8da5c6b78`
- accepted benchmark route: `?candidate=phase1`
- canonical admission PR: **#73**
- final release evidence PR: **#74**

PR #71 is the independently reviewed complete Phase 1 content candidate. Independent QA reviewed its repaired workshop, compact R2 worker equivalence, complete settlement composition and exact current-head runtime evidence. The candidate head and its integration merge contain the same Git tree, so the reviewed content bytes are unchanged by the merge. PR #73 is the canonical admission to `main` after fresh validation of the conflict-resolved admission head; PR #74 records the release evidence.

## Final QA evidence

Exact candidate head `853d802e0512f4c89f068eb54f64337cf2a23195`:

- foundation `35769849049`: **SUCCESS**;
- completion candidate `35769849029`: **SUCCESS**;
- worker R2 `35769849012`: **SUCCESS**;
- completion evidence artifact `10713746346`, digest `sha256:16152d8d000eb58eb7aae6627d6b87fa68e05258b9e98ae3becda4f9bcbd7224`;
- foundation Phase 1 browser artifact `10713692561`, digest `sha256:c1ed3ccf3e8a5c3746920091217f1c21d0f86f57dc6baee471a3cdec3a36e408`.

Fresh canonical-admission head `78f0d12a30fcfcad460a6d8d757b87773df9b3c9`:

- foundation `35774232591`: **SUCCESS**;
- completion candidate `35774232549`: **SUCCESS**;
- worker R2 `35774232581`: **SUCCESS**;
- compact storehouse `35774232567`: **SUCCESS**;
- completion artifact `10715133305`;
- Phase 1 browser artifact `10715453292`;
- worker artifact `10714869061`;
- compact storehouse artifact `10716035179`.

Foundation CI passed repository validation, WebGL2, interactions, lifecycle/remount, software WebGPU, Phase 1 browser smoke, storehouse admission and close-up regression. Completion validation deterministically rebuilt the worker/workshop, passed strict workshop GLB intake and rendered the combined candidate through PlayCanvas WebGL2.

`ACTUAL_DESKTOP_GPU_BENCHMARK: NOT_AVAILABLE_IN_THIS_ENVIRONMENT`. This is explicitly accepted as a non-blocking deferral for Phase 2. No software-renderer FPS is treated as hardware performance evidence; tree LOD thresholds remain untuned until actual desktop-GPU measurement.

## Final dispositions

| PR | Final disposition |
| ---: | --- |
| #73 | **CANONICAL PHASE 1 ADMISSION / ACCEPTED** — current-main admission of the independently QA-approved Phase 1 content after fresh current-head validation. |
| #74 | **FINAL RELEASE EVIDENCE / ACCEPTED** — documentation-only receipt for the canonical admission and final workflow/artifact evidence. |
| #71 | **FINAL REVIEWED CONTENT CANDIDATE / ACCEPTED** — repaired workshop + compact R2 worker + complete benchmark; merged to integration at `9d4c9fb642a2952efb279c0461378e5527891099`. |
| #68 | **ACCEPTED COMPONENT / HISTORICAL** — lossless compact worker used by #71; rendering equivalent to accepted #65 worker. |
| #65 | **ACCEPTED COMPONENT / HISTORICAL** — visual worker R2 precursor. |
| #60 | **ACCEPTED COMPONENT / HISTORICAL** — compact storehouse baseline included in final integration lineage. |
| #63 | **BLOCKED / HISTORICAL ONLY** — earlier workshop preview; its blockers were repaired by #71. Do not reactivate. |
| #55 | **PARKED / LATER-PHASE** — tree LOD candidates; runtime thresholds require actual hardware evidence. Does not block Phase 2. |
| #43, #48, #58, #64, #66 | **SUPERSEDED / HISTORICAL ONLY** — retained for evidence; not current merge candidates. |

No stale `READY_FOR_QA`, `QA_ACTIVE` or `BLOCKED` item in this Phase 1 queue prevents Phase 2.

## Accepted non-blocking limitations

- storehouse full production PBR maps: `BLOCKS_PHASE_2=NO`;
- workshop full production PBR maps: `BLOCKS_PHASE_2=NO`;
- static/unrigged worker: `BLOCKS_PHASE_2=NO`;
- tree LOD hardware thresholds: `BLOCKS_PHASE_2=NO`;
- vegetation polish: `BLOCKS_PHASE_2=NO`;
- missing actual desktop-GPU benchmark in this environment: `BLOCKS_PHASE_2=NO`.

These are later art/animation/performance work, not reasons to delay the dedicated Phase 2 interaction task.

## Phase 2 release contract

- `PHASE_2_ENTRY_GATE: OPEN`
- `PHASE_1_ACCEPTED_SHA: 26546b893fa37df4f0c56934b8fabaac8d942218`
- `PHASE_1_REVIEWED_CANDIDATE_SHA: 853d802e0512f4c89f068eb54f64337cf2a23195`
- `PHASE_2_BASE_BRANCH: phase2/phase1-accepted-base`
- `PHASE_2_BASE_SHA: 9d4c9fb642a2952efb279c0461378e5527891099`
- `PHASE_2_INTEGRATION_BRANCH: qa/phase2-integration`
- `NEXT_TASK: P2-RTS-INTERACTION-FOUNDATION`

The authoritative Phase 2 base branch and `qa/phase2-integration` both point to `9d4c9fb642a2952efb279c0461378e5527891099`. Separate unmerged Phase 2 development branches are not part of this Phase 1 closure and must not be treated as accepted Phase 2 implementation.

This queue does not authorize economy, combat, construction, AI, fog of war, multiplayer or other later-phase systems.

## Historical note

The earlier queue states remain available through Git history and associated PR evidence. They are intentionally not repeated as current blockers here. GitHub PR/workflow history remains the coordination source of truth for the chronology.