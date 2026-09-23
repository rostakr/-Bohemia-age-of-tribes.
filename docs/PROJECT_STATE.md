# Project state

## Current coordination status — 2026-09-23

This section supersedes historical active-milestone and next-task fields below. Historical acceptance evidence remains intact.

- Active work: Phase 4 admission reconciliation and isolated exact-SHA preview. **Do not start Phase 5.**
- Phase 4 PR #92 is CLOSED / MERGED into `qa/phase4-integration`. Feature tip: `9b03587aed8d8598765e8d5560322321ddf890d3`; runtime candidate: `8bb08c50a5f809a79516756a13cbd9edbee918a7`; merge commit: `be18ce556e0fc25baad758a6256af402314ae42b`.
- Independent QA comment #5801467209 reports the runtime workflows green and QA-VIS-002 verified. Exact-tip Phase 4 workflow `35907705268` passed on documentation-only feature tip `9b03587...`.
- Before this reconciliation, `qa/phase4-integration` resolved to `02183da9419d9750070cbba693e18729dbc4b0dd`. Direct compare against feature tip `9b03587...` showed the branch ahead by two commits and only `docs/PROJECT_STATE.md` changed; gameplay/package/public content was not changed by that integration discrepancy.
- This checkpoint repairs QA-DOC-003/source-of-truth drift only. No gameplay, assets, dependencies, CI expectations or production constants are changed, so browser/game suites are intentionally not repeated for this documentation-only correction.
- Remaining Phase 4 coverage to group into one targeted preview QA pass: active-gather pause/resume, closer-camera readability, explicit console/unhandled-rejection/network audit, and real deployed asset/runtime loading.
- Preview blocker remains concrete: `.github/workflows/deploy-pages.yml` is manual and its build job permits only `refs/heads/main`. Do not merge unfinished Phase 4 into `main` and do not overwrite the existing public release merely to obtain a preview.
- Next implementation task: deliver an isolated preview pinned to an exact Phase 4 SHA using the existing build/hosting constraints, enter via `?phase4=1` without `debug=1`, expose build identification, then verify select -> GATHER -> carry -> deposit at production constants on the actual deployed game.
- Professional visual readiness remains OPEN. Worker R2 remains static/unrigged. The separate worker/readability/settlement visual package starts only after Phase 4 QA acceptance.
- Remote-state warning discovered after this checkpoint: PR #93 is now reported CLOSED / MERGED from `qa/phase4-integration` into `main`, using integration head `02183da9419d9750070cbba693e18729dbc4b0dd`. Current `main` is `b482030d8736a44f0e68508410edf4593f3c1283` and is a descendant of that integration head. This happened outside this run and invalidates the earlier assumption that Phase 4 was not on `main`.
- Current `main` also contains a published-preview verification harness (`scripts/browser-published-phase4-smoke.mjs`) and expanded `.github/workflows/verify-pages.yml`, but no workflow run is associated with current main SHA `b482030...`; therefore a working published Phase 4 preview is **not verified** by this run.
- Because another owner/run changed `main` and the deployment/verification path after the prior checkpoint, do not create a competing preview implementation from this branch. First reconcile the external #93/main publication state and obtain an evidence-backed deployed QA verdict; only then decide whether any preview code change remains necessary.
- Follow-up verification attempt: the expected GitHub Pages player URL `https://rostakr.github.io/-Bohemia-age-of-tribes./?phase4=1` could not be loaded from the available external web verifier, and the GitHub connector exposes no workflow-dispatch operation in this session. Therefore no deployment success, build SHA receipt, runtime asset load, or production gather/deposit PASS is claimed. This is an execution-capability blocker, not a gameplay PASS/FAIL.

## Historical Phase 1 acceptance record

```json
{
  "schema_version": 5,
  "project": "BOHEMIA: AGE OF TRIBES",
  "updated": "2026-09-23",
  "engine": "playcanvas@2.22.1",
  "phase_0_status": "COMPLETE_ACCEPTED",
  "phase_0_5_status": "COMPLETE_VERIFIED",
  "active_milestone": "PHASE_2_RTS_INTERACTION_FOUNDATION",
  "phase_1_authorized": true,
  "phase_1_status": "COMPLETE_QA_ACCEPTED",
  "art_gate_passed": true,
  "phase_1_accepted_sha": "26546b893fa37df4f0c56934b8fabaac8d942218",
  "phase_1_reviewed_candidate_sha": "853d802e0512f4c89f068eb54f64337cf2a23195",
  "phase_1_integration_merge_sha": "9d4c9fb642a2952efb279c0461378e5527891099",
  "phase_1_reviewed_content_tree_sha": "1fde280d7a8b61f3a1c87299b400fedc532c3b60",
  "phase_1_canonical_admission_tree_sha": "3b002d9c6801692c6b9561ebbbd103d8da5c6b78",
  "phase_1_release_pr": 73,
  "phase_1_release_evidence_pr": 74,
  "main_at_final_qa_start": "a845caafc1ccf6268facde48539c75520c0ba921",
  "canonical_phase_1_benchmark_query": "?candidate=phase1",
  "phase_2_entry_gate": "OPEN",
  "phase_2_base_branch": "phase2/phase1-accepted-base",
  "phase_2_base_sha": "9d4c9fb642a2952efb279c0461378e5527891099",
  "phase_2_integration_branch": "qa/phase2-integration",
  "next_task": "P2-RTS-INTERACTION-FOUNDATION"
}
```

## Final Phase 1 QA decision

**PHASE 1: COMPLETE / QA ACCEPTED.**  
**ART GATE: PASS — `artGatePassed=true`.**  
**PHASE 2 ENTRY GATE: OPEN.**

The single canonical accepted Phase 1 commit is `26546b893fa37df4f0c56934b8fabaac8d942218`, admitted to `main` by PR #73 after fresh current-head validation. The underlying complete content candidate independently reviewed in PR #71 is `853d802e0512f4c89f068eb54f64337cf2a23195`; it was merged into `qa/phase1-integration` as `9d4c9fb642a2952efb279c0461378e5527891099`. The PR #71 candidate and integration merge have the same Git tree, `1fde280d7a8b61f3a1c87299b400fedc532c3b60`, so the independently reviewed runtime/content bytes were unchanged by that integration merge.

The canonical admission head used for PR #73 was `78f0d12a30fcfcad460a6d8d757b87773df9b3c9`; the resulting `main` admission commit `26546b893fa37df4f0c56934b8fabaac8d942218` has the identical admitted tree `3b002d9c6801692c6b9561ebbbd103d8da5c6b78`. PR #74 subsequently added only the final release receipt/documentation.

The accepted benchmark is the explicit Phase 1 composition selected by `?candidate=phase1`: dwelling LOD1, compact storehouse, repaired project workshop, five compact R2 workers, terrain, stream, paths, meadow and the current vegetation composition.

## Final validation evidence

Exact PR #71 head `853d802e0512f4c89f068eb54f64337cf2a23195`:

- foundation workflow run `35769849049`: **SUCCESS**;
- Phase 1 completion workflow run `35769849029`: **SUCCESS**;
- worker R2 workflow run `35769849012`: **SUCCESS**;
- completion evidence artifact `10713746346`, digest `sha256:16152d8d000eb58eb7aae6627d6b87fa68e05258b9e98ae3becda4f9bcbd7224`;
- foundation Phase 1 browser evidence artifact `10713692561`, digest `sha256:c1ed3ccf3e8a5c3746920091217f1c21d0f86f57dc6baee471a3cdec3a36e408`.

Fresh conflict-resolved admission head `78f0d12a30fcfcad460a6d8d757b87773df9b3c9` before PR #73 merge:

- foundation `35774232591`: **SUCCESS**;
- Phase 1 completion candidate `35774232549`: **SUCCESS**;
- worker R2 `35774232581`: **SUCCESS**;
- compact storehouse `35774232567`: **SUCCESS**;
- complete Phase 1 evidence artifact `10715133305`;
- Phase 1 browser evidence artifact `10715453292`;
- worker evidence artifact `10714869061`;
- compact storehouse evidence artifact `10716035179`.

Observed gates include `npm ci`, repository validation, deterministic worker generation/compaction, deterministic repaired-workshop export, strict GLB intake, production build, WebGL2 startup, interaction smoke, lifecycle/three-remount regression, software WebGPU regression, Phase 1 benchmark, full completion candidate, storehouse admission and storehouse close-up. No validation threshold was relaxed and no failing validation was removed.

## Independent visual QA

### Repaired workshop — PASS

The #63 blocker classes are resolved sufficiently for the Phase 1 milestone:

- roof/thatch reads warm and materially darker rather than extremely pale/flat;
- roof-edge strands are restrained and do not form a noisy escaping fringe;
- bench/trestle work surfaces and iron tools remain readable at the dedicated craft view;
- the ground treatment reads as a shallow irregular earth patch rather than a raised dark rectangular slab;
- no obvious floating structure, catastrophic seam, severe z-fighting or unexpected metallic response is visible at the reviewed normal-game camera distance;
- generated GLB remains inside the documented production target at 22,540 triangles / 25,649 vertices, with NORMAL and UV0 on all five material primitives and no external dependencies.

### Compact worker R2 — PASS / equivalent

PR #68 compaction preserves the already accepted #65 worker rendering while changing storage/layout only. It keeps 28,212 triangles, reduces vertices from 56,424 to 20,725 and size from 3,615,224 to 2,106,832 bytes. Its equivalence checker verifies raw POSITION/NORMAL/UV triangle-corner bytes, embedded image bytes and scene/material metadata, and the accepted/compact neutral close-up evidence is pixel-identical. The worker remains static/unrigged by design for Phase 1.

### Whole scene — PASS for Phase 1

Settlement, river and craft evidence were reviewed at inspection and RTS-useful scales. Structures and inhabitants are readable, major scale relationships are coherent, terrain/stream/path composition is usable for RTS interaction work, and no gross texture failure, catastrophic seam or obvious floating geometry requires another foundational art-gate rebuild. This is a credible Phase 1 benchmark, not a claim of final shipping/AAA art.

## Runtime / asset QA

The exact completion candidate loads through the real PlayCanvas runtime in WebGL2 and reaches a healthy Phase 1 diagnostic state with three structures, five GLB worker candidates, 32 trees and the generated workshop. Required benchmark models/textures successfully resolve and load; a missing required candidate asset would fail candidate initialization/smoke rather than satisfy those assertions. Foundation regression also passes lifecycle remount, interactions, storehouse and available software WebGPU paths.

The WebGPU result is explicitly software/CI regression evidence, not desktop-GPU performance evidence. WebGL2 remains the required fallback path and passed.

## Performance evidence

`ACTUAL_DESKTOP_GPU_BENCHMARK: NOT_AVAILABLE_IN_THIS_ENVIRONMENT`

No 60 FPS, frame-time, VRAM or hardware-device claim is made. CI software rendering remains regression evidence only. Actual 1920×1080 desktop-GPU tuning, especially runtime tree-LOD thresholds, is deferred. This deferral does **not** block Phase 2 camera/selection/movement/navigation implementation; performance thresholds must be measured before later production LOD tuning/release claims.

## Accepted later-phase limitations

| Limitation | BLOCKS_PHASE_2 | Disposition |
| --- | --- | --- |
| Storehouse lacks full production normal/roughness texture set | NO | Later material polish |
| Workshop uses base-color-focused material treatment and no full normal/roughness map set | NO | Later material polish |
| Worker R2 is static/unrigged | NO | Animation/character follow-up; Phase 2 may move the static accepted asset |
| Tree runtime LOD thresholds lack actual-hardware tuning | NO | Keep current composition; select thresholds only after hardware evidence |
| Vegetation repetition/density polish remains | NO | Later environment polish |
| Actual desktop-GPU benchmark unavailable in this execution environment | NO | Explicitly deferred; no performance number fabricated |

There are **no unresolved Phase 1 blockers** carried into Phase 2.

## Phase 2 entry contract

- `PHASE_2_ENTRY_GATE: OPEN`
- `PHASE_1_ACCEPTED_SHA: 26546b893fa37df4f0c56934b8fabaac8d942218`
- `PHASE_1_REVIEWED_CANDIDATE_SHA: 853d802e0512f4c89f068eb54f64337cf2a23195`
- `PHASE_1_INTEGRATION_SHA: 9d4c9fb642a2952efb279c0461378e5527891099`
- `PHASE_2_BASE_BRANCH: phase2/phase1-accepted-base`
- `PHASE_2_BASE_SHA: 9d4c9fb642a2952efb279c0461378e5527891099`
- `PHASE_2_INTEGRATION_BRANCH: qa/phase2-integration`
- `NEXT_TASK: P2-RTS-INTERACTION-FOUNDATION`

The authoritative Phase 2 base branch and integration target both currently point to the clean accepted integration SHA `9d4c9fb642a2952efb279c0461378e5527891099`. Any separate Phase 2 development branch is outside this closure until explicitly admitted through the dedicated Phase 2 DEV/QA flow.

Phase 2 implementation is deliberately not part of this closure.

## Historical state

Earlier blocked/superseded Phase 1 PRs and their evidence remain in Git history, PR discussions and the archive documents. In particular, PR #63 remains historical evidence for the rejected workshop preview, while #65/#68 and #60 document the accepted worker/storehouse evolution. Older `PROJECT_STATE` assertions that treated those repaired candidates as current blockers are superseded by this final acceptance record.
