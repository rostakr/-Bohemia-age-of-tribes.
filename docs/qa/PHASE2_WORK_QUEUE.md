# Phase 2 QA / DEV work queue

Updated: 2026-09-23

## Current state

- `PHASE_2_ENTRY_GATE: OPEN`
- `ACCEPTED_IN_INTEGRATION: P2-RTS-INTERACTION-FOUNDATION`
- `QA_ACTIVE: P2-GATHERING-ECONOMY-FOUNDATION`
- integration branch: `qa/phase2-integration`
- `artGatePassed=true` remains the accepted Phase 1 art disposition.
- `main` is not a Phase 2 integration target.

## P2-RTS-INTERACTION-FOUNDATION — ACCEPTED_IN_INTEGRATION

PR #76 was independently QA-admitted before this queue file was created. This record reconciles that already-completed disposition rather than reopening it.

- exact reviewed DEV head: `8e6b0f5f00b18661811d1e5a4d984341de4a6f1e`;
- accepted merge: `8916dcb35c68f3b976fda730bf73cd3e9a48d3ea`;
- foundation run `35844829656`: **SUCCESS**;
- compact storehouse run `35844829668`: **SUCCESS**;
- worker R2 run `35844829657`: **SUCCESS**;
- Phase 1 completion run `35844829718`: **SUCCESS**;
- Phase 2 RTS run `35844829713`: **SUCCESS**;
- evidence artifact `10742942507`, digest `sha256:134dda8d9b3cce0013bfe95a2e6c019197d5f8f6138f2289ff04e4de894b4f81`.

Independent QA recorded browser evidence for five- and forty-unit scenes, right-click `pointerup(button=2)`, bounded A*, explicit ford routing, nearest-reachable resolution, distinct group slots, deterministic MOVE replacement, bounded 40-unit path solving and post-merge controller verification.

Non-blocking limitations remain: Worker R2 is static/unrigged; CI graphics are software/SwiftShader and are not desktop-GPU FPS evidence.

## P2-GATHERING-ECONOMY-FOUNDATION — QA_ACTIVE

PR #77 has already been merged into the integration lineage at `7efc5a7fea2518575dbc16ece5476c182c462eb2`; acceptance must still be recorded independently rather than inferred from merge state.

Reviewed candidate:
- base: accepted RTS merge `8916dcb35c68f3b976fda730bf73cd3e9a48d3ea`;
- exact DEV head: `0891563274d6b168cb026109e777c850271bbadf`;
- scope: `src/core/resource-economy.ts`, `scripts/check-phase2-economy.mjs`, and package test wiring only;
- Phase 2 RTS workflow `35845870309`: **SUCCESS**;
- foundation workflow `35845870208`: **SUCCESS**;
- compact storehouse workflow `35845870462`: **SUCCESS**.

Current deterministic tests cover node depletion without negative quantities, exact gather transfer, per-player stockpile isolation, snapshot safety, atomic affordability/spend, invalid cost rejection, duplicate resource-node IDs and deterministic node ordering.

### QA acceptance boundary

This slice may be accepted only as an engine-independent economy primitive. It does **not** yet implement worker gather routing, harvesting animation, drop-off buildings, resource UI, construction, production, combat, AI or fog of war.

Before closing this item, verify the merged integration lineage still passes the relevant foundation/RTS regression and record the exact post-merge evidence. Only then release one next Phase 2 task.

## Phase boundary

No Phase 3 authorization is implied by Phase 2 component acceptance. Advanced formations, combat, AI, fog of war, multiplayer and mobile controls remain outside the current gate.
