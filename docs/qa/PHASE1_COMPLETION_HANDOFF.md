# Phase 1 final closure — QA ACCEPTED

Date: 2026-09-22

## Decision

**STATUS: PHASE 1 COMPLETE / ACCEPTED**  
**ART GATE: PASS**  
**PHASE 2 ENTRY GATE: OPEN**

The complete Phase 1 benchmark from PR #71 has completed independent QA. The exact reviewed candidate is `853d802e0512f4c89f068eb54f64337cf2a23195`. It was merged into `qa/phase1-integration` as `9d4c9fb642a2952efb279c0461378e5527891099`; both commits point to the identical tree `1fde280d7a8b61f3a1c87299b400fedc532c3b60`.

The accepted benchmark is selected by `?candidate=phase1` and contains the intended dwelling, compact storehouse, repaired workshop, five compact R2 workers, terrain, stream, paths, meadow and current vegetation composition.

## Reproduction

From the accepted content state:

```sh
npm ci
node scripts/build-worker-r2.mjs
node scripts/compact-worker-r2.mjs
node --experimental-strip-types scripts/export-workshop-project.mjs
npm run validate
npm run build
npm run preview
```

Review the full accepted scene at:

```text
?candidate=phase1&debug=1&renderer=webgl2
```

Removing `renderer=webgl2` exercises the preferred renderer selection on a capable environment. WebGL2 remains the fallback path.

## Exact validation evidence

Candidate head `853d802e0512f4c89f068eb54f64337cf2a23195`:

- foundation workflow `35769849049`: **SUCCESS**;
- completion workflow `35769849029`: **SUCCESS**;
- worker R2 workflow `35769849012`: **SUCCESS**;
- foundation steps include repository validate, WebGL2 startup, interaction smoke, lifecycle/remount, software WebGPU, Phase 1 benchmark, storehouse admission and close-up;
- completion workflow rebuilt compact worker + repaired workshop, ran strict workshop GLB admission and repository validation, then loaded and rendered the combined candidate in PlayCanvas WebGL2;
- evidence artifact `phase1-completion-evidence`: ID `10713746346`, digest `sha256:16152d8d000eb58eb7aae6627d6b87fa68e05258b9e98ae3becda4f9bcbd7224`;
- foundation Phase 1 browser artifact: ID `10713692561`, digest `sha256:c1ed3ccf3e8a5c3746920091217f1c21d0f86f57dc6baee471a3cdec3a36e408`.

No failing test was removed and no validation threshold was weakened for acceptance.

## Workshop final QA

**PASS for Phase 1.**

The repaired candidate closes the recorded #63 blocker classes:

- roof/thatch is warm and darker rather than extremely pale/flat;
- eave strands are short/controlled and do not create an escaping noisy fringe;
- bench/trestle work surfaces are distinguishable;
- iron tools remain visible without exaggerated metallic treatment;
- grounding is a shallow irregular earth patch rather than a raised rectangular slab;
- no obvious floating structure, severe z-fighting or catastrophic seam is visible at normal game camera distance;
- 22,540 triangles / 25,649 vertices remain within the documented 20k–45k target;
- five primitives/materials have NORMAL + UV0;
- two embedded 512² JPEG base colours; no external dependency or texture decoder.

Full production PBR maps remain later polish and do not block Phase 2.

## Worker final QA

**PASS / equivalent to accepted R2.**

The compact worker preserves the accepted #65 render while changing payload/storage only:

- triangles remain 28,212;
- vertices reduce 56,424 → 20,725 through bit-identical tuple deduplication;
- bytes reduce 3,615,224 → 2,106,832;
- compact SHA-256 `f50f87146909e4a3c7fa18e4a82c636fe05e24f0879f35e6a181c281c4efa21e`;
- raw POSITION/NORMAL/UV triangle-corner equivalence and embedded image/material metadata are checked by the compactor;
- accepted and compact neutral close-up evidence is pixel-identical;
- five-worker RTS scene remains readable and grounded.

The worker remains static/unrigged. This is an explicitly accepted later animation limitation, not a Phase 2 entry blocker.

## Whole-scene visual QA

**PASS for the Phase 1 milestone.**

Settlement, river and craft evidence show a coherent benchmark at close inspection and normal RTS-useful scales. Structures and inhabitants are readable; terrain, stream and paths provide usable composition; scale/grounding is consistent enough for interaction work; no gross texture failure, catastrophic seam or floating geometry requires another foundational art-gate cycle.

The acceptance threshold is a credible Phase 1 RTS benchmark, not final shipping art.

## Runtime and asset QA

**PASS.**

- PlayCanvas is still the sole 3D/game engine;
- fixed timestep remains intact;
- WebGL2 startup passed;
- available WebGPU path passed as software CI regression evidence;
- interaction smoke passed;
- lifecycle/remount passed;
- required benchmark assets load through the central runtime resolver;
- the complete candidate reaches healthy diagnostics with three structures, five GLB workers and expected environment population;
- no critical runtime error or unhandled candidate initialization failure was observed in the exact-head workflows.

## Performance evidence

`ACTUAL_DESKTOP_GPU_BENCHMARK: NOT_AVAILABLE_IN_THIS_ENVIRONMENT`

Software-renderer CI is not presented as desktop hardware performance. No 60 FPS, median/p95 frame time, VRAM or GPU-device claim is fabricated. Real 1920×1080 hardware characterization and tree-LOD threshold selection are deferred to a later performance gate.

QA accepts this deferral with `BLOCKS_PHASE_2=NO`, because Phase 2 interaction implementation can proceed without committing production LOD distances or performance claims.

## Accepted limitations

| Limitation | BLOCKS_PHASE_2 |
| --- | --- |
| Storehouse lacks full production normal/roughness texture set | NO |
| Workshop lacks full production normal/roughness texture set | NO |
| Worker is static/unrigged | NO |
| Tree LOD thresholds lack real desktop-GPU tuning | NO |
| Vegetation needs later density/repetition polish | NO |
| Actual desktop-GPU benchmark unavailable in this environment | NO |

No Phase 1 blocker remains ambiguous.

## Canonical admission

The final accepted Phase 1 content identity is the exact PR #71 candidate SHA `853d802e0512f4c89f068eb54f64337cf2a23195`, represented in QA integration by merge SHA `9d4c9fb642a2952efb279c0461378e5527891099` with an identical Git tree. The accepted canonical benchmark selector is `?candidate=phase1`.

Historical blocked/superseded PRs remain retained as evidence and are not reactivated.

## Phase 2 entry

- `PHASE_2_ENTRY_GATE: OPEN`
- `PHASE_1_ACCEPTED_SHA: 853d802e0512f4c89f068eb54f64337cf2a23195`
- `PHASE_2_BASE_BRANCH: phase2/phase1-accepted-base`
- `PHASE_2_BASE_SHA: 9d4c9fb642a2952efb279c0461378e5527891099`
- `PHASE_2_INTEGRATION_BRANCH: qa/phase2-integration`
- `NEXT_TASK: P2-RTS-INTERACTION-FOUNDATION`

Stop here. Phase 2 gameplay systems are deliberately not implemented by this closure.