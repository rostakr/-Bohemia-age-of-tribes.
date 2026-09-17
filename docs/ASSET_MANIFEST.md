# Asset Manifest

This manifest records only assets actually present in Phase 0. A missing row is not permission to use an asset, and no license is claimed for assets that have not been imported.

| Asset | Source / location | License | Format | Dimensions / mesh | Textures / maps | LOD | State | Culture | Usage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PlayCanvas 2.22.1 | npm `playcanvas`; https://github.com/playcanvas/engine | MIT; notice in `public/PLAYCANVAS-LICENSE.txt` | JS/TS declarations | Not applicable | Not applicable | Not applicable | Installed, pinned, bundled | Neutral | Runtime engine |
| Calibration floor | Original code, `src/render/calibration-scene.ts` | Internal project work; no third-party art | Engine plane primitive | 20 × 20 m; engine-default topology | None; solid diagnostic material | None | Implemented greybox | Neutral | Disposable scale/render check |
| Height marker | Original code, `src/render/calibration-scene.ts` | Internal project work; no third-party art | Engine box primitive | 0.45 × 1.8 × 0.45 m; engine-default topology | None; solid diagnostic material | None | Implemented greybox | Neutral | Disposable height/render check |

Asset directories are reserved as follows:

- Runtime: `public/assets/buildings`, `characters`, `environment`, `materials`, `animations`, and `ui`
- Editable source files: `assets/source`

No professional or commercial art asset is included in Phase 0.

## Commercial asset gate

Before purchase, import, or mass production, add a proposed entry and verify:

1. Store page, author, exact product/version, acquisition date, and source files.
2. License terms for redistribution in a shipped browser game, team use, modification, and generated derivatives.
3. Historical and regional fit with the applicable culture and period.
4. Technical fit: format, scale, topology, materials, texture sizes, animation rig, performance, and WebGPU/WebGL2 behavior.
5. Required edits, attribution, proof of purchase, and the approved production destination.

Do not infer a license from availability, and do not record a planned asset as owned or imported.

For every future art row, record exact triangle counts per LOD, texture dimensions and material maps, units/pivot, culture, runtime destination and implementation state. Prefer GLB/glTF, metres, Y-up and a ground-centred pivot for freestanding objects. Rig orientation and sockets must be specified for characters. Treat KTX2/Meshopt/Draco as pipeline decisions requiring a verified runtime decoder path, not as already configured features.
