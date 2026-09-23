# BOHEMIA: AGE OF TRIBES — Phase 3 scope proposal

## Status

**PROPOSAL ONLY — no Phase 3 gameplay implementation is authorized by this document alone.**

This proposal is derived from the accepted Phase 2 RTS interaction/navigation baseline and the existing engine-free contracts. It deliberately chooses a small finished vertical slice rather than opening economy, construction, combat, AI and fog simultaneously.

## Proposed milestone

**PHASE 3 — WOOD GATHERING VERTICAL SLICE**

The player can select Boii workers, order them to gather wood from existing tree resources, watch them travel using the accepted Phase 2 navigation, gather deterministically, return carried wood to the existing storehouse, deposit it into a player wood stockpile, and repeat until the source is exhausted or the order is stopped/replaced.

## Why this is the proposed next slice

The current contracts already define:

- `ResourceId = 'food' | 'wood' | 'stone' | 'iron' | 'trade-wealth'`;
- `gather` and `stop` orders;
- stable player/unit/entity IDs;
- fixed-step simulation boundaries.

Phase 2 already provides selection, contextual commands, bounded navigation, deterministic MOVE replacement and group path processing. A wood-gathering loop therefore extends the accepted foundation without requiring combat, construction, production queues or AI.

Wood is proposed first because the benchmark already contains tree composition and an existing storehouse, so the slice can use project-owned scene content rather than introducing placeholder production art for missing food/stone/iron sources.

## In scope

### Engine-free simulation

- Stable resource-node IDs independent of PlayCanvas entities.
- Resource-node state containing at minimum resource type, finite remaining amount and world position.
- Player resource ledger with `wood` balance exposed through simulation state/metrics.
- Worker gather state machine driven only by fixed-step updates.
- `gather` command ownership/target validation.
- `stop` command support for active movement/gathering orders.
- Deterministic order replacement when MOVE/GATHER/STOP supersedes current work.
- Bounded path requests for resource approach and storehouse return.
- Deterministic interaction radius; workers do not need to stand on the exact tree center.

### Wood loop

- Worker travels to a wood source.
- Worker gathers at a fixed deterministic rate.
- Worker has a bounded wood carry capacity.
- On full capacity, depleted source, or configured return condition, worker travels to the designated Boii storehouse drop-off.
- Deposit increments the local player's wood stockpile.
- If the source still contains wood and the gather order remains active, the worker returns to the source and repeats.
- If the source is depleted, the worker becomes idle after depositing carried wood.

### Presentation / interaction

- Existing workers remain selectable through the accepted Phase 2 controller.
- Existing project tree entities used by this slice receive stable resource IDs through a render-to-simulation mapping; PlayCanvas entities are not authoritative gameplay state.
- Existing storehouse receives a stable drop-off mapping.
- Contextual right-click on a mapped wood source issues GATHER instead of MOVE.
- Right-click on normal terrain remains MOVE.
- Minimal readable feedback: gather marker/state and a wood stockpile display suitable for QA.
- No new production art asset is required for this milestone.

## Proposed initial constants

These values are engineering defaults for the slice and may be tuned after browser QA:

- carry capacity: 10 wood per worker;
- gather rate: 2 wood/second;
- tree starting amount for the test slice: 100 wood;
- resource interaction radius: approximately 1.5 m;
- storehouse drop-off radius: approximately 2.0 m.

All rates and capacities must be centralized simulation configuration, not scattered magic numbers in render/UI code.

## Explicitly out of scope

- food, stone, iron and trade-wealth gathering gameplay;
- farms, hunting, fishing or trade;
- building placement and construction;
- repair execution;
- unit/building production queues;
- population cap;
- combat, damage, armor or death;
- factions beyond the current local Boii slice;
- enemy AI;
- fog of war;
- multiplayer/network simulation;
- worker animation/rigging work;
- new production environment or character art;
- advanced formations/control groups;
- mobile controls;
- engine migration.

## Architecture constraints

- PlayCanvas 2.22.1 remains the sole game/render engine.
- `src/core/*` owns authoritative gather/resource state and must not import PlayCanvas or DOM APIs.
- `src/render/*` maps existing scene entities to stable simulation IDs and presents simulation state.
- Fixed-step simulation remains authoritative; render frames may interpolate/present only.
- Command ingress validates player ownership, unit IDs and resource target IDs before execution.
- Path solving remains bounded per tick.
- No second game loop.
- Existing lifecycle, remount, WebGPU preference and WebGL2 fallback must remain intact.

## Minimum automated acceptance

Node tests must cover at least:

1. GATHER rejects a missing/non-wood target and foreign worker ownership.
2. A worker reaches a tree, gathers deterministically and never exceeds carry capacity.
3. A full worker returns to the storehouse and deposits exactly the carried amount.
4. The stockpile total is deterministic across different render frequencies because only fixed-step simulation mutates it.
5. The worker repeats source → drop-off → source while wood remains.
6. Source depletion is finite and cannot produce negative remaining wood.
7. STOP cancels pending path/gather work without deleting already carried wood.
8. MOVE replaces GATHER predictably.
9. GATHER replaces MOVE predictably.
10. Multiple workers gathering one source never duplicate resource extraction beyond the source amount.
11. Path requests remain bounded under a multi-worker gather case.
12. Destroy clears resource/order state without lifecycle leaks.

Browser smoke must demonstrate at minimum:

- Phase 3 debug URL starts with five workers, at least one mapped wood source and a mapped storehouse;
- worker selection still works;
- right-click tree produces gather feedback rather than MOVE feedback;
- a worker visibly travels tree → storehouse;
- wood stockpile increases;
- tree remaining amount decreases;
- MOVE still works on ground after gathering;
- remount succeeds;
- existing Phase 0, Phase 1 and Phase 2 regression workflows remain green.

## Evidence required for handoff

- exact feature HEAD SHA;
- typecheck/test/build results;
- focused Phase 3 Node test count;
- browser smoke result;
- screenshot before deposit and after stockpile increase;
- observed stockpile/resource values from debug state;
- all relevant workflow run IDs;
- artifact ID and digest;
- known limitations.

## Definition of done

The milestone is complete only when a selected worker can perform the complete deterministic wood loop from contextual command through resource extraction, carrying, storehouse deposit and repeat/depletion, while all earlier lifecycle/render/navigation regressions remain green.

Completion of this slice does **not** authorize construction, production, combat, AI or fog of war. Those remain later separately scoped systems.
