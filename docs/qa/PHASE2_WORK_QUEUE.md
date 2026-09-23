# Phase 2 QA / DEV work queue

Updated: 2026-09-23

## Current state

- `PHASE_2_ENTRY_GATE: OPEN`
- `QA_ACTIVE: P2-RTS-INTERACTION-FOUNDATION`
- integration branch: `qa/phase2-integration`
- reviewed integration implementation SHA: `8916dcb35c68f3b976fda730bf73cd3e9a48d3ea`
- integration commit records prior QA admission after exact-head CI/browser/regression/artifact review.
- accepted Phase 1 content remains immutable for this task.
- `artGatePassed=true` refers to the accepted Phase 1 art gate; it does not imply Phase 2 gameplay acceptance.

## P2-RTS-INTERACTION-FOUNDATION

Implementation is present on the Phase 2 integration lineage and now requires independent QA closure against `docs/PHASE_2_TASK.md`.

Required QA gates:

1. camera: keyboard pan, viewport-only edge scroll, middle-drag pan, wheel zoom, rotation, terrain/bounds handling, input teardown on blur/visibility/destroy;
2. selection: click, box, Shift add/remove, empty-ground deselect, HUD exclusion;
3. MOVE: selected friendly units only, deterministic replacement of older MOVE, readable valid/invalid feedback;
4. navigation: terrain-derived bounded A*, explicit river crossing, building/water blocking, no diagonal corner cutting, bounded nearest reachable resolution;
5. group movement: deterministic distinct slots, bounded path queue, separation and stable settling;
6. simulation/render boundary: stable simulation IDs, fixed-step ownership, interpolated render state, terrain-height following;
7. instrumentation: active/selected units, pending paths, paths solved/tick, simulation time; normal five-worker and debug-only 40-worker cases;
8. regression: typecheck/build, fixed-step tests, pause/resume, three remounts, resize, WebGL2, available WebGPU and asset loading.

No economy, combat, construction, production, AI, fog, control groups, advanced formations, multiplayer, mobile controls or new culture may be admitted by this task.

## Current evidence

- Phase 2 implementation is 32 commits ahead of the accepted Phase 1 integration baseline `9d4c9fb642a2952efb279c0461378e5527891099` and touches only the scoped RTS foundation/runtime/test files.
- Current integration commit message explicitly records: `QA-admitted Phase 2 RTS interaction foundation after exact-head CI validation, browser smoke, regression checks, and artifact review. Main remains untouched.`
- The queue-contract PR head `cac45640af9984bc66c99ceae261172123a8ac60` has foundation run `35846045684`: **SUCCESS**.
- Independent queue closure still requires pinning the original Phase 2 exact-head workflow/artifact identifiers before this item is changed to `ACCEPTED_IN_INTEGRATION`.

## Exit

On independent QA PASS, record exact reviewed head SHA, CI run IDs and browser evidence, merge the QA closure into `qa/phase2-integration`, set this item to `ACCEPTED_IN_INTEGRATION`, and release the next task separately. Do not infer Phase 3 authorization.
