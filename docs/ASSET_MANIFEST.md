# Asset Manifest

This is the current authoritative Phase 1 asset-state summary. The exact pre-storehouse-admission long-form manifest is preserved byte-for-byte at `docs/archive/ASSET_MANIFEST_PRE_TEXTURED_STOREHOUSE.md`. Detailed generator/provider/source notes remain in the source receipts under `assets/source/phase1/` and in Git history.

## Project-owner supplied asset rights policy

All current and future files supplied by the project owner are considered cleared for use in this project. Licence investigation, licence-text archival, provider-rights verification and licence-based QA/release blocking are not required for those files. Source/provider metadata may still be retained where useful for technical provenance and reproducibility. Historical, visual, technical, structural and performance QA remain fully applicable.

## Runtime engine / foundation

| Asset | Source / license | Runtime role | State |
| --- | --- | --- | --- |
| PlayCanvas 2.22.1 | npm `playcanvas`, MIT; notice in `public/PLAYCANVAS-LICENSE.txt` | Sole 3D/gameplay engine | Pinned and integrated |
| Calibration floor + 1.8 m marker | Original project code | Phase 0 renderer/scale diagnostics | Verified |
| Terrain / stream / meadow | Original project code + admitted Poly Haven CC0 terrain maps | Phase 1 environment benchmark | Integrated; art polish/hardware QA still open |

## Admitted Phase 1 runtime assets / candidates

| Asset | Source / rights | Runtime form | Geometry / scale | Materials / textures | Admission state |
| --- | --- | --- | --- | --- | --- |
| Rectangular Boii dwelling | Original project concept converted through Microsoft TRELLIS.2 official free Hugging Face route; exact receipt in `assets/source/phase1/dwelling-receipt.json` | Source LOD0 GLB plus deterministic generated LOD1/LOD2 | LOD0 99,298 tris; LOD1 53,538 tris active in benchmark; LOD2 31,286 tris | Two embedded WebP material images preserved byte-for-byte by LOD generator | WIP runtime candidate; LOD1 visually reviewed at RTS distance; final historical/art + hardware thresholds open; `artGatePassed=false` |
| **Small Boii storehouse** | Original project geometry `src/render/storehouse.ts`; reproducible export `scripts/export-storehouse.mjs`; project-owned generated material sources under `assets/source/phase1/materials/` | **`public/assets/buildings/boii_storehouse_small.glb`** | SHA-256 `2e1e054a8a5d66c0a349015d2662a2831894c675378ac11a8e5db90ae15b2b95`; 9,933,356 bytes; 15,910 vertices; 15,550 tris; bounds ~3.856 × 3.376 × 3.795 m; no LOD | Five materials. Timber/thatch/daub use three embedded 1254×1254 PNG base colors; wattle/earth use factors. Geometry normals + UV0 present on all five primitives. No normal/roughness maps. | **Admitted as `project-owned-glb` WIP candidate.** Strict GLB intake + current-main full runtime QA passed in run `35410230067`; storehouse evidence artifact `10574496297`. Final compression/PBR/LOD/historical/art/hardware acceptance open; `artGatePassed=false`. |
| Boii carpentry/workshop shelter | Original project code `src/render/workshop.ts`; internal project work | Procedural PlayCanvas mesh | 22,876 vertices; 22,480 tris; ~5.24 × 3.607 × 3.675 m | Project-owned procedural materials | WIP candidate `procedural-project-owned`; production GLB slot remains null; final art/historical/hardware acceptance open |
| Mature central-European deciduous tree | Original project code `src/render/tree.ts`; internal project work | Shared procedural mesh, 32 runtime instances | 8,980 vertices; 15,980 tris candidate mesh; ~11.107 × 13.290 × 11.403 m | Vertex-coloured summer foliage + bark material | WIP composition candidate; production GLB/LOD/botanical/hardware acceptance open |
| Generic Boii adult inhabitant readability prototype | Original project code `src/render/inhabitant.ts`; internal project work | One shared procedural mesh cloned to five static entities | 910 vertices; 1,404 tris; ~1.717 m high | One vertex-coloured non-metallic material | Readability prototype only, not production character. Production GLB/atlas/rig/art acceptance remains open |

## Environment texture assets

| Asset | Source / license | Maps | State |
| --- | --- | --- | --- |
| `grass_path_2` | Poly Haven, CC0 | 1K diffuse / normal GL / roughness | Integrated |
| `forest_ground_04` | Poly Haven, CC0 | 1K diffuse / normal GL / roughness | Integrated |
| `brown_mud_02` | Poly Haven, CC0 | 1K diffuse / normal GL / roughness | Integrated |

Exact terrain hashes and dimensions are recorded in `assets/source/phase1/terrain-receipt.json`.

## Storehouse admission evidence

Current storehouse GLB structural result:

- file: `public/assets/buildings/boii_storehouse_small.glb`
- SHA-256: **`2e1e054a8a5d66c0a349015d2662a2831894c675378ac11a8e5db90ae15b2b95`**
- size: **9,933,356 bytes**
- triangles: **15,550**
- vertices: **15,910**
- primitives: **5**
- materials: **5**
- NORMAL: **5/5 primitives**
- TEXCOORD_0: **5/5 primitives**
- embedded images/textures: **3 / 3**, each **1254×1254** PNG base color
- external dependencies: **0**
- animations / skins: **0 / 0**
- strict intake: **PASS**
- current-main verification SHA: **`47728da23ae73a01b298b935d59a431bc6088548`**
- current-main workflow: **`35410230067` — PASS**
- lifecycle: **3/3 remount cycles PASS**
- WebGL2: **PASS**
- software WebGPU regression: **PASS**
- Phase 1 smoke: **PASS**, `structures=3`, `storehouseCandidate=project-owned-glb`, `storehouseTriangles=15550`, workshop and inhabitant remain procedural candidates
- dedicated storehouse admission + close-up smoke: **PASS**
- screenshot artifact: **`10574496297`**, ZIP SHA-256 **`3c7b252e33f2e3b1b53feea9f2e2e1476b9da258f944ac962158a7d55868706b`**
- screenshot files: `supplied-storehouse-webgl2-1920x1080.png`, `supplied-storehouse-closeup-1920x1080.png`

Visual review supports WIP admission: the captured scene contains exactly one storehouse; scale and raised support geometry are plausible against inhabitants/buildings; roof orientation is correct; ground contact/shadow is stable; embedded textures render; no obvious missing texture, UV collapse, gross seam/projection corruption, baked-lighting artifact or accidental metallic material response is visible in the benchmark and close-up evidence.

Known limits: base-color-focused material pass, no normal map, no roughness-map texture, no texture/mesh compression, no production storehouse LOD, and 9.93 MB is heavy for an object of this size. Existing UVs still carry grain-stretching risk at close inspection. Actual-hardware GPU/VRAM/frame-time acceptance and final historical/art acceptance remain open. These limits do not justify `artGatePassed=true`.

Detailed source/export/material evidence:

- `assets/source/phase1/storehouse-receipt.json`
- `assets/source/phase1/storehouse-glb-receipt.json`
- `assets/source/phase1/materials/weathered-oak-receipt.json`
- `assets/source/phase1/materials/roof-and-daub-receipt.json`

## Supplied workshop / worker — provenance only, not runtime admission

The Astra/content handoff also supplied workshop and adult-worker GLBs. Their usage rights are cleared by the project owner. They are **not admitted** to canonical runtime paths for technical/visual reasons only.

- Supplied workshop: **89,778 tris**, above the current workshop target, and strict intake reports missing required `NORMAL`.
- Supplied worker: **14,106 tris** is potentially efficient enough for RTS use, but strict intake reports missing required `NORMAL`; the previously reviewed textured preview was rejected for severe patchwork / mis-projected face, clothing and rear textures.
- Original supplied files and intake metadata are retained under `assets/source/phase1/user-supplied/` for provenance and future reference.
- Do not restore these files to `public/assets/...` or populate `ADMITTED_MODELS.workshop` / `ADMITTED_MODELS.inhabitant` without a new clean candidate and full structural + visual QA.

## Asset gate rules

For every future production candidate record:

1. source/provider/acquisition route where useful for provenance and reproducibility; project-owner-supplied assets require no further licence review;
2. runtime destination and source receipt;
3. units, Y-up orientation, ground-centred pivot and dimensions;
4. vertices/triangles per LOD;
5. texture dimensions and exact map set;
6. UV/NORMAL/tangent requirements as applicable;
7. external dependencies and compression/decoder requirements;
8. historical/regional fit;
9. WebGL2/WebGPU/runtime/lifecycle evidence;
10. actual-hardware performance before final LOD thresholds are selected.

A generated/source asset is not final production art merely because it imports and renders. `artGatePassed=false` remains authoritative until the remaining Phase 1 art, historical and hardware gates are explicitly satisfied or waived.
