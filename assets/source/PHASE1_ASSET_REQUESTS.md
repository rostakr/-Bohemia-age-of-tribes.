# Phase 1 Boii Hamlet — production asset requests

Status: request briefs only. No generated or third-party model is represented as an
approved production asset. All deliveries must include source/version, author or
provider, acquisition date, exact license URL, proof of acquisition where applicable,
and permission for commercial redistribution inside a browser game.

## Shared delivery specification

- GLB 2.0, metres, Y-up, ground-centred pivot, transforms applied.
- PBR metallic/roughness materials: base color, tangent-space normal, roughness and AO;
  metallic only where physically appropriate. No baked directional light or background.
- UVs must avoid obvious overlaps except deliberate mirrored parts. Use 2K maps per
  hero building/character and 1K–2K per vegetation asset.
- Web target: avoid required Draco, Meshopt, or KTX2 until the runtime decoder path is
  approved. Embedded PNG/JPEG/WebP textures are acceptable for the first integration.
- Supply exact triangle count, material count, texture dimensions/maps, bounding box,
  authoring units, pivot, and any alpha/blend requirements.
- Historically grounded Late La Tène Boii construction in south/central Bohemia. No
  medieval, Roman, fantasy, Viking, or ornamental Celtic-knot shorthand.

## `boii_dwelling_rectangular.glb`

Rectangular timber post-frame dwelling, target footprint 7 × 5 m and ridge height
4.5 m. Steep straw-thatch gable roof with irregular hand-laid edges; visible posts,
horizontal wattling beneath restrained pale earth/clay daub, timber door surround,
packed-earth sill and subtle use/weather staining. Closed silhouette suitable for an
RTS exterior view; no chimney, glass, masonry foundation, or medieval half-timbering.
Target 25k–60k triangles, one 2K atlas plus optional separate thatch atlas.

## `boii_storehouse_small.glb`

Small raised or moisture-protected timber/wattle storage structure, target footprint
3 × 3 m and height about 3.2 m. Compact steep thatch roof, stout posts, simple timber
door, plausible joinery and restrained wear. It must read distinctly from the dwelling
at a 30–60 m RTS camera distance. Target 15k–35k triangles, one 2K atlas.

## `boii_carpentry_shed_open.glb`

Open-sided carpentry/work shelter, target footprint 5 × 3 m and ridge height about
3.5 m. Timber posts and braces, rough plank/earth work surface, steep thatch canopy,
woodworking bench or trestles, split timber and two or three period-plausible hand-tool
silhouettes. Avoid later medieval sawmills or modern iron tools. Target 20k–45k
triangles, one 2K atlas; keep loose props as named child nodes where practical.

## `boii_adult_worker.glb`

Reusable adult Boii inhabitant, 1.72 m tall, neutral relaxed standing pose. Practical
Late La Tène clothing: knee-length wool tunic, belt, trousers, simple leather shoes,
restrained undyed earth/ochre/blue textile palette, plausible hair. No torc as everyday
uniform, horned helmet, tartan cliché, fantasy armour, oversized weapon, or Roman kit.
Full body and clean silhouette. Target 25k–50k triangles, one 2K atlas. A rig is optional
for this milestone; if supplied, document skeleton orientation, root, sockets, and clips.

## `oak_mature_central_europe.glb` / `birch_young_central_europe.glb`

Botanically plausible deciduous trees for Bohemia, 10–15 m target mature height. Trunk
and primary branches need useful silhouette and bark normal/roughness response; foliage
may use alpha-masked cards with mip-safe padding and restrained summer green variation.
Supply at least one model if budget is constrained. Target 15k–40k triangles at LOD0
and a documented lower-detail variant or clear decimation plan. No tropical, manicured,
fantasy, or North American-specific form.

## Acceptance checks

Each GLB must load without external missing files, render nonblank in PlayCanvas WebGL2,
have no severe non-manifold or inverted-normal artifacts visible at the RTS benchmark
camera, preserve scale after import, and remain legible under neutral overcast lighting.
The asset manifest entry must be complete before scene integration.
