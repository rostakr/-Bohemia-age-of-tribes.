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

One Phase 1 dwelling model is now imported for evaluation; the other four model slots remain empty. On 2026-09-17,
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

Exact terrain paths, dimensions, published MD5 and SHA256 are recorded in assets/source/phase1/terrain-receipt.json. Exact dwelling generation settings, hashes, geometry and validation are recorded in assets/source/phase1/dwelling-receipt.json. All images are retained at acquired resolution. The concept is a 2D design, not a rendered game screenshot. Its preview does not prove final mesh quality.

## Phase 1 user-supplied conversion references — 2026-09-17

These rows describe **2D reference inputs only**. They are not imported 3D assets, do not carry an archaeological approval claim, and do not imply a license for any future generated output beyond the current documented noncommercial project workflow. Exact prompts/corrections and hashes are recorded in `assets/source/phase1/USER_REFERENCE_SET_2026-09-17.md`; generation/integration work is tracked in GitHub Issue #17.

| Reference | Source / hash | Intended output | Target geometry | Historical handling | State |
| --- | --- | --- | --- | --- | --- |
| Small raised storehouse reference | User-supplied JPEG `C237B115-1E45-41E8-8142-9F768370879F.jpeg`; SHA-256 `b9f6fdd6ea0e6108b220ed396272e81cf8d8d95de3627e0b8a2ec3061acec9f8` | `public/assets/buildings/boii_storehouse_small.glb` | 15k–35k tris; ~3×3 m footprint; ~3.2 m height; one 2K atlas | Preserve raised/thatch silhouette; remove later-looking hardware, domestic stairs and over-finished medieval carpentry | Reference admitted for conversion; GLB pending |
| Adult worker reference | User-supplied JPEG `B71554C4-303D-4BF0-8AF2-A0BE67B9D8C4.jpeg`; SHA-256 `747d2a50312959fbbcbf39802be21a445f482276a3101c0ff9fb74e6e822777b` | `public/assets/characters/boii_adult_worker.glb` | 25k–50k tris; ~1.72 m height; one 2K atlas; rig optional | Use generic proportions/clothing only; do not reproduce a specific person's identity; no fantasy/Roman costume shorthand | Reference admitted for conversion; GLB pending |
| Open carpentry shelter reference | User-supplied JPEG `96194F5D-333F-4E78-8421-620D8347BC57.jpeg`; SHA-256 `83930312ad716a62c7fa9bcd497ca846fdb3b23a366c86ac4fcbf5def2471b19` | `public/assets/buildings/boii_carpentry_shed_open.glb` | 20k–45k tris; ~5×3 m footprint; ~3.5 m ridge; one 2K atlas | Preserve open thatched frame/workbench read; remove later-looking fencing, modern tools and ornamental joinery | Reference admitted for conversion; GLB pending |

### GLB admission tooling

`scripts/check-glb.mjs` is the repository-level structural admission checker for generated candidates. It validates GLB 2.0 structure, embedded-vs-external resources, finite POSITION data, index bounds, triangle primitive topology and optional triangle-budget limits. It also reports material/image/texture/animation/skin counts and glTF extensions. It is intentionally separate from historical and visual QA.

Example intake commands:

```sh
npm run check:glb -- public/assets/buildings/boii_storehouse_small.glb --min-tris 15000 --max-tris 35000
npm run check:glb -- public/assets/buildings/boii_carpentry_shed_open.glb --min-tris 20000 --max-tris 45000
npm run check:glb -- public/assets/characters/boii_adult_worker.glb --min-tris 25000 --max-tris 50000
```

The same structural logic was checked against the existing dwelling artifact and reproduced its recorded 99,298 triangles / 105,019 vertices with no external resource URIs. This does **not** remove the dwelling's existing optimization/LOD blocker.
