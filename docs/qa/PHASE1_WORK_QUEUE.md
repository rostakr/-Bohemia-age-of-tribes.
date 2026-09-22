# Phase 1 QA / DEV work queue

This file is the single authoritative work queue between Phase 1 DEV and QA.

Updated: 2026-09-22

## Branch flow

`feature DEV branch` → `qa/phase1-integration` → QA → `main`

- DEV owns one active implementation task at a time.
- QA owns admission, regression testing, `docs/PROJECT_STATE.md`, integration and release decisions.
- No DEV feature branch merges directly to `main`.
- Exactly one item may be `QA_ACTIVE`.
- While an item is `QA_ACTIVE`, do not start a new DEV PR for another content direction.
- `artGatePassed=false` remains authoritative until the complete Phase 1 art gate is accepted.

## Status vocabulary

- `QA_ACTIVE` — the single candidate currently under QA disposition.
- `READY_FOR_QA` — complete DEV handoff waiting behind the active candidate.
- `ACCEPTED_IN_INTEGRATION` — accepted and merged into `qa/phase1-integration`; not automatically accepted to `main`.
- `BLOCKED` — evidence is retained but repair, fresh current-base work, or another dependency is required.
- `SUPERSEDED` — replaced by a newer authoritative candidate; do not merge/reactivate.

## Current baselines

- `main`: corrective lineage includes `a845caafc1ccf6268facde48539c75520c0ba921`, which reverted the accidental merge of blocked QA preview PR #63 and restored the production tree that existed at `c24efeacd556a979df9b67824ac9ae2d6f2ade3d`.
- `qa/phase1-integration`: corrective lineage includes `fa14f26a8c6cde59745ba0b97d4bb42b1088a407`, which reverted superseded worker PR #64 while preserving its history. The branch head may advance with queue-only coordination commits; always read the branch itself rather than copying a head SHA from this document.
- Compact storehouse PR #60 remains accepted in integration through merge `e3d5a8af4758cac6683024b4c237bf14f14bbd2f`.
- Phase: `PHASE_1_CONTENT_ART_GATE`.
- Art gate: **OPEN — `artGatePassed=false`**.

## Current QA_ACTIVE

None. PR #65 has completed independent visual QA and is **ACCEPTED_IN_INTEGRATION**.

### #65 — supplied-source adult worker R2 — accepted

- Merge into `qa/phase1-integration`: `bc590ce1a565147bdefaef4b6116edc9deff5a42`.
- QA reviewed synchronized head `405d8f41fa719c02385a77c2ce8547ac0994da75`.
- Fresh synchronized-head CI: foundation run `35735867423` SUCCESS; worker R2 run `35735867400` SUCCESS.
- Reviewed artifact: `worker-r2-candidate` id `10697212076`, digest `sha256:21325f11db60b26d667b98af31d7ca30389a54f16a936b1dc3dfb555872fd198`.
- Visual QA: **PASS for Phase 1 integration**. Close-up silhouette/anatomy is materially coherent; clothing/material treatment is restrained and plausible for the current Late La Tène art target; normal RTS view remains readable and grounded. The previous #58 blocker classes are no longer admission blockers.
- Provenance remains pinned/reproducible. Triangle splitting remains geometry normalization only, not a visual-detail claim.
- This acceptance is **integration admission only**. It does not merge to `main`, does not make the worker canonical production runtime by itself, and does not set `artGatePassed=true`.

**Released follow-up:** lossless worker compaction is now authorized as the single next DEV task from the current `qa/phase1-integration` baseline. It must preserve the accepted #65 rendered silhouette, material/texture bytes and visual output; change storage/layout only; prove deterministic output and strict GLB/runtime equivalence; and return fresh isolated render + foundation regression evidence before any compacted asset replaces the accepted R2 bytes.

## Closed / parked items

| PR | Status | Disposition |
| ---: | --- | --- |
| #65 | **ACCEPTED_IN_INTEGRATION** | Adult worker R2 visually accepted; merged at `bc590ce1a565147bdefaef4b6116edc9deff5a42`. Lossless compaction follow-up released; `artGatePassed=false`. |
| #60 | **ACCEPTED_IN_INTEGRATION** | Compact storehouse accepted into `qa/phase1-integration`; keep as current storehouse implementation baseline. |
| #64 | **SUPERSEDED** | Closed. It was merged concurrently, then cleanly reverted from integration by `fa14f26a8c6cde59745ba0b97d4bb42b1088a407`. Do not reactivate; #65 is authoritative worker candidate. |
| #63 | **BLOCKED** | Closed QA evidence. Runtime CI passed, but visual QA found roof/thatch, roof-edge, interior readability and grounding/material blockers. Its accidental merge to `main` was reverted by `a845caafc1ccf6268facde48539c75520c0ba921`. |
| #55 | **BLOCKED** | Closed/parked old tree-LOD lineage. Rebuild later from the then-current integration base; runtime switching still requires actual-hardware evidence. |
| #43 | **SUPERSEDED** | Closed old stacked workshop candidate; superseded by later #63 evidence. |
| #48 | **SUPERSEDED** | Closed workshop LOD branch tied to superseded #43 lineage. |
| #58 | **SUPERSEDED** | Closed technical fallback; not admitted for production art. |

## Workshop repair contract for a future task

Do not open a workshop repair while #65 is `QA_ACTIVE`. When QA later releases workshop work, create one fresh branch from the then-current `qa/phase1-integration` and address the recorded #63 visual blockers:

- roof/thatch value and material readability;
- controlled roof-edge geometry without noisy fringe;
- brighter/clearer bench, trestle and tool readability;
- foundation/grounding that does not read as a dark rectangular slab;
- retain 20k–45k production triangle target, normals + UV0, PlayCanvas isolated render evidence, and full foundation regression.

Old #43/#48 ancestry must not be replayed wholesale.

## Tree LOD future gate

#55 evidence may be reused only as reference. When tree LOD becomes active, rebuild a fresh candidate from the current integration baseline and re-run current structural/runtime QA. Do not choose runtime distance thresholds until actual desktop-hardware evidence is available.

## Handoff contract

Every DEV handoff must provide:

1. exact branch and head SHA in the PR handoff itself;
2. candidate/runtime paths and provenance/source identity;
3. deterministic generation/export command where applicable;
4. triangle/vertex/material/texture/bounds/file-size data;
5. strict structural checks and relevant tests;
6. isolated PlayCanvas render evidence;
7. full current foundation regression when runtime files/routes change;
8. known limitations and explicit non-goals;
9. no claim of canonical admission and no `artGatePassed=true` claim.

GitHub is the only coordination channel between DEV and QA. QA updates this file immediately after every disposition before releasing another DEV task. Moving branch-head SHAs belong in the corresponding PR, not in this queue, so queue-only edits cannot make the active candidate appear stale.
