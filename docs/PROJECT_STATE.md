# Project state

```json
{
  "schema_version": 3,
  "project": "BOHEMIA: AGE OF TRIBES",
  "updated": "2026-09-19",
  "engine": "playcanvas@2.22.1",
  "phase_0_status": "COMPLETE_ACCEPTED",
  "phase_0_5_status": "COMPLETE_VERIFIED",
  "active_milestone": "PHASE_1_CONTENT_ART_GATE",
  "phase_1_authorized": true,
  "phase_1_status": "QA_INTEGRATION_ACTIVE_ART_GATE_OPEN",
  "art_gate_passed": false,
  "verified_main": {
    "sha": "47728da23ae73a01b298b935d59a431bc6088548",
    "workflow_run": 35410230067,
    "result": "passed"
  },
  "qa_integration": {
    "branch": "qa/phase1-integration",
    "base_main_sha": "47728da23ae73a01b298b935d59a431bc6088548",
    "work_queue": "docs/qa/PHASE1_WORK_QUEUE.md",
    "flow": "feature DEV branch -> qa/phase1-integration -> QA -> main",
    "qa_owns": ["admission", "regression testing", "PROJECT_STATE", "integration", "merge to main"],
    "dev_owns": ["asset creation", "feature implementation"],
    "current_qa_active_pr": null,
    "latest_dev_handoff_pr": 60,
    "latest_dev_handoff_status": "BLOCKED_REPAIR_REQUIRED",
    "next_ready_for_qa": [43, 55]
  },
  "runtime_baseline": {
    "phase_0_5_merge_sha": "1b1b28bbfea91689d22455b117d12f412f5a24c2",
    "phase_1_reconciliation_merge_sha": "e542bcf48ebe6f79bf08fd2b0a0a9e4441432c62",
    "dwelling_lod_merge_sha": "6be481b5619d8558632c94ab0ef74bd6664a28e5"
  },
  "current_benchmark": {
    "structures": 3,
    "dwelling": {"candidate":"trellis-derived-generated-lod1","lod":1,"triangles":53538,"lod0_source_triangles":99298,"lod2_candidate_triangles":31286},
    "storehouse": {"candidate":"project-owned-glb","path":"public/assets/buildings/boii_storehouse_small.glb","bytes":9933356,"vertices":15910,"triangles":15550,"materials":5,"embedded_images":3,"embedded_textures":3,"lod":null,"full_pbr":false},
    "workshop": {"candidate":"procedural-project-owned","triangles":22480},
    "inhabitants": {"candidate":"procedural-project-owned-readability-prototype","instances":5,"triangles_per_shared_mesh":1404},
    "trees": {"candidate":"procedural-project-owned","instances":32,"triangles_per_shared_mesh":15980},
    "grass_clumps": 4678,
    "art_gate_passed": false
  },
  "compact_storehouse_dev_handoff_qa": {
    "pr": 60,
    "head": "bb43b497ebd31c3cb3d4f1f75ca22dedf954ad6b",
    "dedicated_workflow_run": 35412640794,
    "foundation_workflow_run": 35412640899,
    "foundation_retry_job": 105815391664,
    "jpeg_rebuild_workflow_run": 35412640855,
    "structural_result": "passed",
    "generated_bytes": 791800,
    "generated_sha256_observed": "775c4d918c3d59f0d6dd622af7a6bdcc4ef84af9ac10aeffd10654d3eaef9d90",
    "triangles": 15550,
    "vertices": 17810,
    "normals_primitives": "5/5",
    "uv0_primitives": "5/5",
    "webgl2_smoke": "passed",
    "interaction_smoke": "passed",
    "lifecycle_result": "failed_reproducibly_on_initial_mount",
    "observed_failure": "Renderer unavailable; debug bridge present; runtime not mounted; diagnostics null",
    "downstream_webgpu_phase1_storehouse_smokes": "not_executed_due_to_lifecycle_failure",
    "jpeg_reproducibility": "blocked_runtime_jpeg_hashes_do_not_match_separate_rebuild_output_hashes",
    "canonical_admission": false,
    "repair_required": true
  },
  "adult_worker_dev_handoff_qa": {
    "pr": 58,
    "head": "2ee931a0f2195487cec7eef96cef6885eddc9d0c",
    "candidate_workflow_run": 35412134308,
    "foundation_workflow_run": 35412134254,
    "technical_result": "passed",
    "triangles": 26140,
    "vertices": 13783,
    "target_triangles": "25000-50000",
    "visual_production_result": "blocked",
    "blocker": "procedural placeholder anatomy and face remain below production art quality",
    "canonical_admission": false,
    "repair_required": true
  },
  "supplied_storehouse_qa": {
    "pr": 51,
    "qa_head": "bb9b1783aed4836fb24b4961ec3fb29b33b4bf0b",
    "workflow_run": 35408681042,
    "result": "passed",
    "node_tests": "22/22 passed",
    "strict_glb_intake": "passed",
    "primitives_with_normals": "5/5",
    "primitives_with_uv0": "5/5",
    "external_dependencies": 0,
    "phase_1_lifecycle_remount": "3/3 cycles passed",
    "phase_0_webgpu_regression": "passed",
    "phase_1_webgl2_render_smoke": "passed",
    "storehouse_admission_smoke": "passed",
    "storehouse_closeup_smoke": "passed",
    "evidence_artifact_id": 10573840636,
    "evidence_artifact_sha256": "eaee51e6987cf4e9d87c66c4d2865d846bf3a3e8753fba06881e6ff7dafb58e2",
    "art_gate_passed": false
  },
  "supplied_preview_qa": {
    "pr": 59,
    "head": "0038fd5304d2e9cc0935fae0347fe8bbeb2cbcb1",
    "preview_workflow_run": 35412011470,
    "foundation_workflow_run": 35412011476,
    "result": "passed",
    "workshop": {"triangles":89778,"render":"passed_multi_angle","canonical_admission":false,"blocker":"above 20k-45k production target"},
    "adult_worker": {"triangles":14106,"render":"passed_multi_angle","severe_projection_failure_reproduced":false,"canonical_admission":false,"blocker":"below 25k-50k production brief; no rig/animations/LOD"},
    "art_gate_passed": false
  }
}
```

## Current decision

Phase 1 uses one QA-controlled integration flow:

`feature DEV branch` → `qa/phase1-integration` → QA → `main`.

`docs/qa/PHASE1_WORK_QUEUE.md` is the single authoritative queue between DEV and QA. QA owns admission, regressions, this `PROJECT_STATE`, integration and merge to `main`. DEV owns asset creation and implementation.

There is currently **no `QA_ACTIVE` handoff**. The latest DEV handoff, PR #60 (`phase1/storehouse-512-current-baseline`), completed independent QA and was returned as **BLOCKED / repair required**. PR #58 remains independently BLOCKED on art repair. PRs #43 and #55 remain `READY_FOR_QA`; #48 remains BLOCKED on #43.

## Compact storehouse DEV handoff QA — PR #60

The compact asset optimization is structurally promising but is **not accepted into `qa/phase1-integration`**.

Current head `bb43b497ebd31c3cb3d4f1f75ca22dedf954ad6b` produced:

- 791,800-byte GLB;
- 15,550 triangles / 17,810 vertices;
- 5/5 primitives with NORMAL and 5/5 with UV0;
- UV physical-repeat/seam regression PASS;
- typecheck, 23/23 Node tests, strict intake and production build PASS;
- Phase 0 WebGL2 and interaction smokes PASS.

The runtime gate fails reproducibly on the **initial lifecycle mount**:

- dedicated run `35412640794`: FAIL at `smoke:lifecycle`;
- standard foundation run `35412640899`: FAIL at the same gate;
- clean retry job `105815391664` on another runner region: same FAIL.

Observed state is consistently `Renderer unavailable`, one canvas, debug bridge present, runtime not mounted and diagnostics null. Because initialization does not complete, software WebGPU, normal Phase-1 benchmark, storehouse admission and storehouse close-up smokes do not execute. This is a release/admission blocker regardless of the file-size improvement.

A second blocker is deterministic asset provenance/rebuild consistency. Workflow `35412640855` successfully rebuilds JPEG derivatives under a separate `runtime-rebuilt` path and asserts historical hashes, while `scripts/export-storehouse.mjs` consumes `assets/source/phase1/materials/runtime/*.jpg`; the bytes/hashes actually consumed in the compact GLB run differ from the separately rebuilt outputs. The rebuild gate therefore does not yet prove the exact runtime JPEG bytes are reproducible.

The exact repair contract is recorded in `docs/qa/PHASE1_WORK_QUEUE.md` and on PR #60. DEV must restore lifecycle/Phase-1/storehouse browser gates and make the rebuild path verify the exact exporter-consumed JPEG bytes before re-handoff.

## Adult-worker DEV handoff QA — PR #58

PR #58 current head `2ee931a0f2195487cec7eef96cef6885eddc9d0c` is technically healthy:

- candidate workflow `35412134308`: PASS;
- standard foundation workflow `35412134254`: PASS;
- 26,140 triangles / 13,783 vertices, inside the documented 25k–50k worker geometry target;
- scale and RTS grounding are usable.

Production visual admission is **not** accepted. The current neutral close-up still reads as procedural/placeholder: detached oval hands, spherical shoulder caps, simplified cylindrical limb construction, toy-like facial/head geometry and weak body/clothing transitions. The current candidate remains out of `ADMITTED_MODELS` pending the repair contract in the work queue.

## Current runtime baseline

Only the **project-owned textured storehouse GLB already present on verified `main`** is accepted for WIP runtime use. PR #60 does not replace it because #60 did not pass the lifecycle/runtime admission gate. The default workshop remains the project-owned procedural candidate; the default inhabitants remain the shared 1,404-triangle readability prototype.

PlayCanvas remains the sole game/render engine. The Phase 0.5 lifecycle, fixed-step simulation, central asset resolver, current tree composition, five inhabitant readability prototypes and dwelling LOD pipeline remain unchanged.

## Existing storehouse WIP admission

The currently admitted `main` storehouse remains the last accepted WIP storehouse baseline. Its prior QA run `35408681042` passed 22/22 Node tests, production build, WebGL2/interactions, three lifecycle remount cycles, software WebGPU, Phase-1 render, storehouse admission and close-up smokes. Its evidence artifact was `10573840636`, SHA-256 `eaee51e6987cf4e9d87c66c4d2865d846bf3a3e8753fba06881e6ff7dafb58e2`.

## Supplied workshop / worker QA result

QA PR #59 rendered normals-fixed supplied workshop/worker copies through PlayCanvas WebGL2 from multiple checked angles. The workshop remains non-admitted at 89,778 triangles versus the 20k–45k target. The supplied worker's earlier severe texture-projection concern was not reproduced in the checked normals-fixed views, but it remains non-admitted at 14,106 triangles versus the 25k–50k brief and has no rig/animations/LOD.

## Phase 1 queue state

See `docs/qa/PHASE1_WORK_QUEUE.md` for the authoritative ordering. Current state:

1. PR #60 compact storehouse current baseline — `BLOCKED`, runtime/reproducibility repair required.
2. PR #58 project-owned adult worker — `BLOCKED`, art repair required.
3. PR #43 project-owned workshop GLB — `READY_FOR_QA`.
4. PR #55 tree LOD candidates — `READY_FOR_QA`.
5. PR #48 workshop LOD1 — `BLOCKED` on #43 acceptance.
6. PRs #41, #45, #53 and #59 — closed as `SUPERSEDED`; not merge candidates.

## Current limits / next gate

`artGatePassed=false` remains authoritative. The Phase 1 integration branch contains governance/state only; neither #60 nor #58 has been admitted. No new DEV task was released while #60 was QA_ACTIVE; #60 has now been explicitly returned for repair.

## Archive

The exact pre-storehouse-admission state and manifest are preserved byte-for-byte at:
- `docs/archive/PROJECT_STATE_PRE_TEXTURED_STOREHOUSE.md`
- `docs/archive/ASSET_MANIFEST_PRE_TEXTURED_STOREHOUSE.md`

## Phase gate

**PHASE 0: PASS / ACCEPTED.**  
**PHASE 0.5: PASS / COMPLETE_VERIFIED / DEPLOYED.**  
**PHASE 1: AUTHORIZED / QA INTEGRATION CONSOLIDATED / CURRENT DEV HANDOFFS BLOCKED / ART GATE OPEN / `artGatePassed=false`.**
