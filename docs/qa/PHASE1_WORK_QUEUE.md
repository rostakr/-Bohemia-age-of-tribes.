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

- `main`: corrective head `a845caafc1ccf6268facde48539c75520c0ba921`; this reverts the accidental merge of blocked QA preview PR #63 and restores the production tree that existed at `c24efeacd556a979df9b67824ac9ae2d6f2ade3d`.
- `qa/phase1-integration`: corrective head `fa14f26a8c6cde59745ba0b97d4bb42b1088a407` before this queue update; this reverts superseded worker PR #64 while preserving its history.
- Compact storehouse PR #60 remains accepted in integration through merge `e3d5a8af4758cac6683024b4c237bf14f14bbd2f`.
- Phase: `PHASE_1_CONTENT_ART_GATE`.
- Art gate: **OPEN — `artGatePassed=false`**.

## Current QA_ACTIVE

### #65 — supplied-source adult worker R2

- PR: #65
- Branch: `phase1/worker-production-r2-current`
- Synced head after the #64 revert: `16d42772b736fc7c936f062e3fef089b086060bd`
- Base: `qa/phase1-integration`
- Status: **QA_ACTIVE**
- Canonical runtime/admission: unchanged pending QA decision.

Candidate evidence from code head `a45e2a09fd352734d3ba8bf9f881c17e07668f23`:
- pinned licensed supplied source SHA-256 `0ca4d24829f89ad60815102b5d08a6bcdfb9c5d724653ac08306ffe04dfae1f2`;
- R2 output 28,212 triangles / 56,424 vertices;
- GLB 3,615,224 B, SHA-256 `c0e8144f07d84bfcd7b3e5118df59c1d589a65f23f512099ed75cb1881ba81b8`;
- NORMAL 1/1, UV0 1/1, one material/image/texture, no skin/animations;
- dedicated worker run `35729095078`: SUCCESS;
- foundation run `35729095028`: SUCCESS;
- RTS WebGL2 preview and neutral close-up: PASS;
- artifact `10693924659`, digest `sha256:0d7654f5f760a88d2c1811a6c5017a9625feededf0de8baadbffd00115ca0103`.

QA decision criteria:
1. human silhouette/anatomy at close-up;
2. Late La Tène visual restraint and clothing/material coherence;
3. normal RTS readability and grounding;
4. no renderer/lifecycle/foundation regression;
5. provenance remains pinned and reproducible;
6. treat the deterministic triangle split only as geometry normalization — doubling triangles is **not** by itself evidence of improved visual detail;
7. the 3.62 MB payload is a known optimization issue; if visual QA accepts the candidate, compaction may be a separate isolated follow-up without changing the reviewed silhouette/material.

No new worker PR is authorized while #65 is `QA_ACTIVE`. QA must either accept it into integration, return one explicit repair contract, or explicitly supersede it.

## Closed / parked items

| PR | Status | Disposition |
| ---: | --- | --- |
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

1. exact branch and head SHA;
2. candidate/runtime paths and provenance/source identity;
3. deterministic generation/export command where applicable;
4. triangle/vertex/material/texture/bounds/file-size data;
5. strict structural checks and relevant tests;
6. isolated PlayCanvas render evidence;
7. full current foundation regression when runtime files/routes change;
8. known limitations and explicit non-goals;
9. no claim of canonical admission and no `artGatePassed=true` claim.

GitHub is the only coordination channel between DEV and QA. QA updates this file immediately after every disposition before releasing another DEV task.
