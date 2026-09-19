# Phase 1 QA / DEV work queue

This file is the single authoritative work queue between Phase 1 DEV and QA.

## Branch flow

`feature DEV branch` → `qa/phase1-integration` → QA → `main`

- DEV owns asset creation and implementation on a feature branch.
- QA owns admission, regression testing, `docs/PROJECT_STATE.md`, integration into `qa/phase1-integration`, and the eventual merge to `main`.
- DEV must not merge feature branches directly to `main`.
- QA must not release another DEV task while a handoff is `QA_ACTIVE`. The active handoff must first become `ACCEPTED_IN_INTEGRATION`, be returned as `BLOCKED` with an explicit repair request, or be explicitly deferred. A returned `BLOCKED` handoff may remain in the queue while QA advances to the next already-delivered handoff.
- `artGatePassed=false` remains authoritative until the complete Phase 1 art gate is accepted.

## Status vocabulary

- `READY_FOR_QA` — DEV handoff exists and is queued behind the active QA item.
- `QA_ACTIVE` — the single handoff currently being evaluated by QA; no further DEV task is released until disposition.
- `ACCEPTED_IN_INTEGRATION` — QA accepted the handoff and integrated it into `qa/phase1-integration`; it is not automatically accepted to `main`.
- `BLOCKED` — cannot advance until the recorded dependency or repair is resolved.
- `SUPERSEDED` — replaced by newer work/evidence or made obsolete by content already accepted elsewhere; should not be merged.

## Baseline

- Verified `main`: `47728da23ae73a01b298b935d59a431bc6088548`
- Verification: `Validate foundation` run `35410230067` — PASS.
- Integration branch: `qa/phase1-integration`, created from the verified `main` SHA above.
- Phase: `PHASE_1_CONTENT_ART_GATE`
- Art gate: **OPEN — `artGatePassed=false`**

## Current queue

| Order | PR | Branch | Status | QA decision / dependency |
| ---: | ---: | --- | --- | --- |
| 1 | #60 | `phase1/storehouse-512-current-baseline` | **QA_ACTIVE** | Current DEV HANDOFF. Fresh current-baseline compact-storehouse candidate replacing the superseded #41 implementation path. Retargeted to `qa/phase1-integration`. QA must verify the current head CI, exact GLB/texture result, visual equivalence at RTS + close-up distance, regressions and scope before any integration admission. No further DEV task is released until #60 is accepted, returned, or deferred. |
| 2 | #58 | `phase1/project-adult-worker-candidate` | **BLOCKED** | Independently QA-reviewed and returned for art repair. Head `2ee931a0…` is technically healthy: candidate workflow `35412134308` PASS and foundation workflow `35412134254` PASS; 26,140 tris is inside the 25k–50k target. Production visual admission fails: close-up remains procedural/placeholder with detached oval hands, spherical shoulder caps, simplified limbs, toy-like face/head construction and weak body/clothing transitions. |
| 3 | #43 | `phase1/project-workshop-glb` | **READY_FOR_QA** | Project-owned workshop GLB candidate, 22,480 tris. Retargeted to `qa/phase1-integration`; needs isolated runtime/visual/historical QA before admission. |
| 4 | #55 | `phase1/tree-lod-candidates` | **READY_FOR_QA** | Deterministic tree LOD1/LOD2 candidates. Retargeted to `qa/phase1-integration`; geometry can be QA-reviewed later, while runtime switch thresholds remain dependent on actual-hardware evidence. |
| 5 | #48 | `phase1/workshop-lod1-r2` | **BLOCKED** | Depends on #43 workshop LOD0 being accepted first. Do not QA/merge the LOD branch ahead of its source candidate. |
| — | #59 | `qa/supplied-preview-render` | **SUPERSEDED** | QA-only evidence task completed and closed. Dedicated multi-angle render run `35412011470` PASS and standard foundation run `35412011476` PASS. Supplied workshop/worker previews render, but neither is production-admitted. |
| — | #53 | `phase1/supplied-normals-preview-r3` | **SUPERSEDED** | Closed. Structural normals-only preview work was superseded by #59, which performed the actual PlayCanvas multi-angle render validation. |
| — | #41 | `phase1/storehouse-uv-material-pass` | **SUPERSEDED** | Closed. Replaced by the fresh current-baseline storehouse candidate #60; do not replay the old stacked branch. |
| — | #45 | `phase1/license-provenance-clarification` | **SUPERSEDED** | Closed. Old provenance-only branch is no longer a QA blocker. Project-owner-supplied assets are treated as cleared for this project; technical/visual/historical admission remains independent. |

## Returned repair contract — PR #58 adult worker

The current candidate is **not** admitted. DEV repair must:

1. preserve the existing runtime architecture and target scale of about 1.72 m;
2. keep worker geometry inside the documented 25k–50k triangle target;
3. replace placeholder anatomy with a coherent human silhouette — integrated hands/wrists, natural shoulder-to-upper-arm transition, cleaner elbows/knees/feet and plausible head/neck proportions;
4. materially improve face/hair/beard readability without primitive-like protrusions;
5. preserve historically restrained Late La Tène worker clothing and avoid fantasy, Roman or medieval cues;
6. provide a new isolated neutral close-up plus the normal RTS benchmark render through PlayCanvas WebGL2;
7. rerun strict GLB checks and the full foundation regression suite on the repaired head;
8. leave `ADMITTED_MODELS` and `artGatePassed=false` unchanged until QA accepts the repair.

## Completed QA evidence from supplied Astra/content handoff

The supplied storehouse is already WIP-admitted on `main` and remains covered by strict GLB/runtime smokes.

The supplied workshop and adult-worker originals remain provenance/source material only. QA #59 established:

- normals-fixed workshop preview: PlayCanvas WebGL2 render PASS from multiple checked angles; 89,778 triangles; visually coherent in the captured QA views but above the current 20k–45k workshop production target;
- normals-fixed worker preview: PlayCanvas WebGL2 render PASS from multiple checked angles; 14,106 triangles; the previously suspected severe projection failure was not reproduced in these checked views, but the candidate remains below the current 25k–50k production brief and has no rig/animations/LOD;
- neither result changes canonical runtime admission;
- `artGatePassed=false` remains unchanged.

## Handoff contract

A DEV handoff entering this queue should provide, where applicable:

1. exact feature branch and head SHA;
2. candidate/runtime paths and source/provenance paths;
3. deterministic generation/export command if generated;
4. triangle/vertex/material/texture/bounds data;
5. strict structural checks and relevant unit tests;
6. isolated PlayCanvas render evidence rather than only file-level validation;
7. known limitations and explicit non-goals;
8. no claim of admission or `artGatePassed=true` — those belong to QA.

QA records the outcome in this queue and `docs/PROJECT_STATE.md`. Only QA moves accepted content into `qa/phase1-integration` and later to `main`.
