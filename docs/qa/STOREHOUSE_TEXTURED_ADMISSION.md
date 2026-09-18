# Phase 1 textured storehouse admission QA

Date: 2026-09-19

## Scope

This note records QA for the project-owned textured Boii storehouse delivered through the Astra/content handoff. It does **not** admit the supplied workshop or adult-worker GLBs; those remain rejected production candidates and are absent from canonical runtime paths in this PR.

Runtime candidate:

- `public/assets/buildings/boii_storehouse_small.glb`
- SHA-256: `2e1e054a8a5d66c0a349015d2662a2831894c675378ac11a8e5db90ae15b2b95`
- bytes: 9,933,356
- geometry: 15,910 vertices / 15,550 triangles
- primitives: 5
- NORMAL: 5/5 primitives
- TEXCOORD_0: 5/5 primitives
- materials: 5
- embedded images/textures: 3
- external dependencies: none
- required glTF extensions: none
- scale: metres, Y-up, ground-centred

The three embedded base-colour materials are derived from project-owned generated source images for weathered oak, straw thatch and clay daub. Exact generation/source receipts are retained in `assets/source/phase1/materials/` and `assets/source/phase1/storehouse-glb-receipt.json`.

## Rejected supplied assets deliberately excluded

The raw Astra/content handoff also placed a supplied workshop and adult-worker GLB into canonical runtime paths. QA reconciled those back out before this admission PR:

- workshop source SHA-256 `079a36689153538124c388faf84b0ab6e49b4b3b6d41c41a1f8de2aae5e32b1f`: 89,778 triangles, missing source NORMAL, previous textured review showed reconstruction noise/patchy projection; regenerate rather than decimate;
- worker source SHA-256 `40f00021016c8157459cc4dab9612bba849654afe89c82c45795cdb0d0d21a0c`: 14,106 triangles, missing source NORMAL, previous textured review showed patchwork/mis-projected face/clothing/rear surfaces; reject for production.

Their provenance remains documented in Issue #17 and the raw handoff branch, but they are not admitted by this PR.

## Structural and runtime QA

PR #42 head before documentation update: `446399ff86c5ae2ee2f37adb083ffca634b353d0`.
Workflow run: `35405966395` (#120).

Results:

- `npm ci`: PASS, 0 vulnerabilities
- strict TypeScript: PASS
- Node tests: **22/22 PASS**
- strict Phase 1 GLB intake: storehouse PASS, workshop PENDING, worker PENDING
- production Vite build: PASS
- Phase 0 WebGL2 startup/fallback/failure UI: PASS
- Phase 0 interactions: PASS
- Phase 1 lifecycle remount: **3/3 PASS** with the textured storehouse as the default storehouse slot
- Phase 0 software WebGPU regression: PASS
- default Phase 1 WebGL2 render smoke: PASS

Observed default benchmark diagnostics:

- structures: 3
- inhabitants: 5
- trees: 32
- grass clumps: 4,678
- dwelling: deterministic LOD1, 53,538 triangles
- storehouse: `project-owned-textured-glb-wip`, 15,550 triangles
- workshop: `procedural-project-owned`, 22,480 triangles
- tree candidate: 15,980 triangles
- inhabitant prototype: 1,404 triangles
- draw calls in final evidence capture: 307
- runtime `failed=false`, `deviceLost=false`

Phase 1 evidence artifact:

- artifact ID: `10572701160`
- artifact ZIP SHA-256: `08a0f57fd73fe4d8100e906b4336f87915cd481f485f417dd71bbf34c0d3ae88`
- screenshot: `phase1-webgl2-1920x1080.png`

## Visual review

The default-benchmark 1920×1080 screenshot was reviewed after runtime admission. At the current RTS camera distance the storehouse:

- renders nonblank at the expected small-storage scale;
- is grounded on the intended settlement pad;
- remains visually distinct from the dwelling and open workshop;
- does not duplicate the old procedural storehouse fallback;
- shows no obvious exploded geometry or severe inverted-face failure;
- shows no catastrophic UV stretching/seam artifact dominating the RTS view;
- keeps timber/thatch/daub base-colour regions stable.

The roof and daub read comparatively pale and material detail is subtle at this camera distance. This is acceptable for a **WIP admission candidate**, not for final art acceptance.

## Verdict

**ADMIT as project-owned textured WIP storehouse candidate.**

This admission does not mean the Phase 1 art gate is passed. Remaining storehouse work includes final material/colour balance, full PBR map strategy if beneficial, LOD strategy and actual-hardware performance/historical visual review. `artGatePassed=false` remains mandatory.
