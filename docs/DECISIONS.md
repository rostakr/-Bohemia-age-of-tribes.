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
| Deployment | Build a relative-base Vite `dist` for static HTTPS hosting; keep Pages deployment manual-only | CI may verify builds, but no remote or deployment is created or claimed by this milestone |

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

## Phase 1 art-gate decisions

| Area | Decision | Consequence |
| --- | --- | --- |
| Evidence levels | Separate direct Bohemian/Moravian archaeological support, broader Central-European analogy, and project reconstruction/inference | Plausible art direction is not silently promoted to archaeological fact |
| Functional evidence | Evidence for a residential, storage or craft function does not by itself validate one exact superstructure, roof, wall system, workshop layout or prop arrangement | Storehouse/workshop candidates remain WIP until closer structural parallels are documented or the uncertainty is explicitly accepted |
| Candidate admission | Procedural WIP content may satisfy benchmark scale/readability without filling a production `ADMITTED_MODELS` slot | Technical completeness of the benchmark cannot be confused with final production-art acceptance |
| Characters | The current 1,404-triangle inhabitant is a five-instance readability prototype only; the production adult-worker target remains 25k–50k triangles with one 2K atlas | `ADMITTED_MODELS.inhabitant` stays null until a production candidate is reviewed; no polygon-count inflation is required merely to hit the range |
| Vegetation | A single repeated oak-like candidate may establish forest-edge composition but cannot satisfy the final mixed-deciduous art direction by itself | Production vegetation needs species/age/silhouette variation and botanical review; exact proportions depend on the selected locality/micro-site |
| Historical review | Wider Central-European textile or settlement analogues may inform reconstruction but must be identified as analogues when local evidence does not establish the same detail | Clothing cut, tree mix and exact building superstructures retain documented uncertainty instead of invented certainty |
| LOD/performance | Select useful production LOD thresholds after actual-hardware measurement of the content-complete benchmark, not from SwiftShader CI FPS | Software CI remains a correctness/regression gate; it is not the production performance baseline |
| Art gate | Keep `artGatePassed=false` while production character, historical/visual/botanical review, actual-hardware performance, LOD strategy and environment polish remain open | All benchmark content classes may be present without authorizing the next large gameplay-production milestone |
| Phase sequencing | Do not begin large economy/combat/AI production systems solely because all benchmark content classes exist | Complete or explicitly waive the Phase 1 art/acceptance gate first |

The detailed source-backed review and its uncertainty rules are recorded in `docs/PHASE_1_HISTORICAL_ART_REVIEW.md`.

## Phase 2 RTS interaction foundation decisions

| Area | Decision | Consequence |
| --- | --- | --- |
| Integration base | Build Phase 2 from the exact QA-designated Phase 1 base and admit through `qa/phase2-integration` | RTS work does not silently bypass the accepted content/runtime baseline or merge directly to `main` |
| Camera ownership | Replace inspection-only interaction with an RTS-ready camera using WASD/arrows, edge scroll, middle-drag pan, wheel zoom and Q/E rotation | Camera input is usable for gameplay while PlayCanvas retains render-loop ownership |
| Simulation identity | Use stable numeric simulation IDs independent of PlayCanvas `Entity` instances | Gameplay state can remain engine-independent and deterministic instead of using renderer objects as authoritative units |
| Movement timing | Execute MOVE in the fixed-step simulation and interpolate presentation in rendering | Unit motion remains consistent with the existing deterministic timing architecture |
| Selection | Support click, drag-box and Shift toggle selection | The interaction layer now matches core desktop RTS selection expectations without introducing production HUD complexity |
| Context command | Use right-click for contextual MOVE and deterministically replace an existing route when a new MOVE is issued | Repeated orders have predictable simulation semantics and do not accumulate uncontrolled command state |
| Browser input path | Handle right-button `pointerup(button=2)` as the explicit production MOVE path while retaining `contextmenu` handling and duplicate suppression | Headless browser QA can exercise the production path without depending on inconsistent synthesized `contextmenu` behavior |
| Navigation | Use a terrain-derived bounded grid and bounded A* with building/water blockers, explicit ford traversal and no diagonal corner cutting | Units respect the benchmark world instead of crossing blocked water/buildings, while path work remains bounded |
| Invalid destinations | Resolve to bounded nearest-reachable ground when possible and provide explicit invalid feedback otherwise | User commands fail predictably instead of silently routing through obstacles or hanging the solver |
| Group movement | Assign deterministic destination slots, lightweight separation and a bounded path-solving queue | Multiple selected workers can move without permanent stacking or unbounded path work spikes |
| Diagnostics | Expose active/selected units, pending paths, paths solved per tick, simulation time and path failure state | Browser smoke tests and future performance work have observable state instead of relying only on screenshots |
| Stress case | Keep a debug-only 40-unit scenario in addition to the normal five-worker scene | CI can exercise bounded path processing without changing the production benchmark population |
| QA evidence | Keep SwiftShader/WebGL2 browser evidence as regression proof only | CI success must not be presented as desktop-GPU FPS or final performance evidence |
| Scope boundary | Exclude economy, combat, construction, production, AI, fog, multiplayer, advanced formations, mobile controls and engine migration from this milestone | Phase 2 remains a reviewable interaction/navigation foundation rather than an uncontrolled systems expansion |
| Next-phase gate | Do not begin a large undefined Phase 3 system until its scope and acceptance criteria are explicitly recorded | Future development cannot infer authorization for economy/combat/AI solely from the Phase 2 merge |

## Product constraints carried forward

- The chronological campaign distinguishes Boii (Late La Tène), Marcomanni (early Roman Imperial), and Slavs (6th–7th centuries).
- Any mixed-period skirmish is labeled anachronistic.
- The setting avoids fantasy and generic medieval castles.
- Resources are food, wood, stone, iron, and trade wealth.
- Phase 1's benchmark is a rolling south/central Bohemian landscape with stream, mixed deciduous forest, meadow, path, three Boii structures, and five inhabitants.

## Validation and handoff

The clean setup remains `npm ci`, followed by `npm run validate` for type checking, focused Node tests, and a production build. Browser regression coverage additionally runs WebGL2 startup/fallback, interactions, lifecycle remount and software WebGPU smoke tests in CI. Phase 2 adds `npm run smoke:phase2` and the dedicated `Validate Phase 2 RTS interaction foundation` workflow for the five-worker and 40-worker interaction/navigation cases. Reviewed releases remain separate from QA integration; actual workflow IDs, evidence artifacts and accepted commit references belong in `docs/PROJECT_STATE.md` and the milestone handoff document rather than being inferred from this decisions log.
