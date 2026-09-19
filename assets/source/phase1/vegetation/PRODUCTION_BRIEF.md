# Phase 1 — Central European deciduous trees

Original concept: `central-european-trees-concept.png`. This is an art reference,
not a runtime screenshot, botanical verification or completed 3D asset.

| ASSET | CATEGORY / CULTURE | VISUAL DESCRIPTION | TECHNICAL TARGET |
| --- | --- | --- | --- |
| tree_oak_01 | Vegetation / neutral | Pedunculate oak; spreading irregular crown, fissured grey-brown trunk, crooked limbs, lobed leaf clusters with open gaps | Height 14 m; LOD0/1/2 ≤18k/8k/2k triangles |
| tree_beech_01 | Vegetation / neutral | European beech; smooth silver-grey bark, ascending limbs, domed crown, oval leaves | Height 16 m; LOD0/1/2 ≤16k/7k/2k triangles |
| tree_birch_01 | Vegetation / neutral | Silver birch; slender white bark, dark lower fissures, airy crown, drooping fine twigs | Height 12 m; LOD0/1/2 ≤12k/5k/1.5k triangles |

REFERENCE REQUIREMENTS: separate botanical reference for trunk, branching and leaves
of each named species; verify Central European habitat suitability externally.
The generated sheet is visual direction only. Roots in final models should meet soil
naturally, without the conspicuous exposed radial root fans in the concept.

TECHNICAL: separate GLB files per species and LOD, metres, Y-up, identity transform,
pivot at ground-centre of trunk. Up to two material slots: opaque bark and masked
foliage. Shared 2048² bark and leaf atlases per species, base color, tangent-space
normal, roughness; leaf alpha with padded edges. Non-metallic. Leaves use alpha
mask rather than blended transparency. Double-sided foliage only where necessary.
Avoid modelling every leaf with dense geometry. No opaque green canopy blobs.
No mandatory decoder extension before the runtime pipeline supports it.

INTEGRATION: first oak candidate targets `public/assets/environment/tree_oak_01.glb`
and the existing BenchmarkModels.tree slot. Beech/birch await species-aware placement;
do not relabel one model as three species. Retain clear settlement paths and riverbanks,
use broken forest edges and visible crown gaps. No collision/nav implementation here.

SOURCE: original generated reference. Acquire or create 3D meshes with documented
rights and source receipts; no third-party mesh has been acquired in this task.
Use free tools only. Do not retry the previously exhausted conversion quota.

QA HANDOFF: external chat checks botanical fit, crown readability, alpha edges/shadows,
LOD transitions, ground contact, WebGPU/WebGL2 and actual-hardware performance.
Budgets above are production targets, not measured results. No tests run in this task.
