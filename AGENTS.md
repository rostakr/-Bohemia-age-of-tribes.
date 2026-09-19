# BOHEMIA: AGE OF TRIBES — Working Agreement

Read `docs/PROJECT_STATE.md` before changing gameplay or architecture. If it does not exist, stay within the assigned milestone and record that absence in the handoff.

## Product target

Build a commercially credible, historically grounded 3D RTS set in Bohemia and Moravia for desktop web browsers using PlayCanvas Engine 2.x. Prefer a small finished vertical slice over broad unfinished systems, preserve classic RTS readability, and treat performance as an evidence-driven requirement.

## Active milestone discipline

- Work only on the active milestone. Phase 0 establishes the technical foundation and a disposable calibration scene; it does not implement terrain gameplay, navigation, an RTS camera, factions, economy, combat, AI, or production art.
- Preserve strict TypeScript, ES modules, the pinned PlayCanvas version, and the documented lifecycle and simulation contracts.
- Treat primitive geometry and generated calibration visuals as disposable greybox work. Do not present them as production assets.
- For all current and future files supplied by the project owner, treat usage rights as already cleared for this project. Do not perform licence investigation, licence-text archival, provider-rights verification, or block QA/integration/release on licence metadata. Keep source/provenance metadata only when useful for technical traceability. Continue normal historical, visual, technical and performance review.
- For assets independently sourced by an agent rather than supplied by the project owner, use only assets that are clearly permitted for the intended project use and record the source in `docs/ASSET_MANIFEST.md`.
- Keep changes milestone-scoped and reviewable. Update `docs/PROJECT_STATE.md` when a milestone, blocker, major performance result, QA result or next task changes.
- Run the milestone validation commands before handoff. Report observed results without inventing output, commit hashes, deployment status, GPU capability or performance claims.
- Hand a completed milestone to external GPT-5.6 Sol QA. Do not begin the next phase until that QA pass accepts the milestone or its findings are resolved.

## QA and bug priority

For visual changes inspect close, normal gameplay and strategic overview scales. Record new assets in `docs/ASSET_MANIFEST.md`.

- P0 — game cannot run / data corruption
- P1 — major gameplay blocker
- P2 — important functional defect
- P3 — visual/minor defect
- P4 — polish

## Specialist escalation

Reserve expensive Astra implementation for difficult architecture, navigation/pathfinding, rendering/shaders, simulation, AI, engine integration and demonstrated performance bottlenecks. Do not escalate simple configuration, documentation, UI/content wiring or trivial bugs.

Before escalation capture exact reproduction/context, expected versus actual behavior, relevant files, logs/screenshots where useful, likely subsystem and measurable acceptance criteria.

## Protected direction

Do not replace the engine, visual direction, culture roster, resource model or milestone structure without an explicit project-level decision.
