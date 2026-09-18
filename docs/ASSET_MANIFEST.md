# Asset Manifest

This manifest records assets present through the current Phase 1 checkpoint. A missing row is not permission to use an asset, and no license is claimed for assets that have not been imported.

| Asset | Source / location | License | Format | Dimensions / mesh | Textures / maps | LOD | State | Culture | Usage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PlayCanvas 2.22.1 | npm `playcanvas`; https://github.com/playcanvas/engine | MIT; notice in `public/PLAYCANVAS-LICENSE.txt` | JS/TS declarations | Not applicable | Not applicable | Not applicable | Installed, pinned, bundled | Neutral | Runtime engine |
| Calibration floor | Original code, `src/render/calibration-scene.ts` | Internal project work; no third-party art | Engine plane primitive | 20 × 20 m; engine-default topology | None; solid diagnostic material | None | Implemented greybox | Neutral | Disposable scale/render check |
| Height marker | Original code, `src/render/calibration-scene.ts` | Internal project work; no third-party art | Engine box primitive | 0.45 × 1.8 × 0.45 m; engine-default topology | None; solid diagnostic material | None | Implemented greybox | Neutral | Disposable height/render check |

Asset directories are reserved as follows:

- Runtime: `public/assets/buildings`, `characters`, `environment`, `materials`, `animations`, and `ui`
- Editable source files: `assets/source`

No professional or commercial art asset is included in Phase 0.

## Phase 1 provider review

One Phase 1 dwelling model is imported for evaluation. The GLB/model slots for storehouse, workshop, inhabitant and tree remain empty; project-owned procedural storehouse, workshop, deciduous-tree and inhabitant candidates are integrated separately and are not represented as admitted production models. On 2026-09-17,
the live fal.ai catalog was reviewed for an image-to-3D route. `meshy/v7/image-to-3d`
advertised textured PBR GLB output, controllable topology, and a price of USD 0.80 per
generation. Five conversions would cost USD 4.00 before concept-image generation.

The Meshy route was not run. Fal's terms disclaim originality and non-infringement of
output and state that third-party materials may have additional terms. Meshy's
applicable output terms could not be retrieved through the available provider
connection, so that specific route remains uncleared.

- fal terms reviewed: https://fal.ai/legal/terms-of-service (last updated 2026-09-08)
- Candidate endpoint: `meshy/v7/image-to-3d`
- Candidate unit price observed: USD 0.80/generation
- Candidate output: GLB plus base-color, metallic, roughness, and normal maps when PBR is enabled
- Required clearance before use: written terms covering commercial redistribution of
  generated meshes and embedded textures in a shipped game, modification, and team use
- Production briefs: `assets/source/PHASE1_ASSET_REQUESTS.md`

### TRELLIS.2 follow-up

Microsoft's official TRELLIS.2 repository states that both the model and code are
released under MIT, and its `LICENSE` grants use, modification, publication,
distribution, sublicensing and sale of the software without a non-commercial
restriction. The repository separately identifies `nvdiffrast` and `nvdiffrec` as
dependencies under their own licenses; these are inference/rendering dependencies and
are not shipped in a generated GLB. This makes TRELLIS.2 materially clearer than the
Meshy route for generating from an original project-owned concept. As usual for
generative output, neither Microsoft nor fal warrants originality or non-infringement.

- Official repository: https://github.com/microsoft/TRELLIS.2
- Official license: https://github.com/microsoft/TRELLIS.2/blob/main/LICENSE
- Candidate fal endpoint: `fal-ai/trellis-2`
- Candidate price observed 2026-09-17: USD 0.05/unit
- Candidate output: textured GLB; 1K/2K/4K texture option; configurable decimation
- Execution status: a project-owned dwelling concept was created locally. Automatic
  approval review initially rejected its fal.ai upload as an external disclosure; the
  user later granted broad external-service consent and specifically authorized the
  exact image for the official Microsoft TRELLIS.2 Hugging Face Space. An authorized
  fal.ai attempt then returned HTTP 403 `balance_exhausted`; no conversion ran and no
  model was admitted. The current version is restricted to free tools and
  noncommercial use. The free official Hugging Face conversion succeeded; exact input, settings, hashes and output checks are recorded in `assets/source/phase1/dwelling-receipt.json`.

### Poly Haven tree follow-up

The official Poly Haven model API was queried on 2026-09-17. Its 521-model inventory
contained no oak, birch, or beech tree model. Available broadleaf trees were identified
as tropical or southern African species and were rejected for the Bohemian benchmark.
No mismatched tree was imported. Poly Haven's assets remain a valid CC0 source when a
botanically suitable model becomes available: https://polyhaven.com/license.

## Commercial asset gate

Before purchase, import, or mass production, add a proposed entry and verify:

1. Store page, author, exact product/version, acquisition date, and source files.
2. License terms for redistribution in a shipped browser game, team use, modification, and generated derivatives.
3. Historical and regional fit with the applicable culture and period.
4. Technical fit: format, scale, topology, materials, texture sizes, animation rig, performance, and WebGPU/WebGL2 behavior.
5. Required edits, attribution, proof of purchase, and the approved production destination.

Do not infer a license from availability, and do not record a planned asset as owned or imported.

For every future art row, record exact triangle counts per LOD, texture dimensions and material maps, units/pivot, culture, runtime destination and implementation state. Prefer GLB/glTF, metres, Y-up and a ground-centred pivot for freestanding objects. Rig orientation and sockets must be specified for characters. Treat KTX2/Meshopt/Draco as pipeline decisions requiring a verified runtime decoder path, not as already configured features.

## Phase 1 admitted environment assets

| Asset | Source/license | Format/maps | Size | Geometry/LOD | Culture/use | State |
| --- | --- | --- | --- | --- | --- | --- |
| grass_path_2 | Poly Haven, CC0; https://polyhaven.com/a/grass_path_2 | JPG diffuse/normal GL/roughness | 1K maps | Texture; no geometry/LOD | Neutral, meadow ground | Downloaded, hash verified, integrated; GPU QA pending |
| forest_ground_04 | Poly Haven, CC0; https://polyhaven.com/a/forest_ground_04 | JPG diffuse/normal GL/roughness | 1K maps | Texture; no geometry/LOD | Neutral, leaf litter | Downloaded, hash verified, integrated; GPU QA pending |
| brown_mud_02 | Poly Haven, CC0; https://polyhaven.com/a/brown_mud_02 | JPG diffuse/normal GL/roughness | 1K maps | Texture; no geometry/LOD | Neutral, worn path | Downloaded, hash verified, integrated; GPU QA pending |
| Landscape | Original scene code | Procedural mesh | 220 × 220 m | 64,800 triangles; no LOD | Neutral, terrain | Topology checks passed |
| Stream | Original scene code | Procedural mesh + analytic normal map | 220 m; 128² normal data | 440 triangles; no LOD | Neutral, water | Integrated; visual QA pending |
| Meadow ground cover | Original scene code | Spatially chunked grass ribbons | Variable clumps; see runtime diagnostics | 9 triangles/clump; frustum-cullable chunks; no LOD | Neutral, ground detail | Integrated; no claim of tree replacement |
| Boii dwelling concept | Original generated concept, not third-party art | PNG, assets/source/phase1/boii-dwelling-concept.png | 1536 × 1024 | 2D only; no model/LOD | Boii, conversion input | Created and converted through authorized free official Hugging Face route; not historical validation |
| Rectangular Boii dwelling | Original concept converted with Microsoft TRELLIS.2 official Hugging Face Space; MIT model/code reference | GLB; embedded 2048 × 2048 WebP base-color and metallic-roughness maps; `EXT_texture_webp` | 5,621,848 bytes; scaled bounds 8.002 × 4.5 × 5.443 m | 105,019 vertices; 99,298 triangles; no LOD | Boii dwelling candidate; noncommercial current project use | Integrated; GLB structure, finite attributes, index bounds and texture decoding passed; visual, historical and performance QA pending |

## Phase 1 internal content candidates

| Candidate | Source/license | Runtime form | Dimensions | Geometry/LOD | Materials | Culture/use | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Small Boii storehouse | Original project code `src/render/storehouse.ts`; internal project work, no third-party art | Deterministic procedural PlayCanvas mesh; no external textures | Overall bounds 3.856 × 3.376 × 3.795 m including roof overhang; raised structural platform ~3.15 × 3.15 m | 15,910 vertices; 15,550 triangles; no LOD | Five solid non-metallic groups: weathered oak, hazel wattle, pale clay daub, straw thatch, packed earth | Boii / Late La Tène small raised storage candidate | Integrated as explicit `procedural-project-owned` WIP candidate; geometry tests, 3/3 lifecycle remount and software-WebGL2 screenshot passed. `ADMITTED_MODELS.storehouse` remains null; visual, historical and actual-hardware performance acceptance pending; `artGatePassed=false`. |
| Boii carpentry/workshop shelter | Original project code `src/render/workshop.ts`; internal project work, no third-party art | Deterministic procedural PlayCanvas mesh; no external textures | Overall bounds 5.24 × 3.607 × 3.675 m including roof overhang | 22,876 vertices; 22,480 triangles; no LOD | Four groups: weathered oak, straw thatch, packed earth, worked iron | Boii / Late La Tène open-sided craft shelter candidate | Integrated as explicit `procedural-project-owned` WIP candidate; 15/15 Node checks, 3/3 lifecycle remount and software-WebGL2 screenshot passed. Includes bench, trestles, split timber and restrained axe/chisel/gouge silhouettes. `ADMITTED_MODELS.workshop` remains null; visual, historical and actual-hardware performance acceptance pending; `artGatePassed=false`. |
| Mature central-European deciduous tree | Original project code `src/render/tree.ts`; internal project work, no third-party art | Deterministic shared procedural PlayCanvas meshes; no external textures; vertex-coloured foliage | Overall bounds 11.107 × 13.290 × 11.403 m at base scale | 8,980 vertices; 15,980 triangles at LOD0; 32 shared-mesh runtime instances; LOD1/LOD2 plan documented in receipt | Two groups: bark and summer foliage | South/central Bohemian broadleaf forest-edge composition candidate | Integrated as explicit `procedural-project-owned` WIP candidate; 17/17 Node checks, 3/3 lifecycle remount, software WebGPU regression and software-WebGL2 screenshot passed. `ADMITTED_MODELS.tree` remains null; botanical/visual/historical and actual-hardware performance acceptance pending; `artGatePassed=false`. |
| Generic Boii adult inhabitant study | Original project code `src/render/inhabitant.ts`; internal project work. User reference `B71554C4-303D-4BF0-8AF2-A0BE67B9D8C4.jpeg` informs only broad proportions and earth-tone tunic/trouser silhouette; no identity or source texture is reproduced | One shared procedural PlayCanvas mesh with vertex colours, cloned to five static benchmark inhabitants | Measured prototype bounds 0.840 × 1.717 × 0.395 m | 910 vertices; 1,404 triangles per shared prototype; no rig/LOD | One vertex-coloured non-metallic material | Boii / Late La Tène generic adult worker readability study | Fresh current-main candidate branch; structural CI pending on this branch. `ADMITTED_MODELS.inhabitant` remains null; visual, historical and actual-hardware acceptance pending; `artGatePassed=false`. |

Exact terrain paths, dimensions, published MD5 and SHA256 are recorded in `assets/source/phase1/terrain-receipt.json`. Exact dwelling generation settings, hashes, geometry and validation are recorded in `assets/source/phase1/dwelling-receipt.json`. Exact procedural storehouse source, deterministic seed, geometry statistics and CI evidence are recorded in `assets/source/phase1/storehouse-receipt.json`. Exact procedural workshop source, deterministic seed, geometry statistics and CI evidence are recorded in `assets/source/phase1/workshop-receipt.json`. Exact procedural tree source, geometry/placement seeds, LOD plan and CI evidence are recorded in `assets/source/phase1/tree-receipt.json`. Exact inhabitant reference scope, geometry targets and QA evidence are recorded in `assets/source/phase1/inhabitant-study-receipt.json`. All images are retained at acquired resolution. The dwelling concept is a 2D design, not a rendered game screenshot. Its preview does not prove final mesh quality.
