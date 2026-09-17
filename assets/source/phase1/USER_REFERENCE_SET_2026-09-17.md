# Phase 1 user reference set — 2026-09-17

Purpose: source-of-truth description for the three user-supplied visual references intended to drive the next free/noncommercial 2D→3D conversion pass. These references guide silhouette/material/readability only; they are **not archaeological approval** and must be reconciled with the existing Late La Tène Boii briefs in `assets/source/PHASE1_ASSET_REQUESTS.md`.

## Reference A — small storehouse / raised storage

Original attachment: `C237B115-1E45-41E8-8142-9F768370879F.jpeg`

- Resolution: 1254×1254
- SHA-256: `b9f6fdd6ea0e6108b220ed396272e81cf8d8d95de3627e0b8a2ec3061acec9f8`
- Target runtime asset: `public/assets/buildings/boii_storehouse_small.glb`
- Preserve: compact raised silhouette, steep thatch roof, stout timber posts, readable entry, restrained weathered wood/earth palette.
- Correct rather than copy: domestic-looking stairs, prominent later-style latch/hinge language, decorative heavy carpentry and uniform sawn-plank infill.
- Existing production brief remains authoritative: ~3×3 m footprint, ~3.2 m overall height, 15k–35k triangles, one 2K atlas.

### TRELLIS.2 conversion direction

Create a compact Late La Tène Boii storage building for South/Central Bohemia, inspired by the supplied raised thatched timber reference but **not copied literally**. Small moisture-protected storehouse on stout posts, steep irregular straw-thatch gable roof, simple timber/wattle wall construction, restrained natural wear, simple period-plausible doorway, ground-centred and isolated. Remove medieval-looking ornamental joinery, heavy hardware, domestic staircase character and modern/sawn-plank regularity. No stone foundation, glass, chimney, fantasy ornament, Roman details or modern metal fittings. Clean game-ready silhouette for 30–60 m RTS viewing distance.

## Reference B — adult worker

Original attachment: `B71554C4-303D-4BF0-8AF2-A0BE67B9D8C4.jpeg`

- Resolution: 1024×1536
- SHA-256: `747d2a50312959fbbcbf39802be21a445f482276a3101c0ff9fb74e6e822777b`
- Target runtime asset: `public/assets/characters/boii_adult_worker.glb`
- Preserve: generic adult male proportions, neutral standing posture, knee-length earth-tone tunic, belt, trousers and simple leather footwear.
- Do not reproduce a specific person's identity; generate a generic inhabitant.
- Existing production brief remains authoritative: ~1.72 m target height, 25k–50k triangles, one 2K atlas; rig optional for this milestone.

### TRELLIS.2 conversion direction

Create a generic adult Late La Tène Boii worker/in­habitant, full body, neutral relaxed standing pose, practical knee-length wool tunic in muted earth/ochre tones, leather belt, dark wool trousers and simple soft leather footwear. Natural medium-length hair and beard are acceptable but must not reproduce the reference person's identity. No torc as everyday uniform, horned helmet, tartan cliché, fantasy armour, Roman kit, oversized weapon or modern garment construction. Clean readable silhouette for RTS distance, anatomically plausible proportions, isolated subject, no background props.

## Reference C — open carpentry/work shelter

Original attachment: `96194F5D-333F-4E78-8421-620D8347BC57.jpeg`

- Resolution: 1254×1254
- SHA-256: `83930312ad716a62c7fa9bcd497ca846fdb3b23a366c86ac4fcbf5def2471b19`
- Target runtime asset: `public/assets/buildings/boii_carpentry_shed_open.glb`
- Preserve: open timber-frame silhouette, steep thatched canopy, four-post structure, workbench/trestles and visible woodworking activity.
- Correct rather than copy: later-looking joinery, fencing, overly finished carpentry and non-period tool forms.
- Existing production brief remains authoritative: ~5×3 m footprint, ~3.5 m ridge height, 20k–45k triangles, one 2K atlas; loose props as named child nodes where practical.

### TRELLIS.2 conversion direction

Create an open-sided Late La Tène Boii carpentry/work shelter for South/Central Bohemia, inspired by the supplied thatched timber workshop reference but historically simplified. Four stout timber posts with plausible braces, steep irregular straw-thatch canopy, rough workbench/trestles, split timber blanks and only two or three period-plausible hand-tool silhouettes. Keep most sides open. Remove medieval workshop ornament, modern iron tooling, sawmill machinery, decorative fencing and overly precise sawn carpentry. Ground-centred isolated game asset with a strong readable silhouette for 30–60 m RTS viewing distance.

## Conversion / provenance route

Use the same currently approved free/noncommercial route as the dwelling candidate: official Microsoft TRELLIS.2 Hugging Face Space / free public conversion path. Do not use a paid endpoint.

For each result, create a receipt beside the source reference documenting:

- provider/model/version and source URL;
- input attachment name and SHA-256;
- seed/settings/resolution/decimation/texture settings;
- output filename, bytes and SHA-256;
- vertex/triangle/material counts;
- embedded texture formats/dimensions;
- required glTF extensions;
- bounds and target scale;
- structural validation result;
- visual QA status;
- historical QA status.

## Integration requirements

1. Reject/retry malformed generation before scene integration.
2. Optimize each model to its brief before calling it production-eligible.
3. Runtime asset URLs stay behind `resolveAsset()`.
4. Wire accepted paths into the existing `BenchmarkScene` slots only after validation.
5. Populate the current benchmark with one storehouse, one workshop and about five instances of the reusable adult worker.
6. Preserve the Phase 0.5 runtime lifecycle, fixed-step core, WebGPU/WebGL2 fallback and every regression test.
7. Full combined CI must remain green.
8. Updated Phase 1 diagnostics should report at least 3 structures and 5 inhabitants.

Related work:

- Issue #16 — environment visual benchmark blockers.
- Issue #17 — generation/integration of these three references.
- Central-European tree/vegetation asset is still a separate missing Phase 1 slot.
