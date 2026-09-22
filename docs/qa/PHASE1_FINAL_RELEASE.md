# Phase 1 final canonical release record

Date: 2026-09-22

## Status

**PHASE 1: COMPLETE / QA ACCEPTED**  
**ART GATE: PASS**  
**PHASE 2 ENTRY GATE: OPEN**

This document is the final release receipt created after canonical admission to `main`. It supplements the accepted content/visual QA records in `docs/PROJECT_STATE.md`, `docs/ASSET_MANIFEST.md`, `docs/qa/PHASE1_WORK_QUEUE.md` and `docs/qa/PHASE1_COMPLETION_HANDOFF.md`.

## Canonical identities

- original independently reviewed complete candidate (PR #71): `853d802e0512f4c89f068eb54f64337cf2a23195`;
- PR #71 QA integration merge: `9d4c9fb642a2952efb279c0461378e5527891099`;
- original accepted candidate/integration Git tree: `1fde280d7a8b61f3a1c87299b400fedc532c3b60`;
- final QA integration closure head: `0eaf2dc551a2f3a1d1540a6562dacfe81ea5e34e`;
- conflict-resolved admission head: `78f0d12a30fcfcad460a6d8d757b87773df9b3c9`;
- canonical `main` admission commit: `26546b893fa37df4f0c56934b8fabaac8d942218`;
- canonical admitted Git tree: `3b002d9c6801692c6b9561ebbbd103d8da5c6b78`;
- final admission PR: **#73 — `QA: final Phase 1 canonical admission`**.

The `main` merge commit `26546b893fa37df4f0c56934b8fabaac8d942218` points to the exact same Git tree `3b002d9c6801692c6b9561ebbbd103d8da5c6b78` as the fresh-validated admission head `78f0d12a30fcfcad460a6d8d757b87773df9b3c9`. Therefore canonical merge did not alter any validated file bytes.

The conflict resolution preserved current-main history and the newer main-only storehouse QA receipt while admitting the QA-approved Phase 1 integration lineage. No force push, history rewrite or wholesale stale-branch replay was used.

## Fresh admission-head validation

All required current-head workflows completed **SUCCESS** against exact head `78f0d12a30fcfcad460a6d8d757b87773df9b3c9` before PR #73 was merged:

| Workflow | Run | Result |
| --- | ---: | --- |
| Validate foundation | `35774232591` | SUCCESS |
| Validate Phase 1 completion candidate | `35774232549` | SUCCESS |
| Validate worker R2 candidate | `35774232581` | SUCCESS |
| Validate compact storehouse current baseline | `35774232567` | SUCCESS |

Observed successful gates include:

- `npm ci`;
- repository `npm run validate` static suite;
- deterministic worker R2 build/compaction and strict GLB intake;
- deterministic repaired workshop export and strict GLB intake;
- compact storehouse regeneration and complete runtime payload verification;
- WebGL2 startup;
- interaction smoke;
- lifecycle / three-remount regression;
- software WebGPU regression;
- Phase 1 benchmark browser smoke;
- complete repaired-workshop + compact-worker candidate browser smoke;
- storehouse admission and close-up smokes.

No validation threshold was relaxed and no failing validation was removed.

## Final fresh evidence artifacts

| Evidence | Artifact ID | Digest |
| --- | ---: | --- |
| Complete Phase 1 repaired candidate | `10715133305` | `sha256:b0a0ae2b1d2a377e663950a9b93fb52032c3d440d30349a80c45116a39c9ec21` |
| Foundation Phase 1 browser evidence | `10715453292` | `sha256:59dba1d81be569f861a8c9d7ae92b7cddf7f5cfe69fd86915382685e8b0de40a` |
| Foundation static build | `10715268664` | `sha256:fe706b857ae7cd7242ebc9136ad343d458c9269efbb497f7e453deac7fe4c4f1` |
| Foundation storehouse browser evidence | `10715088744` | `sha256:13a116cac3a8c4a76c376806b32f6e8938a3e0f22fa44cde626b80efd94c41e0` |
| Foundation Phase 0 WebGL2 evidence | `10715028943` | `sha256:b4ca6828e0aa90186494d3d311f7d19b24665f5333e6f1880baa643254d98a1c` |
| Worker R2 candidate | `10714869061` | `sha256:6e047012ed7949c28f372baeb687603dcea4c5b94152a730ddcf56218dace7ee` |
| Compact storehouse current baseline | `10716035179` | `sha256:8341ea1fcd62ebdcb2c6011a96a813342842df5de1b2a37cd7a9c2f736d4b4cf` |

## Visual / asset disposition

- repaired workshop: **PASS for Phase 1**;
- compact worker R2 equivalence: **PASS**;
- complete settlement benchmark: **PASS for Phase 1**;
- required benchmark assets: load successfully through PlayCanvas runtime;
- no unresolved Phase 1 art/asset blocker remains.

Accepted later-phase limitations remain non-blocking: full production PBR-map polish, worker rig/animation, vegetation polish and real-hardware tree-LOD tuning.

## Performance evidence

`ACTUAL_DESKTOP_GPU_BENCHMARK: NOT_AVAILABLE_IN_THIS_ENVIRONMENT`

Software-renderer CI is regression evidence only. No 60 FPS, desktop GPU, frame-time, VRAM or production LOD threshold claim is fabricated. QA explicitly accepts the missing hardware benchmark as `BLOCKS_PHASE_2=NO`; later performance tuning must use actual desktop hardware.

## Phase 2 entry contract

- `PHASE_2_ENTRY_GATE: OPEN`
- `PHASE_1_ACCEPTED_SHA: 26546b893fa37df4f0c56934b8fabaac8d942218` (canonical `main` admission)
- underlying independently reviewed content candidate: `853d802e0512f4c89f068eb54f64337cf2a23195`
- `PHASE_2_BASE_BRANCH: phase2/phase1-accepted-base`
- `PHASE_2_BASE_SHA: 9d4c9fb642a2952efb279c0461378e5527891099`
- `PHASE_2_INTEGRATION_BRANCH: qa/phase2-integration`
- `NEXT_TASK: P2-RTS-INTERACTION-FOUNDATION`

The dedicated Phase 2 task must implement only the interaction foundation. No Phase 2 gameplay systems were added during this closure.