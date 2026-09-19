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
    "single_active_handoff": true,
    "active_dev_handoff_pr": 58
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

Phase 1 now uses a single QA-controlled integration flow:

`feature DEV branch` → `qa/phase1-integration` → QA → `main`.

`docs/qa/PHASE1_WORK_QUEUE.md` is the single authoritative queue between DEV and QA. QA owns admission, regressions, this `PROJECT_STATE`, integration and merge to `main`. DEV owns asset creation and implementation. Only one DEV handoff may be `QA_ACTIVE`; no next DEV task is released until the active handoff is accepted, returned with an explicit repair request, or explicitly deferred.

The current DEV handoff is PR #58 (`phase1/project-adult-worker-candidate`) and is `QA_ACTIVE`.

## Current runtime baseline

The Astra/content handoff was reconciled against the verified baseline rather than replayed wholesale. Only the **project-owned textured storehouse GLB** from that handoff is accepted for WIP runtime use. The default workshop remains the project-owned procedural candidate; the default inhabitants remain the shared 1,404-triangle readability prototype.

PlayCanvas remains the sole game/render engine. The Phase 0.5 lifecycle, fixed-step simulation, central asset resolver, current tree composition, five inhabitant readability prototypes and dwelling LOD pipeline remain unchanged.

## Storehouse QA result

`public/assets/buildings/boii_storehouse_small.glb` passed strict GLB intake and full software-backed runtime QA. The file is self-contained, has 15,550 triangles / 15,910 vertices, five material primitives, normals and UV0 on all five primitives, and three embedded images/textures. No external buffer or image dependency is required.

Workflow run `35408681042` passed 22/22 Node tests, production build, Phase 0 WebGL2 and interaction regressions, three full Phase 1 remount cycles, software WebGPU, the normal Phase 1 render smoke, a dedicated storehouse admission smoke and a dedicated close-up smoke. Evidence artifact: `10573840636`, SHA-256 `eaee51e6987cf4e9d87c66c4d2865d846bf3a3e8753fba06881e6ff7dafb58e2`.

Visual review passed for **WIP admission**. This does **not** close the art gate: the storehouse still lacks a final full-PBR/LOD strategy and actual desktop-GPU acceptance.

## Supplied workshop / worker QA result

The archived supplied originals remain source/provenance material and are not canonical runtime assets. QA PR #59 generated normals-fixed copies only for isolated inspection and rendered them through the real PlayCanvas WebGL2 path from multiple checked angles.

- Supplied workshop preview: render/scale/material response are coherent in the captured QA views, but the asset is **89,778 triangles**, above the current 20k–45k production target. It is not admitted.
- Supplied adult-worker preview: render/scale/material response are coherent in the captured QA views; the earlier severe texture-projection concern was **not reproduced** in this normals-fixed multi-angle check. It is still not admitted because it is **14,106 triangles** against the current 25k–50k production brief and has no rig, animations or LOD.
- Preview workflow `35412011470`: PASS.
- Standard foundation workflow on the same QA head `35412011476`: PASS.

These results replace the earlier assumption that the supplied worker must be rejected specifically for a reproduced catastrophic texture projection defect. Its current blockers are production specification/completeness, not a texture failure proven by #59.

## Phase 1 queue state

See `docs/qa/PHASE1_WORK_QUEUE.md` for the authoritative ordering. At consolidation time:

1. PR #58 project-owned adult worker — `QA_ACTIVE`.
2. PR #43 project-owned workshop GLB — `READY_FOR_QA`.
3. PR #55 tree LOD candidates — `READY_FOR_QA`.
4. PR #48 workshop LOD1 — `BLOCKED` on #43 acceptance.
5. PRs #41, #45, #53 and #59 — `SUPERSEDED`; not merge candidates.

## Current limits / next gate

`artGatePassed=false` remains authoritative. The immediate gate is QA disposition of PR #58. Until that disposition is recorded, QA must not release another DEV task.

After the active handoff is resolved, the queue — not ad-hoc parallel PR creation — determines the next QA/DEV action.

## Archive

The exact pre-storehouse-admission state and manifest are preserved byte-for-byte at:
- `docs/archive/PROJECT_STATE_PRE_TEXTURED_STOREHOUSE.md`
- `docs/archive/ASSET_MANIFEST_PRE_TEXTURED_STOREHOUSE.md`

## Phase gate

**PHASE 0: PASS / ACCEPTED.**  
**PHASE 0.5: PASS / COMPLETE_VERIFIED / DEPLOYED.**  
**PHASE 1: AUTHORIZED / QA INTEGRATION ACTIVE / ART GATE OPEN / `artGatePassed=false`.**
