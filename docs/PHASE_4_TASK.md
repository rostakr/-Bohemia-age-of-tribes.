# BOHEMIA: AGE OF TRIBES — Phase 4 task

## Task ID

`P4-WOOD-GATHERING-VERTICAL-SLICE`

## Base

- QA integration base: `qa/phase3-integration`
- Accepted reconciled base SHA: `0289dfc7b71fbf5a6ceb3e9b352c9d9870f9c30b`
- Preserved movement milestone: Phase 3 scalable movement
- Preserved economy foundation: QA-admitted `ResourceEconomy` and `GatherLoop`

## Goal

Deliver one finished deterministic wood-gathering gameplay loop using the existing Boii workers, existing deciduous-tree content and existing Boii storehouse:

**select worker → right-click mapped wood source → travel → gather → carry → return to storehouse → deposit → repeat until depletion or order replacement.**

This milestone connects already accepted systems. It does not replace the scalable movement implementation or create a second resource ledger.

## Architecture boundary

### Authoritative simulation state

- `ResourceEconomy` owns finite resource-node quantities and player stockpiles.
- `GatherLoop` owns per-worker gather target, cargo, gather/return status, carry capacity and gather rate.
- `RtsSimulation` remains the authoritative scalable movement/pathfinding layer.
- `GatherCoordinator` is the engine-independent orchestration seam between movement and gathering/economy.

### Presentation

- PlayCanvas 2.22.1 remains the sole game/render engine.
- Existing scene trees are mapped to stable economy node IDs; PlayCanvas entities are not authoritative resource state.
- The existing `Boii storehouse` is mapped as the local-player drop-off position.
- `RtsController` presents selection, contextual command feedback, resource markers and stockpile HUD only.
- No second render loop or simulation clock is introduced.

## In scope

- wood resource nodes only;
- stable resource IDs for mapped existing deciduous trees;
- finite tree resource amounts;
- contextual RMB GATHER on mapped wood sources;
- RMB MOVE on terrain, including deterministic gather-order replacement;
- scalable pathfinding to source approach points and storehouse approach points;
- fixed-step harvesting while within interaction range;
- bounded per-worker wood carrying capacity;
- return-to-storehouse routing;
- deposit into the local player's `wood` stockpile;
- repeat source → drop-off cycle while the source remains available;
- source depletion without negative or duplicated resources;
- cargo preservation when a player replaces GATHER with MOVE;
- minimal QA-readable wood source markers, stockpile display and diagnostics;
- clean lifecycle/remount behavior.

## Production constants for this slice

- carry capacity: 10 wood per worker;
- gather rate: 2 wood/second;
- mapped tree starting amount: 100 wood;
- gather interaction radius: approximately 1.6 m;
- storehouse deposit radius: approximately 2.2 m.

These values belong to simulation setup, not render/UI logic.

## CI-only acceleration

The `?phase4=1&debug=1` browser QA route may use accelerated worker speed, smaller carry capacity and faster gather rate so SwiftShader can demonstrate a complete gather/deposit loop within CI wall-clock limits.

This acceleration is valid only when both Phase 4 and debug mode are enabled. Ordinary Phase 4 runtime retains the production constants above. Phase 2 and Phase 3 runtime behavior must remain unchanged.

## Explicitly out of scope

- food, stone, iron and trade-wealth gathering gameplay;
- farms, hunting, fishing and trade routes;
- construction and building placement;
- repair execution;
- production queues and population systems;
- combat, health, damage, armor and death;
- enemy/faction AI;
- fog of war;
- control groups and advanced formations;
- multiplayer/network simulation;
- mobile controls;
- worker rigging/harvesting animation;
- new production environment art;
- engine/framework migration.

## Required automated acceptance

### Node / simulation

Normal `npm test` must continue running all previously accepted checks and add Phase 4 coverage proving:

1. a worker completes resource → cargo → storehouse deposit using the accepted scalable movement implementation;
2. MOVE replaces an active gather route predictably without deleting carried cargo;
3. multiple workers cannot extract or deposit more than a finite source contains;
4. missing and non-wood targets are rejected;
5. previously accepted Phase 2 economy/gather tests remain green;
6. previously accepted Phase 3 scalable-movement tests remain green.

### Browser

`npm run smoke:phase4` must demonstrate in WebGL2/SwiftShader:

- `?phase4=1&renderer=webgl2&debug=1` starts successfully;
- five workers are active;
- at least one mapped wood source and the existing storehouse drop-off are available;
- worker selection still works;
- RMB on a mapped tree produces `Gather wood` feedback;
- wood remaining decreases;
- cargo exists during the loop or equivalent extraction evidence is observed;
- storehouse deposit increases the wood stockpile;
- subsequent RMB MOVE cancels the active gather order without deleting deposited stockpile;
- runtime remount returns to one canvas/one RTS overlay with a clean initial stockpile.

### Regression

The dedicated Phase 4 workflow must also run:

- full repository validation;
- Phase 2 RTS browser smoke;
- Phase 3 scalable-movement browser smoke;
- Phase 4 gathering browser smoke.

## Evidence required for QA admission

- exact feature HEAD SHA;
- full validation result and focused Phase 4 test result;
- Phase 2 and Phase 3 regression results;
- Phase 4 browser smoke result;
- screenshot immediately after contextual GATHER command;
- screenshot after a successful wood deposit;
- observed stockpile/resource values;
- workflow run IDs;
- evidence artifact ID and digest;
- known limitations.

## Definition of done

Phase 4 is complete only when the complete deterministic wood loop works from contextual command through movement, extraction, carrying, storehouse deposit and repeat/depletion on the reconciled Phase 3 base, while all earlier movement/lifecycle/render regressions remain green.

Completion does not authorize construction, production, combat, AI, fog of war or additional resource gameplay.
