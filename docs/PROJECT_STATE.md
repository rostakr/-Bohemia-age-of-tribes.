# Project state

```json
{
  "schema_version": 2,
  "project": "BOHEMIA: AGE OF TRIBES",
  "updated": "2026-09-19",
  "engine": "playcanvas@2.22.1",
  "phase_0_status": "COMPLETE_ACCEPTED",
  "phase_0_5_status": "COMPLETE_VERIFIED",
  "active_milestone": "PHASE_1_CONTENT_ART_GATE",
  "phase_1_authorized": true,
  "phase_1_status": "TEXTURED_STOREHOUSE_WIP_ADMITTED_ART_GATE_OPEN",
  "runtime_baseline": {
    "phase_0_5_merge_sha": "1b1b28bbfea91689d22455b117d12f412f5a24c2",
    "phase_1_reconciliation_merge_sha": "e542bcf48ebe6f79bf08fd2b0a0a9e4441432c62",
    "dwelling_lod_merge_sha": "6be481b5619d8558632c94ab0ef74bd6664a28e5"
  },
  "current_benchmark": {
    "structures": 3,
    "dwelling": {
      "candidate": "trellis-derived-generated-lod1",
      "lod": 1,
      "triangles": 53538,
      "lod0_source_triangles": 99298,
      "lod2_candidate_triangles": 31286
    },
    "storehouse": {
      "candidate": "project-owned-glb",
      "path": "public/assets/buildings/boii_storehouse_small.glb",
      "bytes": 9933356,
      "vertices": 15910,
      "triangles": 15550,
      "materials": 5,
      "embedded_images": 3,
      "embedded_textures": 3,
      "lod": null,
      "full_pbr": false
    },
    "workshop": {
      "candidate": "procedural-project-owned",
      "triangles": 22480
    },
    "inhabitants": {
      "candidate": "procedural-project-owned-readability-prototype",
      "instances": 5,
      "triangles_per_shared_mesh": 1404
    },
    "trees": {
      "candidate": "procedural-project-owned",
      "instances": 32,
      "triangles_per_shared_mesh": 15980
    },
    "grass_clumps": 4678,
    "art_gate_passed": false
  },
  "supplied_storehouse_qa": {
    "pr": 51,
    "qa_head": "bb9b1783aed4836fb24b4961ec3fb29b33b4bf0b",
    "workflow_run": 35408681042,
    "result": "passed",
    "npm_ci": "passed; 0 vulnerabilities",
    "typescript": "passed",
    "node_tests": "22/22 passed",
    "production_build": "passed",
    "strict_glb_intake": "passed",
    "primitives_with_normals": "5/5",
    "primitives_with_uv0": "5/5",
    "external_dependencies": 0,
    "phase_0_webgl2_regression": "passed",
    "phase_0_interaction_regression": "passed",
    "phase_1_lifecycle_remount": "3/3 cycles passed",
    "phase_0_webgpu_regression": "passed",
    "phase_1_webgl2_render_smoke": "passed",
    "storehouse_admission_smoke": "passed",
    "storehouse_closeup_smoke": "passed",
    "evidence_artifact_id": 10573840636,
    "evidence_artifact_sha256": "eaee51e6987cf4e9d87c66c4d2865d846bf3a3e8753fba06881e6ff7dafb58e2",
    "visual_review": "PASS for WIP runtime admission: plausible scale and raised grounding, correct roof orientation, no obvious UV collapse, gross seam or projection corruption",
    "art_gate_passed": false
  },
  "rejected_supplied_runtime_assets": {
    "workshop": "not admitted; 89,778 triangles exceeds target and strict intake reports missing required NORMAL",
    "adult_worker": "not admitted; strict intake reports missing required NORMAL and prior textured preview was rejected for patchwork/mis-projected texture",
    "provenance_originals_retained": true
  },
  "deployment": {
    "provider": "github_pages",
    "url": "https://rostakr.github.io/-Bohemia-age-of-tribes./",
    "published_content": "verified Phase 0.5 foundation",
    "phase_1_published": false,
    "publishing_mode": "manual_only"
  }
}
```

## Current decision

The Astra/content handoff has been reconciled against the verified current baseline rather than replayed wholesale. Only the new **project-owned textured storehouse GLB** is accepted for WIP runtime use. The supplied workshop and adult-worker GLBs remain provenance-only and are not present in canonical runtime paths.

PlayCanvas remains the sole game/render engine. The Phase 0.5 lifecycle, fixed-step simulation, central asset resolver, current tree composition, five inhabitant readability prototypes and dwelling LOD pipeline remain unchanged.

## Storehouse QA result

`public/assets/buildings/boii_storehouse_small.glb` passed strict GLB intake and full software-backed runtime QA. The file is self-contained, has 15,550 triangles / 15,910 vertices, five material primitives, normals and UV0 on all five primitives, and three embedded images/textures. No external buffer or image dependency is required.

Workflow run `35408681042` passed 22/22 Node tests, production build, Phase 0 WebGL2 and interaction regressions, three full Phase 1 remount cycles, software WebGPU, the normal Phase 1 render smoke, a dedicated storehouse admission smoke and a dedicated close-up smoke. Evidence artifact: `10573840636`, SHA-256 `eaee51e6987cf4e9d87c66c4d2865d846bf3a3e8753fba06881e6ff7dafb58e2`.

Visual review passed for **WIP admission**: the storehouse is correctly scaled against inhabitants/buildings, remains raised on its supports, has stable ground contact/shadow, correct roof orientation and no obvious broken UV projection or gross texture seam in the captured views.

This does **not** close the art gate. The 9.93 MB storehouse still lacks normal/roughness maps, texture compression and a production LOD strategy. Actual desktop-GPU performance, final material balance and final historical/art acceptance remain open.

## Supplied assets not admitted

- Supplied carpentry workshop: retained only under source/provenance. It is 89,778 triangles, exceeds the current workshop target and fails strict admission because required normals are missing.
- Supplied adult worker: retained only under source/provenance. Its triangle count is workable for an RTS asset, but required normals are missing and the previously reviewed texture projection showed severe patchwork/mis-projection artifacts.
- Neither asset should be restored to `public/assets/...` or wired into `ADMITTED_MODELS` without a new clean candidate and full QA.

## Current limits / next gate

`artGatePassed=false` remains authoritative. Priorities are now:

1. Replace the 1,404-triangle inhabitant readability prototype with a clean production adult-worker candidate matching the documented character brief; do not reuse the rejected supplied worker.
2. Keep the procedural workshop until a materially better ≤target-budget candidate passes strict and visual intake.
3. Add a storehouse LOD/compression/full-PBR strategy only after actual hardware evidence justifies thresholds and memory targets.
4. Run an actual desktop-GPU 1080p benchmark of the complete Phase 1 scene before selecting runtime LOD distances or treating CI FPS as performance evidence.
5. Continue environment polish: stream banks, path edges, vegetation variation, lighting/material balance and settlement composition.
6. Set `artGatePassed=true` only after the remaining art/historical/hardware gates are explicitly satisfied or waived.

## Archive

The exact pre-storehouse-admission long-form state is preserved byte-for-byte at `docs/archive/PROJECT_STATE_PRE_TEXTURED_STOREHOUSE.md`. The corresponding pre-admission asset manifest is preserved at `docs/archive/ASSET_MANIFEST_PRE_TEXTURED_STOREHOUSE.md`.

## Phase gate

**PHASE 0: PASS / ACCEPTED.**

**PHASE 0.5: PASS / COMPLETE_VERIFIED / DEPLOYED.**

**PHASE 1: AUTHORIZED / TEXTURED STOREHOUSE WIP ADMITTED / ART GATE OPEN.**
