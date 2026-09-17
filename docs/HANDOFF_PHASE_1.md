# Phase 1 checkpoint — NOT COMPLETE

## IMPLEMENTED

220 m environment study with rolling terrain and three level placement sites, recessed stream bed and animated ripple material, feathered earth path, woodland leaf litter, chunked procedural meadow, 9 acquired CC0 terrain textures, engine lighting/fog/CameraFrame effects, terrain-aware inspection camera, asynchronous GLB/texture ownership and bounds normalization. Default entry is the environment study; ?scene=calibration retains Phase 0. Controls are shown in the UI; 1/2/3 select views, WASD/arrows pan, QE rotate, wheel zooms, Shift-drag pans.

## ASSETS ADDED/CHANGED

Three Poly Haven terrain material sets (diffuse/OpenGL-normal/roughness), acquisition receipt and published credits; original dwelling concept PNG and briefs; and one rectangular dwelling GLB generated with the free official Microsoft TRELLIS.2 Hugging Face Space. The dwelling is 5,621,848 bytes, 99,298 triangles and 105,019 vertices, with embedded 2048 px base-color and metallic-roughness WebP maps. It has no LOD. Structural checks, texture decoding and pinned-engine `EXT_texture_webp` parser support passed; visual, historical and performance QA remain pending. The roundhouse, workshop, inhabitant and tree slots remain null, and the scene contains no primitive substitutes for them.

## MINIMUM VALIDATION PERFORMED

`npm run validate` after dwelling integration: TypeScript passed; 7/7 Node tests passed; production build passed. New tests check finite geometry, index validity, upward winding, submerged stream bed and level building pads. Renderer execution/screenshots and 60 FPS were NOT established. Old environment blocked browser localhost; game-dev CLI is absent. Engine bundle warnings remain as recorded in PROJECT_STATE.

## CONCRETE BLOCKER / NEXT ACTION

The authorized free official Microsoft TRELLIS.2 Hugging Face conversion succeeded, and `public/assets/buildings/boii_dwelling_rectangular.glb` is admitted for runtime evaluation. The current version remains constrained to free tools and noncommercial use. The earlier fal.ai attempt returned HTTP 403 `balance_exhausted` and produced no conversion. Phase 1 remains blocked on actual-GPU visual and performance review, historical review of the dwelling, and free acquisition/conversion of the roundhouse, workshop, inhabitant and tree slots. All other asset briefs are in assets/source/PHASE1_ASSET_REQUESTS.md.

## QA HANDOFF

- Confirm current remote main and external Phase 0 QA before merging; this standalone package has no verified main SHA. Preserve other chat's changes.
- npm ci; npm run validate; npm run preview. Verify default scene with ?debug=1 and forced ?renderer=webgl2&debug=1 on an actual GPU.
- Check no missing textures, finite diagnostics, camera drag/pan/zoom/presets, keyboard focus, resize, pause and hidden-tab return.
- Inspect path and water edges for z-fighting, blending, TAA ghosting and texture normal orientation. Compare ?scene=calibration for baseline regressions.
- Review the admitted rectangular dwelling on an actual GPU: confirm embedded WebP rendering, orientation and grounding, generated backside quality, silhouette and historical plausibility. Assess its 99,298-triangle cost and lack of LOD against the performance budget; loading and structural validation do not establish visual or historical acceptance. Source the four remaining null model slots through free routes, then record license and topology evidence before admission.
- Measure and add appropriate tree batching/instancing/LOD against the actual assets; validate resource teardown and repeated scene loads.
- Capture settlement, close craft view and river view on both renderers; perform historical and commercial visual gate review. Frame rate targets remain unmeasured.
- Update docs/PROJECT_STATE.md; no Phase 2 until Phase 1 acceptance.

## KNOWN RISKS

This is an environment checkpoint, not the completed milestone. One dwelling structure is integrated; the other structures, inhabitants and forest trees are still absent. No animation, production sky/environment reflections or vegetation LOD implemented. Camera/effects/asset-load runtime paths are typechecked but not GPU verified. No GitHub upload/deployment occurred here. No broader gameplay systems changed.

## FILES CHANGED SINCE PHASE 0

```text
AGENTS.md
README.md
assets/source/PHASE1_ASSET_REQUESTS.md
assets/source/phase1/boii-dwelling-concept.png
assets/source/phase1/dwelling-receipt.json
assets/source/phase1/terrain-receipt.json
docs/ASSET_MANIFEST.md
docs/HANDOFF_PHASE_1.md
docs/PROJECT_STATE.md
index.html
package.json
public/ASSET_CREDITS.txt
public/assets/buildings/boii_dwelling_rectangular.glb
public/assets/materials/terrain/brown_mud_02_diff_1k.jpg
public/assets/materials/terrain/brown_mud_02_nor_gl_1k.jpg
public/assets/materials/terrain/brown_mud_02_rough_1k.jpg
public/assets/materials/terrain/forest_ground_04_diff_1k.jpg
public/assets/materials/terrain/forest_ground_04_nor_gl_1k.jpg
public/assets/materials/terrain/forest_ground_04_rough_1k.jpg
public/assets/materials/terrain/grass_path_2_diff_1k.jpg
public/assets/materials/terrain/grass_path_2_nor_gl_1k.jpg
public/assets/materials/terrain/grass_path_2_rough_1k.jpg
scripts/check-landscape.mjs
src/main.ts
src/render/benchmark-scene.ts
src/render/inspection-camera.ts
src/render/landscape.ts
src/render/meadow.ts
src/render/runtime.ts
src/render/scene-assets.ts
src/render/scene.ts
src/style.css
```
