# Project state

```json
{
  "schema_version": 1,
  "project": "BOHEMIA: AGE OF TRIBES",
  "updated": "2026-09-17",
  "current_main_sha": null,
  "source_baseline": "new standalone Phase 0 source package; no Git repository linked",
  "active_milestone": "PHASE_0_FOUNDATION",
  "status": "implementation_complete_awaiting_external_qa",
  "engine": "playcanvas@2.22.1",
  "next_phase_authorized": false,
  "deployment": null,
  "latest_qa": {
    "typescript": "passed",
    "focused_node_tests": "5/5 passed",
    "production_build": "passed",
    "browser_smoke": "blocked: cloud browser ERR_BLOCKED_BY_CLIENT on localhost",
    "external_sol_qa": "pending",
    "gpu_performance": "not_measured"
  }
}
```

## Completed systems

- Strict TypeScript ES modules; pinned npm dependencies and lockfile; Vite relative-base static build.
- PlayCanvas device bootstrap: WebGPU preference, WebGL2 fallback and forced compatibility URL.
- Application/scene ownership, disposal on HMR/unload, viewport resize and capped pixel ratio.
- 20 Hz engine-independent timing, bounded catch-up, pause/resume and hidden-tab timing reset.
- Typed future command/resource/culture/terrain contracts; commands do not execute yet.
- Bounded frame/simulation telemetry and visible startup/runtime error panel.
- Static 20 m calibration floor and 1.8 m marker; no production art.
- CI validation and manually triggered Pages workflow prepared, not run on GitHub.
- Asset categories and provenance/rights gate; project/art/architecture documents.

## Known broken or unverified systems

- No observed failures in typecheck, Node checks or build.
- Actual WebGPU/WebGL2 rendering, device-loss recovery and browser interactions remain unverified.
- Known repository spellings `rostakr/-Bohemia-age-of-tribes` and `rostakr/bohemia-age-of-tribes` returned GitHub API 404. This does not establish whether the repository is absent or inaccessible. No remote main SHA, PR state or deployment was verified; no remote was modified.
- Terrain, RTS camera, navigation, selection, command execution, economy, construction, production, combat, AI, fog, trade and victory conditions are future milestones, not broken implemented features.

## Concrete technical risks / performance state

- Build includes an approximately 2.03 MB minified engine/application JS chunk (~521 KB gzip), plus source map. Vite reports the 500 KB chunk advisory; no code splitting claim.
- Engine browser bundle produces `node:worker_threads` externalization warnings from optional Draco/Gaussian-splat worker paths. Phase 0 does not invoke these paths. Revalidate before admitting those features.
- 60 FPS / 1080p and hundreds of units are targets only. Calibration timings would not establish RTS scale performance.
- No custom GLSL, KTX2, Meshopt/Draco decoder configuration, asset loader wrapper, navigation library, or worker simulation has been added. Decide these against actual Phase 1 assets/Phase 3 profiling instead of speculative integrations.
- Fixed-step scheduling is not a cross-platform deterministic multiplayer guarantee.

## Next work

External Sol QA follows `docs/HANDOFF_PHASE_0.md`. If accepted, prepare a bounded Phase 1 visual benchmark ticket with approved commercial assets and historical reference brief. Relevant files: `src/render/calibration-scene.ts`, `src/render/scene.ts`, `src/render/runtime.ts`, `src/config.ts`, `docs/ART_BIBLE.md`, `docs/ASSET_MANIFEST.md`. Stop before Phase 1 until that ticket arrives.
