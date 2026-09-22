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
| **Small Boii storehouse** | Original project geometry `src/render/storehouse.ts`; reproducible export `scripts/export-storehouse.mjs`; project-owned generated material sources under `assets/source/phase1/materials/` | **`public/assets/buildings/boii_storehouse_small.glb`** | 15,910 vertices; 15,550 tris; bounds ~3.856 × 3.376 × 3.795 m; no LOD; file 9,933,356 bytes | Five materials. Timber/thatch/daub use three embedded PNG base colors; wattle/earth use factors. Geometry normals + UV0 present on all five primitives. No normal/roughness maps. | **Admitted as `project-owned-glb` WIP candidate.** Strict GLB intake + full runtime QA passed in run `35408681042`; evidence artifact `10573840636`. Final compression/PBR/LOD/historical/art/hardware acceptance open; `artGatePassed=false`. |
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
- size: **9,933,356 bytes**
- triangles: **15,550**
- vertices: **15,910**
- primitives: **5**
- materials: **5**
- NORMAL: **5/5 primitives**
- TEXCOORD_0: **5/5 primitives**
- embedded images/textures: **3 / 3**
- external dependencies: **0**
- animations / skins: **0 / 0**
- strict intake: **PASS**
- runtime/load/render/remount/WebGPU/WebGL2/close-up QA: **PASS** in workflow `35408681042`
- evidence artifact: `10573840636`, SHA-256 `eaee51e6987cf4e9d87c66c4d2865d846bf3a3e8753fba06881e6ff7dafb58e2`

Visual review supports WIP admission: scale and raised support geometry are plausible against inhabitants/buildings; roof orientation is correct; ground contact/shadow is stable; no obvious UV collapse, gross seam or projection corruption was visible in the benchmark and close-up evidence.

Known limits: base-color-focused material pass, no normal/roughness maps, no storehouse LOD, no texture compression, and 9.93 MB is heavy for an object of this size. These remain Phase 1 art/performance work and do not justify `artGatePassed=true`.

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

### Workshop repair candidate — 2026-09-22

- Asset: `boii_carpentry_shed_project`, Boii Late La Tène craft shelter, QA candidate.
- Source: project-owned `src/render/workshop-repair.ts`, derived narrowly from the
  prior project workshop; no third-party geometry. Existing texture provenance is
  recorded in `assets/source/phase1/materials/`; project noncommercial usage applies.
- Export: `node --experimental-strip-types scripts/export-workshop-project.mjs`.
- Generated path: `public/assets/buildings/boii_carpentry_shed_project.glb`.
- Receipt: `assets/source/phase1/workshop-project-glb-receipt.json` (generated in CI).
- GLB: 1,333,468 bytes; SHA-256 `70663eedfbd2c3f54a039e5d0764c86af3bddcc6fe93bda8d1b32e720116283d`.
- Geometry: 22,540 triangles / 25,649 vertices; five material primitives with NORMAL
  and UV0. Metres, Y-up, ground origin; bounds 5.24 × 3.57 × 3.414 m.
- Textures: two embedded 512² JPEG base-color maps (existing oak/thatch derivatives).
  No external dependencies or decoder. Scalar roughness/metalness, no normal maps.
- Repair: warm darker roof, short controlled eave strands, shallow irregular earth
  patch, lighter worn bench/trestle tops, brighter iron tools. Default workshop stays
  unchanged while `?candidate=phase1` combines this candidate with the compact worker.
- LOD: none. Historical/visual/hardware acceptance remains pending; not production admission.

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
