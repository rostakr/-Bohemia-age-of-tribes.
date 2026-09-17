# Phase 1 visual QA — CI evidence review

Evidence source: GitHub Actions run `35262530231`, artifact `10515106681`, `phase1-webgl2-1920x1080.png`.

Runtime head reviewed: `6ad76483cde4e2cf5c18e41c930af8cd347573f1`.

Review scope: 1920×1080 software-WebGL2 evidence from Chrome/SwiftShader. This review can identify composition/material/readability defects visible in the captured frame. It cannot certify actual-GPU performance, temporal stability, input feel, TAA behavior in motion or historical accuracy.

## Gate result

**TECHNICAL RUNTIME: PASS.**  
**PROFESSIONAL VISUAL BENCHMARK: NOT YET ACCEPTED.**

The environment is now a valid integrated checkpoint, but the captured frame still reads as a procedural environment study rather than a production-quality historical RTS benchmark.

## Blocking visual findings

### V1 — terrain tiling / macro variation

The ground shows strong repeated 1K texture patterning over large areas. At the RTS camera scale the repetition is immediately visible and dominates the landscape surface.

Required direction: retain the current licensed terrain inputs, but add macro-scale breakup/variation so near, mid and broad landscape frequencies do not expose a single repeated tile pattern. Any implementation must remain compatible with the central asset resolver and current PlayCanvas rendering path.

### V2 — stream banks and water read as a cut trench

The stream is visually separated from the terrain by steep, hard banks. The water surface is a uniform saturated teal strip with limited shallow-water/bank transition, making the river read as an artificial channel.

Required direction: soften and vary bank profiles, add believable shallow/sediment transition, reduce uniform saturation and keep water/path/terrain layers free of visible z-fighting.

### V3 — meadow detail reads as needle noise

The 4,678 procedural grass clumps are technically present but visually read as many thin dark/green needles distributed nearly everywhere. This creates high-frequency noise instead of coherent meadow vegetation.

Required direction: cluster vegetation spatially, vary scale/orientation/tone, use broader tuft silhouettes and leave deliberate negative-space patches. Do not solve this by multiplying draw calls uncontrollably; report the post-change draw-call count against the current baseline of 124.

### V4 — path is too uniform and graphic

The earth path is very dark, nearly constant-width and visually straight/regular across the frame. It reads as a painted stripe rather than a worn route responding to terrain and settlement use.

Required direction: introduce restrained curvature, width variation, softer shoulders and less extreme value contrast while keeping terrain-following geometry and avoiding texture seams.

### V5 — lighting / palette lacks Central-European naturalism

The captured landscape is strongly yellow-green and relatively flat. Terrain and meadow surfaces do not yet separate convincingly by moisture, exposure or local material context.

Required direction: move toward a restrained Central-European meadow/woodland palette, improve local value/color variation and preserve legibility of the settlement at RTS viewing distance. Do not use fantasy/cinematic color grading to hide material problems.

### V6 — settlement composition remains sparse

Only the rectangular dwelling is present; storehouse, workshop, inhabitants and trees remain intentionally absent. This is correct data-wise, but it means the frame cannot yet demonstrate the target hamlet composition or forest edge.

Required direction: do not add primitive stand-ins and do not claim completion. Keep the single dwelling readable while the missing historically reviewed assets are sourced separately.

### V7 — dwelling candidate is evaluation-only

The dwelling silhouette and thatch roof are readable in the screenshot, but the current camera distance does not establish generated backside quality, grounding detail or historical plausibility. The asset is also 99,298 triangles with no LOD, above its 25k–60k brief target.

Required direction: retain only as an evaluation candidate until close visual/historical review and optimization/LOD or replacement decision are complete.

## Non-blocking observations

- UI hierarchy and benchmark/debug separation are legible enough for QA.
- The path, stream and dwelling are spatially understandable at a glance.
- The current scene exposes useful diagnostics and produces repeatable evidence.
- Missing production slots are correctly reported as zero rather than silently substituted.

## Acceptance evidence required after visual iteration

1. Re-run the full combined CI suite; all Phase 0 calibration tests must remain green.
2. Capture updated 1920×1080 WebGL2 evidence for settlement, workshop-site and stream viewpoints.
3. Record the new Phase 1 diagnostics, especially draw calls, structures, grass clumps and renderer state.
4. Compare the updated settlement screenshot against this baseline and confirm that terrain tiling, grass needle-noise, hard stream trench and graphic path are materially reduced.
5. Perform a separate actual-GPU review before making a performance claim.
6. Perform historical review before accepting the dwelling or any new built/character asset.

## Architecture constraints for the fix

- Keep PlayCanvas 2.22.1 as the sole game/render engine.
- Preserve `createGameRuntime()` lifecycle and host-owned DOM/resize/visibility wiring.
- Preserve the fixed-step core and every Phase 0 regression route.
- Keep runtime assets behind `resolveAsset()`.
- Do not introduce React/Floot into gameplay/rendering.
- Do not add primitive substitutes for missing production models.
- Use only approved free/noncommercial asset routes unless project constraints are explicitly changed.

This visual QA is the current reason PR #14 should remain a draft checkpoint rather than being treated as an accepted Phase 1 milestone.
