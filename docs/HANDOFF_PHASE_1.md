# Phase 1 checkpoint — NOT COMPLETE

## Current runtime checkpoint

PlayCanvas 2.22.1 remains the sole game/render engine. The Phase 0.5 lifecycle, explicit canvas ownership, fixed timestep, asset resolver and WebGPU → WebGL2 fallback remain intact. Phase 2 gameplay/economy/combat/AI has not started.

Current benchmark composition:

- dwelling: admitted generated LOD1, `trellis-derived-generated-lod1`, 53,538 triangles;
- storehouse: admitted project-owned textured GLB, `public/assets/buildings/boii_storehouse_small.glb`, 15,550 triangles;
- workshop: existing `procedural-project-owned` candidate, 22,480 triangles;
- inhabitants: five instances of the existing `procedural-project-owned-readability-prototype`, 1,404 triangles per shared mesh;
- trees: 32 instances of the existing `procedural-project-owned` candidate, 15,980 triangles per shared mesh;
- `artGatePassed=false`.

## Storehouse-only reconciliation result

The Astra/content handoff was reconciled conservatively. Only the storehouse was admitted to canonical runtime use.

Storehouse runtime asset:

- path: `public/assets/buildings/boii_storehouse_small.glb`;
- SHA-256: `2e1e054a8a5d66c0a349015d2662a2831894c675378ac11a8e5db90ae15b2b95`;
- size: 9,933,356 bytes;
- 15,910 vertices / 15,550 triangles;
- 5 primitives / 5 materials;
- NORMAL on 5/5 primitives;
- TEXCOORD_0 on 5/5 primitives;
- three embedded 1254×1254 PNG base-color textures;
- no external GLTF dependencies;
- no skins or animations;
- no production LOD.

The supplied workshop and supplied adult-worker GLBs remain rejected for canonical runtime admission. Their canonical runtime files are absent. Their original GLBs and intake/provenance remain preserved under `assets/source/phase1/user-supplied/`.

Reasons remain unchanged:

- supplied workshop: 89,778 triangles, above the current target, and required NORMAL data missing;
- supplied adult worker: 14,106 triangles is performance-usable, but required NORMAL data is missing and prior visual review found severe patchwork/mis-projected texture on face, clothing and rear surfaces.

Do not restore either rejected GLB to `public/assets/...` merely by synthesizing normals. A new candidate must pass structural and visual QA.

## Current-main QA evidence

Verified current `main` SHA: `47728da23ae73a01b298b935d59a431bc6088548`.

GitHub Actions workflow run `35410230067`: **PASS**.

The run passed:

- `npm ci`;
- `npm run typecheck`;
- 22/22 Node tests;
- strict `npm run check:phase1-assets`;
- production build;
- `smoke:webgl2`;
- `smoke:interactions`;
- `smoke:lifecycle` with 3/3 remount cycles;
- software `smoke:webgpu`;
- `smoke:phase1`;
- dedicated storehouse admission smoke;
- dedicated storehouse close-up smoke.

Phase 1 runtime diagnostics on the verified run included:

- `structures=3`;
- `dwellingCandidate=trellis-derived-generated-lod1`;
- `dwellingLod=1`;
- `dwellingTriangles=53538`;
- `storehouseCandidate=project-owned-glb`;
- `storehouseTriangles=15550`;
- `workshopCandidate=procedural-project-owned`;
- `workshopTriangles=22480`;
- `treeCandidate=procedural-project-owned`;
- `trees=32`;
- `inhabitantCandidate=procedural-project-owned-readability-prototype`;
- `inhabitants=5`;
- `failed=false`;
- `deviceLost=false`;
- `tick>=1`;
- `drawCalls>=1`.

Storehouse screenshot evidence artifact: `10574496297`; artifact ZIP SHA-256 `3c7b252e33f2e3b1b53feea9f2e2e1476b9da258f944ac962158a7d55868706b`.

Files:

- `supplied-storehouse-webgl2-1920x1080.png`;
- `supplied-storehouse-closeup-1920x1080.png`.

## Visual QA verdict

**PASS for WIP runtime admission only.**

The screenshots show one storehouse, not a duplicate. Its scale is credible against the inhabitant and surrounding buildings; supports meet the ground; roof orientation is correct; embedded base-color textures render; there is no obvious missing texture, catastrophic UV projection, gross seam, baked-lighting artifact or accidental metallic material response in the captured views.

Known limitations remain:

- no normal map;
- no roughness-map texture;
- no texture/mesh compression;
- no production storehouse LOD;
- existing UVs retain close-up wood-grain stretching risk;
- actual-hardware GPU/VRAM/frame-time acceptance pending;
- final historical/material/art acceptance pending.

Therefore `artGatePassed=false` remains authoritative.

## Git history / integration

The storehouse-only reconciliation was merged through PR #51. The subsequent PR #57 removed redundant storehouse query-route plumbing and restored the scoped working agreement without changing storehouse admission or QA behavior.

Do not replay the old Astra handoff wholesale and do not reset to the pre-reconciliation `b34a449...` baseline. Continue from current `main` and reconcile any future work against the current head first.

## Next Phase 1 work

Continue only with bounded Phase 1 content/art tasks. Keep the procedural workshop and inhabitant prototype until materially better candidates pass strict + visual QA. Storehouse optimization/LOD/full-PBR work requires separate evidence and must not silently redefine the already verified admission checkpoint. Phase 2 gameplay remains blocked while the Phase 1 art/hardware gate is open.
