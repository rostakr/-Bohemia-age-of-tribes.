# BOHEMIA: AGE OF TRIBES — Phase 2 implementation prompt

You are the implementation developer for the existing PlayCanvas historical RTS.
Work autonomously on Phase 2 only. QA belongs to a separate QA/closure flow; coordinate through GitHub rather than assumed chat access.

TASK ID: P2-RTS-INTERACTION-FOUNDATION  
MILESTONE: PHASE 2 — RTS interaction foundation  
REPOSITORY: rostakr/-Bohemia-age-of-tribes. (the trailing period is part of the name)

## Entry gate — OPEN

Phase 1 has explicit independent QA acceptance.

- `PHASE_2_ENTRY_GATE: OPEN`
- `PHASE_1_ACCEPTED_SHA: 853d802e0512f4c89f068eb54f64337cf2a23195`
- `PHASE_1_INTEGRATION_SHA: 9d4c9fb642a2952efb279c0461378e5527891099`
- `PHASE_2_BASE_BRANCH: phase2/phase1-accepted-base`
- `PHASE_2_BASE_SHA: 9d4c9fb642a2952efb279c0461378e5527891099`
- `PHASE_2_INTEGRATION_BRANCH: qa/phase2-integration`
- `NEXT_TASK: P2-RTS-INTERACTION-FOUNDATION`

Read current `AGENTS.md`, `docs/PROJECT_STATE.md`, `docs/ASSET_MANIFEST.md`, `docs/qa/PHASE1_WORK_QUEUE.md` and `docs/qa/PHASE1_COMPLETION_HANDOFF.md` before implementation. The exact accepted content is the PR #71 candidate; its integration merge has the identical Git tree. Do not reopen Phase 1 art polish as a prerequisite for interaction work. Accepted later-phase limitations include static/unrigged workers, incomplete production PBR map sets, vegetation polish and desktop-hardware LOD tuning.

Create a fresh Phase 2 DEV branch from the exact base SHA above and target `qa/phase2-integration`. Do not implement directly on the immutable Phase 1 base branch.

## Goal

Turn the accepted Phase 1 environment into a controllable RTS interaction scene: polished camera, unit selection, contextual move command, basic terrain navigation, readable destinations and reliable movement of small groups. Preserve the accepted art, environment composition, lighting, materials and inspection views.

## Relevant existing areas

- `src/main.ts` — bootstrap and scene choice; avoid putting simulation here.
- `src/render/benchmark-scene.ts` — existing terrain/asset composition.
- `src/render/inspection-camera.ts` — reuse camera behavior where sound.
- `src/render/scene-assets.ts` — central asset loading and instance lifecycle.
- `src/core/contracts.ts` and existing fixed-step loop — simulation boundary.
- `src/render/landscape.ts` — terrain sampling/geometry; inspect actual terrain contracts.
- Existing lifecycle/input/render smoke scripts and `package.json`.

Inspect these first; locate only directly needed input/terrain APIs. Do not scan or rewrite the whole repository. Add focused modules consistent with the existing layout.

## Acceptance criteria

1. **Camera:** keyboard pan, configurable edge scroll enabled only over an active gameplay viewport, middle-button drag pan, wheel zoom, rotation, smooth motion and terrain-aware height/bounds. UI interaction must not move the camera. Blur/visibility loss cancels held keys and drags; destroy removes all listeners.
2. **Units:** stable simulation IDs separate from PlayCanvas entities. Initial five selectable workers reuse accepted shared assets. Simulation owns positions/orders; rendering interpolates between fixed-step states. Do not invent walk animations if the accepted model has no rig; identify that accepted art limitation explicitly.
3. **Selection:** click, drag rectangle, Shift add/remove and empty-ground deselection. Distinguish click from drag with a small pixel threshold. Project selection using actual camera/canvas dimensions; exclude hidden or off-screen units. HUD events never issue selection or gameplay commands.
4. **Commands:** contextual right-click on reachable ground creates a MOVE order for selected friendly units. Command data contains simulation IDs and world positions, not entities/DOM references. Replace current move orders predictably. Unsupported attack/gather/build targets must not pretend to execute those commands.
5. **Navigation:** a modest terrain-derived passability grid and bounded A* are sufficient. Mark building footprints and impassable water; crossings are explicit terrain data. Units follow terrain height and never travel through structures or across blocked water. Avoid diagonal corner cutting. Resolve invalid destinations to a nearby reachable cell within a bounded search, or return clear failure feedback.
6. **Group move:** assign distinct reachable destination slots with deterministic ordering. Use basic separation/spatial lookup and a bounded repath queue. No full global pathfinding per unit per frame. Units arrive and settle without permanent jitter or pathological stacking. Do not implement advanced formations or Phase 3 architecture.
7. **Feedback:** readable selection rings, drag rectangle, move marker, invalid-target indication and selected-unit count. Markers expire and dispose cleanly. Maintain historical visual restraint; no unrelated UI redesign.
8. **Instrumentation:** active/selected units, pending paths, paths solved per tick and simulation time. Test normal five-unit scene plus a debug-only 40-unit case. Report measured performance and device; do not claim 60 FPS from software CI.
9. **Foundation remains healthy:** typecheck/build, fixed-step behavior, pause/resume, three remount cycles, resize, WebGL2 and available WebGPU, asset loading/no critical 404s.

## Implementation boundaries

PlayCanvas 2.x remains the sole engine. Preserve central asset resolution, fixed-step simulation, lifecycle, WebGL2 fallback and accepted content. No new framework, custom 3D engine, unreviewed dependency or wholesale asset regeneration. Keep camera input and gameplay input ownership explicit to prevent right-click conflicts.

No economy, combat, construction, production, AI, fog, control groups, double-click type selection, advanced formations, multiplayer, mobile controls or new culture.

No `main` merge or deployment in this DEV task. Use a fresh feature branch from `phase2/phase1-accepted-base` at `9d4c9fb642a2952efb279c0461378e5527891099` and target `qa/phase2-integration`.

## Validation and QA handoff

DEV performs focused checks of command processing, reachable/unreachable routes, building/water blockers, destination assignment and lifecycle/input teardown. Reuse existing tests. External QA owns the broader browser, screenshot and regression pass.

Provide deterministic reproduction steps for click/Shift/box selection, UI exclusion, camera gestures, a five-worker move, a blocked river/building destination, repeated group orders, arrival stability, blur/resume, remount and the 40-unit debug scenario.

Handoff: `IMPLEMENTED`; `FILES CHANGED`; `ASSETS ADDED/CHANGED`; `MINIMUM VALIDATION PERFORMED`; `QA HANDOFF`; `KNOWN RISKS`. Include PR URL, exact head/base SHA, actual results and measurements. Stop after Phase 2 implementation and handoff. Do not start Phase 3 until a later task explicitly authorizes it after QA.