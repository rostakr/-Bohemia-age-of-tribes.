# Asset Manifest

This is the authoritative current Phase 1 asset-state summary after final QA acceptance on 2026-09-22. Earlier long-form states remain preserved in `docs/archive/` and Git history.

## Project-owner supplied asset rights policy

All files supplied by the project owner are considered cleared for this project. Source/provider metadata is retained where useful for provenance and reproducibility; technical, structural, historical, visual and performance QA remain applicable.

## Runtime foundation

| Asset | Runtime role | State |
| --- | --- | --- |
| PlayCanvas 2.22.1 | Sole 3D/gameplay engine | Pinned / accepted |
| Fixed-step simulation foundation | Engine-independent simulation timing | Preserved / accepted |
| Central asset resolver + lifecycle | Runtime loading/mount/unmount | Preserved / accepted |
| WebGPU preferred / WebGL2 fallback | Renderer policy | Regression PASS; actual desktop hardware benchmark deferred |
| Terrain / stream / meadow | Phase 1 environment benchmark | Accepted Phase 1 baseline; later polish allowed |

## Accepted Phase 1 benchmark

Final accepted candidate commit: `853d802e0512f4c89f068eb54f64337cf2a23195`  
Integration merge: `9d4c9fb642a2952efb279c0461378e5527891099`  
Accepted tree: `1fde280d7a8b61f3a1c87299b400fedc532c3b60`  
Canonical benchmark selector: `?candidate=phase1`

| Asset | Runtime form | Geometry / scale | Materials / textures | Phase 1 state |
| --- | --- | --- | --- | --- |
| Rectangular Boii dwelling | `buildings/boii_dwelling_rectangular_lod1.glb` | LOD1 53,538 tris; source LOD0 99,298; LOD2 candidate 31,286 | Two embedded material images retained by deterministic LOD pipeline | **ACCEPTED PHASE 1** |
| Small Boii storehouse | `buildings/boii_storehouse_small.glb` plus allowlisted runtime JPEGs | 15,550 tris / 17,810 vertices | Five material primitives; NORMAL + UV0; three deterministic 512² JPEG base-colour derivatives | **ACCEPTED PHASE 1** via #60 lineage |
| Repaired Boii carpentry/workshop shelter | generated `buildings/boii_carpentry_shed_project.glb` | 22,540 tris / 25,649 vertices; 5.24 × 3.57 × 3.414 m | Five material primitives, NORMAL + UV0; two embedded 512² JPEG base colours; scalar roughness/metalness | **ACCEPTED PHASE 1** via #71 |
| Boii adult worker R2 compact | generated `characters/boii_adult_worker_r2.glb` | 28,212 tris / 20,725 vertices; target height ~1.72 m | One material/image/texture; NORMAL + UV0; visually equivalent compact payload | **ACCEPTED PHASE 1** via #65/#68/#71; static/unrigged accepted limitation |
| Mature central-European deciduous tree | shared procedural mesh, 32 instances | 15,980 tris per shared candidate mesh | Project-owned procedural bark/foliage treatment | **ACCEPTED PHASE 1 composition**; runtime LOD thresholds deferred |
| Meadow / grass composition | procedural instanced/clumped scene content | benchmark composition | Current project materials | **ACCEPTED PHASE 1 composition**; later density/repetition polish allowed |

## Storehouse accepted payload

The compact storehouse implementation accepted into the final integration lineage has:

- GLB: **761,892 bytes**;
- GLB SHA-256: `f05ba7e6828269d360534749e5043f93b29bf30aa22b788d9b585c2eaaeeae68`;
- 15,550 triangles / 17,810 vertices / five primitives;
- NORMAL and UV0 on 5/5 primitives;
- three deterministic runtime 512² JPEGs, 324,129 bytes total;
- complete GLB + runtime texture payload: 1,086,021 bytes;
- dedicated current-baseline QA and later final-candidate foundation regressions passed.

Known limitation: no full production normal/roughness texture set and no production LOD. `BLOCKS_PHASE_2=NO`.

## Repaired workshop accepted payload

- generator: `node --experimental-strip-types scripts/export-workshop-project.mjs`;
- generated path: `public/assets/buildings/boii_carpentry_shed_project.glb`;
- output: **1,333,468 bytes**;
- SHA-256: `70663eedfbd2c3f54a039e5d0764c86af3bddcc6fe93bda8d1b32e720116283d`;
- 22,540 triangles / 25,649 vertices;
- five primitives/materials with NORMAL and UV0;
- two embedded 512² JPEG base-colour maps;
- no external dependencies or decoder requirement;
- visual blocker repairs: warmer/darker roof, controlled eave strands, lighter work surfaces, visible iron tools and shallow irregular earth grounding patch.

Independent final QA accepts the workshop for the Phase 1 benchmark. It is not represented as final shipping art. Full PBR-map polish and later LOD work are `BLOCKS_PHASE_2=NO`.

## Compact worker R2 accepted payload

Accepted visual precursor #65 output:

- 28,212 triangles / 56,424 vertices;
- 3,615,224 bytes;
- SHA-256 `c0e8144f07d84bfcd7b3e5118df59c1d589a65f23f512099ed75cb1881ba81b8`.

Lossless compaction #68 / final #71 output:

- 28,212 triangles unchanged;
- 20,725 vertices after bit-identical tuple deduplication;
- 2,106,832 bytes;
- SHA-256 `f50f87146909e4a3c7fa18e4a82c636fe05e24f0879f35e6a181c281c4efa21e`;
- one mesh / primitive / material / image / texture;
- NORMAL 1/1, UV0 1/1;
- 0 skins / 0 animations.

The compactor verifies every triangle corner's raw POSITION/NORMAL/UV bytes in order, embedded image bytes and relevant scene/material metadata. Accepted and compact neutral close-up evidence is pixel-identical. Static/unrigged status is an explicit Phase 1 limitation with `BLOCKS_PHASE_2=NO`.

## Environment texture assets

| Asset | Source / license | Maps | State |
| --- | --- | --- | --- |
| `grass_path_2` | Poly Haven, CC0 | 1K diffuse / normal GL / roughness | Integrated / accepted baseline |
| `forest_ground_04` | Poly Haven, CC0 | 1K diffuse / normal GL / roughness | Integrated / accepted baseline |
| `brown_mud_02` | Poly Haven, CC0 | 1K diffuse / normal GL / roughness | Integrated / accepted baseline |

Exact terrain hashes and dimensions remain recorded in `assets/source/phase1/terrain-receipt.json`.

## Final evidence

Exact candidate `853d802e0512f4c89f068eb54f64337cf2a23195`:

- foundation workflow `35769849049`: PASS;
- completion workflow `35769849029`: PASS;
- worker workflow `35769849012`: PASS;
- completion artifact `10713746346`, digest `sha256:16152d8d000eb58eb7aae6627d6b87fa68e05258b9e98ae3becda4f9bcbd7224`;
- candidate loaded and rendered through the real PlayCanvas WebGL2 runtime with the expected dwelling/storehouse/workshop/five workers/environment composition;
- lifecycle/remount and software WebGPU regressions passed through the foundation workflow.

`ACTUAL_DESKTOP_GPU_BENCHMARK: NOT_AVAILABLE_IN_THIS_ENVIRONMENT`. No CI software-renderer performance value is promoted as desktop-GPU evidence.

## Accepted later-phase limitations

| Limitation | BLOCKS_PHASE_2 |
| --- | --- |
| Storehouse production normal/roughness map set | NO |
| Workshop production normal/roughness map set | NO |
| Worker rig / animation | NO |
| Tree LOD switching thresholds based on desktop hardware | NO |
| Vegetation density/repetition polish | NO |
| Actual desktop-GPU benchmark | NO |

Do not choose final runtime LOD thresholds from software CI. Revisit those thresholds with real desktop hardware before later optimization/release gates.

## Asset gate result

**PHASE 1 ASSET / ART GATE: PASS.**  
`artGatePassed=true` for the accepted Phase 1 milestone benchmark. This means the content foundation is sufficient for Phase 2 RTS interaction work; it does not freeze later material, animation, vegetation or performance improvements.