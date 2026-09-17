# Decisions

## Phase 0 decisions

| Area | Decision | Consequence |
| --- | --- | --- |
| Scope | Build the technical foundation and static inspection scene only | Terrain gameplay, navigation, RTS camera behavior, command handlers, factions, and production content wait for later phases |
| Runtime | Desktop browser with PlayCanvas Engine pinned to 2.22.1, strict TypeScript, ES modules, and Vite | Reproducible engine API and a small static web build |
| Graphics | Prefer WebGPU through PlayCanvas using native built-in WGSL; retain WebGL2 fallback | Startup must select a supported device without maintaining a separate custom shader language path in Phase 0 |
| Loop ownership | PlayCanvas owns the render loop | Runtime scene updates attach to the engine lifecycle rather than creating another animation loop |
| Scene lifetime | Runtime scenes expose explicit `enter`, `update`, and `destroy` stages | Resources and subscriptions have clear ownership and teardown |
| Simulation | Keep an engine-free fixed-step clock at 20 Hz with capped catch-up | Core timing can be checked in Node and cannot spiral through unbounded delayed ticks |
| Commands | Define tick-indexed contracts for `move`, `attack`, `gather`, `build`, `repair`, and `stop` | Interfaces can stabilize before gameplay execution; Phase 0 has no handlers |
| Diagnostics | Keep debug telemetry bounded | Long sessions cannot grow diagnostic history without limit |
| View | Use a static inspection camera | A full RTS camera is outside Phase 0 |
| Art | Use only generated primitive floor and height-marker calibration geometry | All visible Phase 0 geometry is disposable internal greybox work, never production art |
| Assets | Gate commercial assets through provenance, licensing, historical, visual, and technical review | No professional asset is imported or mass-produced in Phase 0 |
| Deployment | Build a relative-base Vite `dist` for static HTTPS hosting; keep Pages deployment manual-only | CI may verify builds, while release publishing remains an explicit reviewed action |

## Phase 0.5 integration repair decisions

| Area | Decision | Consequence |
| --- | --- | --- |
| Engine boundary | Keep PlayCanvas 2.22.1 as the sole game/render engine | No React rewrite, DOM renderer substitution or duplicate game loop is introduced |
| Runtime API | Expose explicit `initialize`, `start`, `pause`, `resume`, `resize`, `setVisibility`, `snapshot` and `destroy` operations | A host can mount and unmount the engine cleanly without a full page reload |
| Host ownership | Keep browser/DOM event wiring in the standalone Vite bootstrap rather than in the PlayCanvas runtime | Runtime code is reusable by another shell without depending on a specific HTML layout |
| Scene initialization | Allow `RuntimeScene.enter()` to be synchronous or asynchronous | Future asset-heavy scenes can finish controlled loading before the runtime starts without changing engine ownership |
| Remount safety | Make teardown idempotent and add a three-cycle browser mount/unmount regression test | Future host integration must prove it does not duplicate canvas/runtime side effects |
| Asset addressing | Resolve logical asset paths centrally beneath `public/assets` and respect the configured deployment base | Gameplay/render code does not scatter hardcoded production URLs and remains compatible with root, subpath or injected host bases |
| Hosting | Retain Vite/GitHub Pages as the reference build; do not migrate to Floot without a demonstrated requirement | The working deployment is preserved and migration risk is avoided |
| Future Floot/React boundary | If later required, React/Floot may own only the shell/canvas/UI lifecycle and call the PlayCanvas runtime API | PlayCanvas still owns rendering, fixed-step integration and the game loop |
| Graphics fallback | Preserve PlayCanvas WebGPU preference with WebGL2 compatibility fallback and explicit WebGL2 QA override | Phase 0 renderer behavior remains regression-tested rather than replaced |
| Simulation | Preserve the existing engine-independent `FixedStepClock` unchanged | Later movement, combat, AI and economy work retains the deterministic timing foundation |
| Deployment publishing | Keep GitHub Pages publishing manual-only after reviewed releases | Normal repository pushes do not silently publish a game build |
| One-time deployment bootstrap | Reuse the established temporary trigger scoped only to changes of `deploy-pages.yml`, then restore manual-only mode after a successful publish | A reviewed build can be published with available tooling without permanently changing deployment policy |
| Production verification | Maintain a separate `Verify published foundation` workflow that tests the public Pages URL, linked JS/CSS and initialized WebGL2 runtime | Deployment correctness is independently reproducible rather than inferred from a successful upload/deploy action |
| Gate order | Phase 1 may proceed only after Phase 0.5 static, runtime, fallback, lifecycle and public deployment checks pass | Phase 1 content is integrated onto a verified infrastructure baseline rather than masking integration defects |

## Phase 1 reconciliation decisions

| Area | Decision | Consequence |
| --- | --- | --- |
| Source branch | Treat old PR #8 as an audit/source checkpoint, not a merge target | Its pre-Phase-0.5 runtime changes cannot overwrite the verified lifecycle foundation |
| Reconciliation | Rebuild Phase 1 on a fresh branch from verified Phase 0.5 (`integrate/phase1-on-phase0_5`, PR #14) | Phase 1 content is ported intentionally while infrastructure remains current |
| Binary preservation | Reuse exact Git blob SHAs for checkpoint binary assets | Large GLB/PNG/JPG assets remain bit-identical without download/re-upload risk |
| Default scene | Use the Phase 1 benchmark as the normal development entry and preserve Phase 0 at `?scene=calibration` | Phase 1 can advance while Phase 0 remains directly regression-testable |
| Runtime integration | Add optional scene diagnostics to `GameRuntime.snapshot()` but retain Phase 0.5 lifecycle semantics | Phase 1 exposes structures/vegetation/draw-call metrics without owning host lifecycle or the game loop |
| Scene asset loading | Route Phase 1 GLB/texture loads through `resolveAsset()`; normalize a legacy leading `assets/` prefix at the scene loader boundary | All runtime asset URLs remain centralized and subpath-safe without rewriting checkpoint manifests merely for path syntax |
| Regression routing | Force all Phase 0 browser/lifecycle/WebGPU tests to the calibration route | Changing the default scene cannot silently weaken or invalidate the verified foundation regression suite |
| Phase 1 QA | Add landscape Node checks and a dedicated WebGL2 benchmark smoke/evidence artifact without removing any Phase 0.5 test | Technical reconciliation has an explicit gate while Phase 0 correctness remains independently protected |
| Deployment verification | Keep the public-foundation verifier on the calibration route | The currently published Phase 0.5 reference remains testable even while an undeployed Phase 1 branch changes the default scene |
| Acceptance boundary | Treat software-CI rendering as runtime evidence, not visual/historical/actual-GPU acceptance | CI PASS does not imply professional art approval, historical plausibility or a 60 FPS hardware claim |
| Dwelling candidate | Keep the 99,298-triangle TRELLIS.2 dwelling as an evaluation asset only | Historical review, visual review and optimization/LOD or replacement are required before production acceptance |

## Product constraints carried forward

- The chronological campaign distinguishes Boii (Late La Tène), Marcomanni (early Roman Imperial), and Slavs (6th–7th centuries).
- Any mixed-period skirmish is labeled anachronistic.
- The setting avoids fantasy and generic medieval castles.
- Resources are food, wood, stone, iron, and trade wealth.
- Phase 1's target benchmark is a rolling South/Central Bohemian landscape with stream, mixed deciduous forest, meadow, path, three Boii structures, and five inhabitants.

## Validation and handoff

The clean setup remains `npm ci`, followed by `npm run validate`. CI then runs the preserved Phase 0 WebGL2, interaction, lifecycle and WebGPU regressions plus the Phase 1 benchmark smoke. Reviewed releases are deployed through the manual-only Pages workflow and may be checked independently with `Verify published foundation` against the public calibration route. Actual workflow IDs, artifact IDs and current gate status belong in `docs/PROJECT_STATE.md` and the current milestone handoff rather than being inferred from this decisions log.
