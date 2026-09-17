# BOHEMIA: AGE OF TRIBES — Repository Instructions

## Product target
Build a commercially credible historical 3D RTS set in Bohemia and Moravia for desktop web browsers using PlayCanvas Engine 2.x.

## Core principles
- Prefer a small finished vertical slice over broad unfinished systems.
- Preserve classic RTS readability at normal gameplay zoom.
- Use grounded historical forms, materials and settlement logic.
- Treat performance as an evidence-driven requirement, not a late optimization pass.
- Production assets must have known provenance and commercial-use suitability.

## Workflow
1. Read `docs/PROJECT_STATE.md` before changing gameplay or architecture.
2. Keep changes milestone-scoped and reviewable.
3. Run `npm run build` before merging.
4. For visual changes, inspect close, gameplay and strategic zoom levels.
5. Record newly introduced assets in `docs/ASSET_MANIFEST.md`.
6. Update `docs/PROJECT_STATE.md` when a milestone, blocker, major performance result or next task changes.

## Bug priority
- P0 — game cannot run / data corruption
- P1 — major gameplay blocker
- P2 — important functional defect
- P3 — visual/minor defect
- P4 — polish

## Specialist escalation
Reserve expensive senior-model implementation for difficult architecture, navigation/pathfinding, rendering, shaders, simulation, AI, engine integration and demonstrated performance bottlenecks. Do not escalate simple configuration, documentation, UI, content wiring or trivial bugs.

Before specialist escalation capture:
- exact reproduction/context
- expected vs actual behavior
- relevant files
- logs/screenshots where useful
- likely subsystem
- measurable acceptance criteria

## Protected direction
Do not replace the engine, visual direction, culture roster, resource model or milestone structure without an explicit project-level decision.
