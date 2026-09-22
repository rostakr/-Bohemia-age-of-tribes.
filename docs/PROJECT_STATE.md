# Project state

```json
{
  "schema_version": 4,
  "project": "BOHEMIA: AGE OF TRIBES",
  "updated": "2026-09-22",
  "engine": "playcanvas@2.22.1",
  "phase_0_status": "COMPLETE_ACCEPTED",
  "phase_0_5_status": "COMPLETE_VERIFIED",
  "active_milestone": "PHASE_2_RTS_INTERACTION_FOUNDATION",
  "phase_1_authorized": true,
  "phase_1_status": "COMPLETE_QA_ACCEPTED",
  "art_gate_passed": true,
  "phase_1_accepted_candidate_sha": "853d802e0512f4c89f068eb54f64337cf2a23195",
  "phase_1_integration_merge_sha": "9d4c9fb642a2952efb279c0461378e5527891099",
  "phase_1_accepted_tree_sha": "1fde280d7a8b61f3a1c87299b400fedc532c3b60",
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

The exact content candidate independently reviewed and accepted is commit `853d802e0512f4c89f068eb54f64337cf2a23195` from PR #71. PR #71 was merged into `qa/phase1-integration` as `9d4c9fb642a2952efb279c0461378e5527891099`. The candidate and integration merge have the same Git tree, `1fde280d7a8b61f3a1c87299b400fedc532c3b60`; therefore the reviewed runtime/content bytes are unchanged by the merge commit.

The accepted benchmark is the explicit Phase 1 composition selected by `?candidate=phase1`: dwelling LOD1, compact storehouse, repaired project workshop, five compact R2 workers, terrain, stream, paths, meadow and the current vegetation composition. This explicit route is the Phase 1 baseline; accepting it does not require rewriting the otherwise useful legacy/default QA route.

## Final validation evidence

Exact PR #71 head `853d802e0512f4c89f068eb54f64337cf2a23195`:

- foundation workflow run `35769849049`: **SUCCESS**;
- Phase 1 completion workflow run `35769849029`: **SUCCESS**;
- worker R2 workflow run `35769849012`: **SUCCESS**;
- foundation steps passed: `npm ci`, repository `npm run validate`, WebGL2 startup, interaction smoke, lifecycle/remount smoke, software WebGPU smoke, Phase 1 benchmark, storehouse admission and storehouse close-up;
- completion workflow deterministically rebuilt the compact worker and repaired workshop, ran strict workshop GLB intake plus the repository validation suite, loaded the complete `?candidate=phase1` composition through PlayCanvas WebGL2 and captured settlement/river/craft evidence;
- completion evidence artifact: `10713746346`, digest `sha256:16152d8d000eb58eb7aae6627d6b87fa68e05258b9e98ae3becda4f9bcbd7224`;
- foundation Phase 1 browser evidence artifact: `10713692561`, digest `sha256:c1ed3ccf3e8a5c3746920091217f1c21d0f86f57dc6baee471a3cdec3a36e408`.

No validation threshold was relaxed for this acceptance. The PlayCanvas runtime, fixed timestep, renderer fallback, lifecycle ownership and central asset resolver remain intact.

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

The exact completion candidate loads through the real PlayCanvas runtime in WebGL2 and reaches a healthy Phase 1 diagnostic state with three structures, five GLB worker candidates, 32 trees and the generated workshop. Required benchmark models/textures successfully resolve and load; a missing required candidate asset would fail candidate initialization/smoke rather than satisfy those assertions. The foundation suite also passes lifecycle remount, interaction, storehouse and software WebGPU regressions.

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
- `PHASE_1_ACCEPTED_SHA: 853d802e0512f4c89f068eb54f64337cf2a23195`
- `PHASE_1_INTEGRATION_SHA: 9d4c9fb642a2952efb279c0461378e5527891099`
- `PHASE_2_BASE_BRANCH: phase2/phase1-accepted-base`
- `PHASE_2_BASE_SHA: 9d4c9fb642a2952efb279c0461378e5527891099`
- `PHASE_2_INTEGRATION_BRANCH: qa/phase2-integration`
- `NEXT_TASK: P2-RTS-INTERACTION-FOUNDATION`

Phase 2 implementation is deliberately not part of this closure.

## Historical state

Earlier blocked/superseded Phase 1 PRs and their evidence remain in Git history, PR discussions and the archive documents. In particular, PR #63 remains historical evidence for the rejected workshop preview, while #65/#68 and #60 document the accepted worker/storehouse evolution. Older `PROJECT_STATE` assertions that treated those repaired candidates as current blockers are superseded by this final acceptance record.