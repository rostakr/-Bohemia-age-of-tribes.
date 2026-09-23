# BOHEMIA: AGE OF TRIBES — Phase 3 implementation task

TASK ID: `P3-SCALABLE-MOVEMENT`

MILESTONE: **PHASE 3 — Scalable Movement**

BASE: QA-admitted Phase 2 integration commit `8916dcb35c68f3b976fda730bf73cd3e9a48d3ea`.

## Entry gate

Phase 2 RTS Interaction Foundation must be independently QA-admitted. PR #76 was accepted into `qa/phase2-integration`; Phase 3 starts only from that integration commit. PlayCanvas 2.22.1, the fixed-step simulation boundary, central asset resolver, lifecycle and WebGL2 fallback remain mandatory.

## Goal

Scale the accepted Phase 2 movement architecture from a small RTS interaction demo toward larger unit groups without adding new gameplay systems. Improve path-query efficiency, local avoidance, destination assignment, crowd stability, obstacle handling, bounded repathing and movement instrumentation while preserving deterministic command ordering and fixed-step simulation.

## Acceptance criteria

1. **Navigation query scalability.** Repeated A* queries must reuse search workspace rather than allocate full-grid score/parent/closed buffers for every unit. Search remains bounded and deterministic.
2. **Reachability.** Static connected-component information must allow impossible cross-component routes to fail quickly and destination resolution must prefer the start unit's reachable component when supplied.
3. **Path simplification.** Returned paths should be safely simplified only across passable cells without cutting blocked corners, water or buildings.
4. **Group destination quality.** Larger group MOVE commands must receive unique reachable slots with deterministic ordering and reduced avoidable path crossing. This is not an advanced formation system.
5. **Local avoidance.** Moving units should anticipate nearby units, use deterministic side preference in head-on cases, avoid permanent overlap/jitter and remain on passable terrain.
6. **Stall recovery.** Units that make no meaningful progress for a bounded interval may request a bounded repath to their existing destination. Repaths share the same per-tick path budget and cannot create unbounded queue growth.
7. **Path budget.** Path solving remains explicitly throttled. Metrics expose queue depth, visited nodes, repaths and movement/crowd work.
8. **Stress validation.** Keep the normal 5-unit route and Phase 2 40-unit debug route. Add a larger debug/stress route and an engine-independent 100+ unit movement test. No hard production FPS claim from software CI.
9. **Regression.** Phase 0/1/2 lifecycle, selection, MOVE, explicit ford, blockers, remount, WebGL2 and available WebGPU behavior must remain healthy.

## Explicit exclusions

No economy, resource gathering, carrying, storage, construction, building placement, production, combat, damage, AI, fog of war, control groups, multiplayer, mobile controls, new culture, advanced formation editor or engine/framework migration.

Those belong to later phases; Phase 4 begins economy only after Phase 3 QA acceptance.

## QA handoff

DEV must provide exact base/head SHA, changed files, focused test results, current workflow run IDs, stress-unit counts, measured simulation/path metrics and known limits. External QA owns final admission into the Phase 3 integration branch. Do not merge to `main` in the DEV task.