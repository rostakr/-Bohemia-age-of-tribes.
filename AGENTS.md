# BOHEMIA: AGE OF TRIBES — Working Agreement

Read `docs/PROJECT_STATE.md` before changing gameplay or architecture. If it does not exist, stay within the assigned milestone and record that absence in the handoff.

## Product target

Build a commercially credible, historically grounded 3D RTS set in Bohemia and Moravia for desktop web browsers using PlayCanvas Engine 2.x. Prefer a small finished vertical slice over broad unfinished systems, preserve classic RTS readability, and treat performance as an evidence-driven requirement.

## Outcome-driven delivery and validation — 2026-09-23

Read [shared project instructions V2](docs/prompts/BOHEMIA_PROJECT_INSTRUCTIONS_V2.txt) and the appropriate [development](docs/prompts/BOHEMIA_DEV_PROMPT_V2.txt) or [QA](docs/prompts/BOHEMIA_QA_PROMPT_V2.txt) prompt. These supersede older operational guidance on acceptance and routine validation; the original game vision and required release gates remain in force.

- Judge progress by a visible, understandable player experience; build/CI success alone does not establish product or art acceptance.
- Complete the existing Phase 4 scope, then prioritize an accessible, coherent settlement demonstration with visible worker activity before expanding gameplay systems. Do not silently enlarge the current Phase 4 PR.
- Historical Phase 1–3 technical acceptance remains recorded. The gap between current visuals and the original professional art target is explicitly open.
- Validate coherent checkpoints according to change impact. Documentation changes need content review; local visual changes need targeted scene review; gameplay changes need focused behavior/regression checks; shared-engine changes need broader relevant regression. Run all required milestone/release checks before acceptance.
- Reuse earlier evidence only for demonstrably unaffected areas. Do not duplicate full suites after each cosmetic commit or remove checks to hide failures. These instructions do not themselves modify GitHub Actions or branch protection.
- Every handoff states player benefit, exact SHA, actual validation, remaining product gaps, and a verified preview URL or a concrete deployment blocker.

## Active milestone discipline

- Work only on the active milestone. Phase 0 establishes the technical foundation and a disposable calibration scene; it does not implement terrain gameplay, navigation, an RTS camera, factions, economy, combat, AI, or production art.
- Preserve strict TypeScript, ES modules, the pinned PlayCanvas version, and the documented lifecycle and simulation contracts.
- Treat primitive geometry and generated calibration visuals as disposable greybox work. Do not present them as production assets.
- Do not import or mass-produce commercial assets until their license, source, historical fit, visual fit, technical fit and pipeline have been reviewed and recorded in `docs/ASSET_MANIFEST.md`.
- Keep changes milestone-scoped and reviewable. Update `docs/PROJECT_STATE.md` when a milestone, blocker, major performance result, QA result or next task changes.
- Run the milestone validation commands before handoff. Report observed results without inventing output, commit hashes, deployment status, GPU capability or performance claims.
- Hand a completed milestone to external GPT-5.6 Sol QA. Do not begin the next phase until that QA pass accepts the milestone or its findings are resolved.

## QA and bug priority

For visual changes inspect close, normal gameplay and strategic overview scales. Record new assets in `docs/ASSET_MANIFEST.md`.

- P0 — game cannot run / data corruption
- P1 — major gameplay blocker
- P2 — important functional defect
- P3 — minor defect; visual issues that defeat the agreed art/readability goal are product blockers, not automatically minor
- P4 — polish

## Specialist escalation

Reserve expensive Astra implementation for difficult architecture, navigation/pathfinding, rendering/shaders, simulation, AI, engine integration and demonstrated performance bottlenecks. Do not escalate simple configuration, documentation, UI/content wiring or trivial bugs.

Before escalation capture exact reproduction/context, expected versus actual behavior, relevant files, logs/screenshots where useful, likely subsystem and measurable acceptance criteria.

## Protected direction

Do not replace the engine, visual direction, culture roster, resource model or milestone structure without an explicit project-level decision.
