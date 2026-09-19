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
    "dwelling_lod_merge_sha": "6be481b5619d8558632c94ab0ef74bd6664a28e5",
    "verified_current_main_sha": "47728da23ae73a01b298b935d59a431bc6088548"
  },
  "current_benchmark": {
    "structures": 3,
    "dwelling": {"candidate":"trellis-derived-generated-lod1","lod":1,"triangles":53538,"lod0_source_triangles":99298,"lod2_candidate_triangles":31286},
    "storehouse": {"candidate":"project-owned-glb","path":"public/assets/buildings/boii_storehouse_small.glb","sha256":"2e1e054a8a5d66c0a349015d2662a2831894c675378ac11a8e5db90ae15b2b95","bytes":9933356,"vertices":15910,"triangles":15550,"materials":5,"embedded_images":3,"embedded_textures":3,"texture_dimensions":"1254x1254","lod":null,"full_pbr":false},
    "workshop": {"candidate":"procedural-project-owned","triangles":22480},
    "inhabitants": {"candidate":"procedural-project-owned-readability-prototype","instances":5,"triangles_per_shared_mesh":1404},
    "trees": {"candidate":"procedural-project-owned","instances":32,"triangles_per_shared_mesh":15980},
    "grass_clumps": 4678,
    "art_gate_passed": false
  },
  "supplied_storehouse_qa": {
    "pr": 51,
    "merged_main_sha": "47728da23ae73a01b298b935d59a431bc6088548",
    "workflow_run": 35410230067,
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
    "evidence_artifact_id": 10574496297,
    "evidence_artifact_sha256": "3c7b252e33f2e3b1b53feea9f2e2e1476b9da258f944ac962158a7d55868706b",
    "screenshots": ["supplied-storehouse-webgl2-1920x1080.png","supplied-storehouse-closeup-1920x1080.png"],
    "visual_qa": "passed_for_wip_runtime_admission",
    "art_gate_passed": false
  },
  "rejected_supplied_runtime_assets": {
    "workshop": "not admitted; 89,778 triangles exceeds target and strict intake reports missing required NORMAL",
    "adult_worker": "not admitted; strict intake reports missing required NORMAL and prior textured preview was rejected for patchwork/mis-projected texture",
    "canonical_runtime_files_absent": true,
    "provenance_originals_retained": true
  }
}
```

## Current decision

The Astra/content handoff was reconciled against the verified current baseline rather than replayed wholesale. Only the new **project-owned textured storehouse GLB** is accepted for WIP runtime use. The supplied workshop and adult-worker GLBs remain provenance-only and are not present in canonical runtime paths.

PlayCanvas remains the sole game/render engine. The Phase 0.5 lifecycle, fixed-step simulation, central asset resolver, current tree composition, five inhabitant readability prototypes and dwelling LOD pipeline remain unchanged.

## Storehouse QA result

`public/assets/buildings/boii_storehouse_small.glb` passed strict GLB intake and full software-backed runtime QA on current `main` SHA `47728da23ae73a01b298b935d59a431bc6088548`. The file is self-contained, SHA-256 `2e1e054a8a5d66c0a349015d2662a2831894c675378ac11a8e5db90ae15b2b95`, 9,933,356 bytes, 15,550 triangles / 15,910 vertices, five material primitives, normals and UV0 on all five primitives, and three embedded 1254×1254 base-color images/textures. No external buffer or image dependency is required.

Workflow run `35410230067` passed 22/22 Node tests, production build, strict Phase 1 asset intake, Phase 0 WebGL2 and interaction regressions, three full Phase 1 remount cycles, software WebGPU, the normal Phase 1 render smoke, a dedicated storehouse admission smoke and a dedicated close-up smoke. Storehouse screenshot evidence artifact: `10574496297`, ZIP SHA-256 `3c7b252e33f2e3b1b53feea9f2e2e1476b9da258f944ac962158a7d55868706b`.

Visual review passed for **WIP admission**: the captured settlement contains exactly one storehouse; it is correctly scaled against inhabitants/buildings, remains raised on its supports, has stable ground contact/shadow and correct roof orientation, and the embedded textures render. No obvious missing texture, catastrophic UV projection, gross seam, baked-lighting artifact or accidental metallic material response is visible in the benchmark and close-up evidence.

This does **not** close the art gate. The 9.93 MB storehouse still lacks normal-map and roughness-map textures, texture/mesh compression and a production LOD strategy. Existing UVs still carry close-up grain-stretching risk. Actual desktop-GPU/VRAM/frame-time performance, final material balance and final historical/art acceptance remain open.

## Supplied assets not admitted

- Supplied carpentry workshop: retained only under source/provenance. It is 89,778 triangles, exceeds the current workshop target and fails strict admission because required normals are missing.
- Supplied adult worker: retained only under source/provenance. Its triangle count is workable for an RTS asset, but required normals are missing and the previously reviewed texture projection showed severe patchwork/mis-projection artifacts.
- Neither canonical runtime file exists on current `main`; both original supplied GLBs remain under `assets/source/phase1/user-supplied/`.
- Neither asset should be restored to `public/assets/...` or wired into `ADMITTED_MODELS` without a new clean candidate and full QA.

## Current limits / next gate

`artGatePassed=false` remains authoritative. Priorities are now:
1. Replace the 1,404-triangle inhabitant readability prototype with a clean production adult-worker candidate; do not reuse the rejected supplied worker.
2. Keep the procedural workshop until a materially better target-budget candidate passes strict and visual intake.
3. Add a storehouse LOD/compression/full-PBR strategy only after actual hardware evidence justifies thresholds and memory targets.
4. Run an actual desktop-GPU 1080p benchmark before selecting runtime LOD distances.
5. Continue environment polish.

## Archive

The exact pre-storehouse-admission state and manifest are preserved byte-for-byte at:
- `docs/archive/PROJECT_STATE_PRE_TEXTURED_STOREHOUSE.md`
- `docs/archive/ASSET_MANIFEST_PRE_TEXTURED_STOREHOUSE.md`

## Phase gate

**PHASE 0: PASS / ACCEPTED.**  
**PHASE 0.5: PASS / COMPLETE_VERIFIED / DEPLOYED.**  
**PHASE 1: AUTHORIZED / TEXTURED STOREHOUSE WIP ADMITTED / ART GATE OPEN.**
