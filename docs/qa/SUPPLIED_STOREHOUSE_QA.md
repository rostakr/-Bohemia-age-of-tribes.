# Supplied textured storehouse — QA result

Status: **PASS for WIP runtime admission; final art gate remains open.**

- QA head validated before documentation-only updates: `bb9b1783aed4836fb24b4961ec3fb29b33b4bf0b`
- Workflow run: `35408681042`
- Evidence artifact: `10573840636`
- Artifact SHA-256: `eaee51e6987cf4e9d87c66c4d2865d846bf3a3e8753fba06881e6ff7dafb58e2`
- GLB: 9,933,356 bytes; 15,550 triangles; 15,910 vertices; 5 primitives/materials; 3 embedded images/textures.
- Structural gate: 5/5 primitives have `NORMAL` and `TEXCOORD_0`; no external dependencies.
- Runtime: 22/22 Node tests, production build, Phase 0 regressions, 3/3 remount, software WebGPU, Phase 1 WebGL2, admission and close-up smokes all passed.
- Visual review: scale and raised grounding are plausible in the benchmark; roof orientation is correct; no obvious UV collapse, gross seam or projection corruption was visible.
- Limits: base-color-focused material pass only; no normal/roughness maps, no storehouse LOD, no texture compression; 9.93 MB is heavy for the object size; actual desktop-GPU performance and final historical/art acceptance remain pending.

The supplied workshop and supplied adult-worker GLBs are **not admitted to runtime**. Their originals remain under `assets/source/phase1/user-supplied/` for provenance. The workshop exceeds the target budget and lacks required normals; the worker lacks required normals and its earlier textured preview was visually rejected for projection artifacts.

`artGatePassed=false` remains authoritative.
