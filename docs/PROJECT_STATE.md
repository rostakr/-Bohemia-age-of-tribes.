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
    "priority_repair_pr": 58,
    "priority_repair_status": "BLOCKED_REPAIR_REQUIRED",
    "release_next_dev_task": false
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

The current DEV handoff, PR #58 (`phase1/project-adult-worker-candidate`), has completed independent QA and is **BLOCKED / returned for art repair**. QA is not releasing another DEV task while that repair loop remains unresolved.

## Adult-worker DEV handoff QA

PR #58 current head `2ee931a0f2195487cec7eef96cef6885eddc9d0c` is technically healthy:

- candidate workflow `35412134308`: PASS;
- standard foundation workflow `35412134254`: PASS;
- 26,140 triangles / 13,783 vertices, inside the documented 25k–50k worker geometry target;
- scale and RTS grounding are usable.

Production visual admission is **not** accepted. The current neutral close-up still reads as procedural/placeholder: detached oval hands, spherical shoulder caps, simplified cylindrical limb construction, toy-like facial/head geometry and weak body/clothing transitions. The current candidate must remain out of `ADMITTED_MODELS`.

The exact repair contract is recorded in `docs/qa/PHASE1_WORK_QUEUE.md` and on PR #58. The repair must retain the current architecture/scale and geometry budget, materially improve anatomy/face/hair/clothing transitions, provide new neutral close-up + RTS PlayCanvas WebGL2 evidence, and rerun strict GLB plus full foundation regressions.

## Current runtime baseline

Only the **project-owned textured storehouse GLB** from the Astra/content handoff is accepted for WIP runtime use. The default workshop remains the project-owned procedural candidate; the default inhabitants remain the shared 1,404-triangle readability prototype.

PlayCanvas remains the sole game/render engine. The Phase 0.5 lifecycle, fixed-step simulation, central asset resolver, current tree composition, five inhabitant readability prototypes and dwelling LOD pipeline remain unchanged.

## Storehouse QA result

`public/assets/buildings/boii_storehouse_small.glb` passed strict GLB intake and full software-backed runtime QA. The file is self-contained, has 15,550 triangles / 15,910 vertices, five material primitives, normals and UV0 on all five primitives, and three embedded images/textures. No external buffer or image dependency is required.

Workflow run `35408681042` passed 22/22 Node tests, production build, Phase 0 WebGL2 and interaction regressions, three full Phase 1 remount cycles, software WebGPU, the normal Phase 1 render smoke, a dedicated storehouse admission smoke and a dedicated close-up smoke. Evidence artifact: `10573840636`, SHA-256 `eaee51e6987cf4e9d87c66c4d2865d846bf3a3e8753fba06881e6ff7dafb58e2`.

Visual review passed for **WIP admission**. This does **not** close the art gate: the storehouse still lacks a final full-PBR/LOD strategy and actual desktop-GPU acceptance.

## Supplied workshop / worker QA result

The archived supplied originals remain source/provenance material and are not canonical runtime assets. QA PR #59 generated normals-fixed copies only for isolated inspection and rendered them through the real PlayCanvas WebGL2 path from multiple checked angles.

- Supplied workshop preview: coherent render/scale/material response in captured views, but **89,778 triangles** exceeds the 20k–45k production target; not admitted.
- Supplied adult-worker preview: coherent render/scale/material response in checked views; the earlier severe texture-projection concern was **not reproduced**. It remains non-admitted at **14,106 triangles** against the 25k–50k brief and has no rig/animations/LOD.
- Preview workflow `35412011470`: PASS.
- Standard foundation workflow on the same QA head `35412011476`: PASS.

## Phase 1 queue state

See `docs/qa/PHASE1_WORK_QUEUE.md` for the authoritative ordering. Current state:

1. PR #58 project-owned adult worker — `BLOCKED`, repair required; priority repair loop, no new DEV task released.
2. PR #43 project-owned workshop GLB — `READY_FOR_QA`, queued.
3. PR #55 tree LOD candidates — `READY_FOR_QA`, queued.
4. PR #48 workshop LOD1 — `BLOCKED` on #43 acceptance.
5. PRs #41, #45, #53 and #59 — closed as `SUPERSEDED`; not merge candidates.

## Current limits / next gate

`artGatePassed=false` remains authoritative. The immediate gate is a repaired PR #58 DEV handoff or an explicit decision to defer it. Until then, QA does not release another DEV task.

## Archive

The exact pre-storehouse-admission state and manifest are preserved byte-for-byte at:
- `docs/archive/PROJECT_STATE_PRE_TEXTURED_STOREHOUSE.md`
- `docs/archive/ASSET_MANIFEST_PRE_TEXTURED_STOREHOUSE.md`

## Phase gate

**PHASE 0: PASS / ACCEPTED.**  
**PHASE 0.5: PASS / COMPLETE_VERIFIED / DEPLOYED.**  
**PHASE 1: AUTHORIZED / QA INTEGRATION ACTIVE / ADULT WORKER REPAIR BLOCKER / ART GATE OPEN / `artGatePassed=false`.**
