# Phase 1 visual QA — v2 evidence review

Current evidence source: GitHub Actions run `35267593823`, artifact `10517456076`, `phase1-webgl2-1920x1080.png`.

Visual-pass runtime head represented by that run: `44867f7b847282b47213b14ff2d0b03fcca831b4` plus the final landscape regression test that was subsequently copied bit-for-bit to the authoritative Phase 1 branch in commit `f90efc1bd60b75e967844bfebc2c4b8f9e6ec4f4`.

Review scope: 1920×1080 software-WebGL2 evidence from Chrome/SwiftShader. This review can judge composition, material/readability defects and obvious geometry presentation issues in the captured frame. It cannot certify real-GPU performance, temporal stability, input feel, TAA behavior in motion or historical accuracy.

## Gate result

**TECHNICAL RUNTIME: PASS.**  
**ENVIRONMENT VISUAL PASS V2: MATERIAL IMPROVEMENT / CI PASS.**  
**PROFESSIONAL PHASE 1 VISUAL BENCHMARK: NOT YET ACCEPTED.**

The environment is substantially cleaner than the original checkpoint, but the scene still reads as an incomplete hamlet study because production content slots remain empty and some macro terrain repetition remains visible.

## What v2 fixed

### V1 — terrain tiling / macro variation

Status: **improved, not fully closed**.

The terrain now uses a larger warped UV scale and the repeating pattern is less mechanical. The most obvious original tiling has been reduced, but broad ground repetition remains visible in the sparse areas. Do not hide the remaining issue with more procedural grass; reassess after buildings/trees provide proper composition and occlusion.

### V2 — stream banks and water

Status: **materially improved**.

The stream now has terrain-following sediment shoulders and a four-column water mesh with shallow-edge → channel opacity/color variation. Water saturation and ripple strength were reduced and the bank transition is softer. Regression tests verify that sediment overlaps the water edge without gaps and that the river carries a real opacity gradient.

### V3 — meadow needle noise

Status: **materially improved**.

Procedural meadow presentation was converted from widespread thin blades into clustered/lower/lighter tufts with deliberate negative space. Evidence counts changed from the original `4,678` clumps to **`1,161` clumps** while draw calls stayed essentially flat (`124 → 126`). This is the desired direction. Do not re-densify the meadow to compensate for missing trees or structures.

### V4 — path presentation

Status: **materially improved**.

The path now has terrain-following curvature, restrained variable half-width, softer shoulders and lower contrast. It no longer reads as the same dark constant-width stripe seen in the original evidence.

### V5 — lighting / palette

Status: **improved**.

Lighting and grading were moved away from the strongly yellow-green late-afternoon look toward a more neutral Central-European daylight palette with lower saturation. Final lighting acceptance should occur only after the settlement and tree line exist, because missing content currently dominates composition more than grading does.

### V6 — settlement composition

Status: **blocking**.

Only the rectangular dwelling is currently admitted to the benchmark. Storehouse, workshop, inhabitants and trees remain absent. This is intentionally reported as zero rather than hidden with primitives, but it means the target historical hamlet composition cannot yet be judged.

Issue #17 now owns the missing storehouse/workshop/worker production assets. Central-European tree assets remain a separate missing slot.

### V7 — dwelling candidate

Status: **blocking for production acceptance, not for environment iteration**.

The dwelling remains readable but is still an evaluation candidate. It has 99,298 triangles and no LOD, above its 25k–60k brief target. It needs optimization/LOD or replacement plus historical review before production acceptance.

## Current asset intake findings

Two manual `to3D` GLBs were inspected for Issue #17:

- open workshop candidate `079a3668…`: correct silhouette, but **89,778 tris** and therefore rejected as-is against the 20k–45k budget;
- adult worker candidate `40f00021…`: efficient **14,106 tris**, but textured preview exposed severe patchwork/mis-projected source-image regions on face/clothing/rear surfaces; rejected for production despite acceptable polygon count.

Detailed intake receipt: `assets/source/phase1/TO3D_INTAKE_2026-09-17.md`.

## Current technical evidence

Validation run `35267593823` completed successfully after correcting two test-only mistakes in the child validation PR.

- strict TypeScript: PASS
- Node tests: **14/14 PASS**
- production Vite build: PASS
- Phase 0 WebGL2/fallback/failure UI: PASS
- Phase 0 interactions: PASS
- Phase 0 lifecycle remount: PASS, 3/3 cycles
- Phase 0 software WebGPU: PASS
- Phase 1 WebGL2 benchmark smoke: PASS
- structures: `1`
- inhabitants: `0`
- trees: `0`
- grass clumps: `1,161`
- draw calls: `126`
- evidence artifact: `10517456076`
- artifact ZIP SHA-256: `5f55bcdb62bd2fc3e7cf131eb324778f7e8a488c26a9a862aff9f8ebedb91300`

Software SwiftShader reported ~15 FPS / ~66.65 ms for the Phase 1 capture. This is CI instrumentation only and must not be described as actual-hardware performance evidence.

## Acceptance evidence still required

1. Generate and structurally admit clean storehouse, optimized workshop and clean adult-worker GLBs.
2. Integrate one storehouse, one workshop and approximately five inhabitants without primitive substitutes.
3. Add historically plausible Central-European production tree assets and establish the first actual forest-edge composition.
4. Re-run the full combined Phase 0 + Phase 1 CI suite and capture updated settlement/workshop/stream evidence.
5. Reassess macro ground repetition only after real content/vegetation is present; do not solve sparse composition by increasing grass noise.
6. Perform a separate real-GPU review before any performance claim.
7. Perform historical review before accepting dwelling/new built assets/character as historically approved.

## Architecture constraints remain unchanged

- Keep PlayCanvas 2.22.1 as the sole game/render engine.
- Preserve `createGameRuntime()` lifecycle and host-owned DOM/resize/visibility wiring.
- Preserve the fixed-step core and every Phase 0 regression route.
- Keep runtime assets behind `resolveAsset()`.
- Do not introduce React/Floot into gameplay/rendering.
- Do not add primitive substitutes for missing production models.
- Use only approved free/noncommercial asset routes unless project constraints are explicitly changed.

PR #14 remains a draft because technical rendering is healthy but the Phase 1 professional visual/content gate is not yet complete.
