# Phase 1 integration note

Source handoff: `BOHEMIA_PHASE_1_CHECKPOINT(1).zip`, unpacked before repository import as requested.

Integration rules applied:

- `dist/` was excluded as generated output.
- The checkpoint copy of `docs/PROJECT_STATE.md` was excluded because live `main` contains newer coordination/acceptance state.
- `AGENTS.md` was preserved from live `main`.
- Existing Phase 0 browser QA was preserved and routed explicitly through `?scene=calibration`.
- A separate `smoke:phase1` check was added for the default benchmark scene.
- The 11 binary checkpoint assets were imported individually, not as an archive; their SHA-256 values were verified before commit.
- Phase 1 remains a checkpoint, not an accepted milestone. Visual, historical and real-GPU performance review are still required.
