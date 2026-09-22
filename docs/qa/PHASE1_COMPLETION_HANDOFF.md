# Phase 1 completion candidate — not final acceptance

Implementation base: `a61ba123a7bfe4fdfd4bddf1e677e0564a54133a` on
`qa/phase1-integration`. User requested completion of Phase 1 and a Phase 2 prompt.
QA remains responsible for independent acceptance, integration and release.

## Review this scene

Generate assets, then build:

```sh
npm ci
node scripts/build-worker-r2.mjs
node scripts/compact-worker-r2.mjs
node --experimental-strip-types scripts/export-workshop-project.mjs
npm run build
npm run preview
```

Open the preview URL with `?candidate=phase1&debug=1&renderer=webgl2`.
Remove `renderer=webgl2` to exercise the preferred device path on capable hardware.
The scene combines the existing dwelling, compact storehouse, repaired workshop and
five compact R2 workers. Terrain, stream, paths, meadow and vegetation stay in place.
`?workshop=project` isolates the workshop substitution for comparison; the ordinary
URL retains the admitted/default configuration. No automatic canonical replacement.

## Exact repaired blockers from #63

- Roof: warmer/darker texture multiplier instead of unmodified pale base color.
- Edge: short aligned eave strands; interior straw bundles stay inside roof bounds.
- Interior: separate lighter worn work surfaces and brighter iron silhouettes.
- Ground: shallow irregular tapered earth patch replaces the raised rectangular slab.
- Physical-repeat timber UVs and explicit cylindrical seams reused from #63, without
  replaying its old branch or changing the default procedural workshop.

`Validate Phase 1 completion candidate` builds both assets, checks strict workshop
intake, runs the existing validate suite and captures settlement/river/craft views.
Standard foundation CI remains responsible for the existing full runtime regressions.
Artifact: `phase1-completion-evidence`; it includes both generated GLBs and receipts.
The CI artifact is a review package, not a published game build.

## Gates still requiring independent evidence

1. Compare repaired craft view against #63: roof tone, restrained edge, readable
   tools/bench, convincing ground contact. Verify no floating geometry or new seams.
2. Confirm compact-worker equivalence to accepted #65, using #68 current-head evidence.
3. Review all three views and close/RTS scales for overall professional visual quality,
   cultural fit, readable silhouettes and vegetation composition. Generated procedural
   workshop and base-color-only materials are not automatically production quality.
4. Run full lifecycle/WebGL2/WebGPU regressions and verify the built candidate URL
   includes all generated assets with no 404s. No main merge or deployment by DEV.
5. Run 1080p on an actual desktop GPU: record device/OS/browser/backend, quality,
   camera route, warm-up, sample duration, median/p95 frame time, draw calls and memory
   where measurable. Software-renderer CI is not proof of 60 FPS. Runtime LOD distances
   remain unset until measured; do not resurrect parked #55 wholesale.
6. Resolve remaining material/vegetation quality gaps from evidence. Workshop/storehouse
   still lack full normal/roughness texture sets; worker is static/unrigged. Decide
   explicitly which are Phase 1 blockers and which belong to later art/animation work.
7. Reconcile stale PROJECT_STATE and ASSET_MANIFEST historical sections with newer QA
   dispositions (#60, #65, #68). Queue and reviewed SHA must identify the same baseline.
8. Only after acceptance, perform a separate canonical-admission/release change and
   record final accepted SHA, evidence and any explicitly accepted limitations.

Until these gates are closed, `artGatePassed=false`; Phase 1 is not declared complete.
`docs/PHASE_2_TASK.md` is ready to paste into the next implementation chat, but includes
an explicit Phase 1 entry gate. Phase 2 has not been implemented by this change.
