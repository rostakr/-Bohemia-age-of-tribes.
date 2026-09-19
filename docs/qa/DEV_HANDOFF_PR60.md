# DEV HANDOFF — PR #60 compact storehouse current baseline

## Task boundary

This handoff covers only PR #60: `Phase 1: consolidate compact storehouse on current baseline`.

Branch: `phase1/storehouse-512-current-baseline`
Base: `main` at `47728da23ae73a01b298b935d59a431bc6088548`
Last code-changing head validated before this handoff: `f5ddfe301d4ea8a7d2e985e00088c992aab7e0c7`

No worker, workshop, tree LOD, gameplay, simulation, Phase 2/economy/combat, admission-architecture, deployment or `main` merge work is in scope.

`artGatePassed=false` remains unchanged.

## Implemented

- Physical-size storehouse UV repeat: `STOREHOUSE_UV_REPEAT_METRES = 0.65`.
- Explicit duplicated cylinder U=0/U=1 seams.
- Roof UV direction follows ridge/slope axes.
- Focused storehouse UV regression tests.
- Original 1254 px PNG source textures preserved unchanged.
- Deterministic 512×512 JPEG runtime derivatives using Pillow 12.3.0, q90, 4:4:4.
- Generated storehouse GLB references the three runtime JPEGs by exact relative URI.
- Export path copies only the allowlisted storehouse runtime textures into `public/assets/materials/storehouse/` during validate/build/dev.
- Generic strict GLB policy continues to reject external dependencies.
- Storehouse-specific admission checker permits only the exact three documented URI/size/SHA combinations, then delegates geometry checks to the strict GLB checker.

## Final reproduced payload

Validated code head: `f5ddfe301d4ea8a7d2e985e00088c992aab7e0c7`

Storehouse GLB:
- size: 761,892 B
- SHA-256: `f05ba7e6828269d360534749e5043f93b29bf30aa22b788d9b585c2eaaeeae68`
- triangles: 15,550
- vertices: 17,810
- primitives: 5
- normals + UV0: 5/5 primitives

Runtime textures:
- weathered oak: 98,279 B — `c6abab6dd1959b80929657ffeda3a2425d6f3d965ae4d7f46ea45d774d1e8684`
- straw thatch: 138,633 B — `0564f253d920fcdb6bc2e300687abe067912991b53e0e9fa72abdd1c7e5a8f0a`
- clay/daub: 87,217 B — `dc10ae700c143796fda36947149a4a47299b6e36a8f4cb1b2b3dd4b9c3f67ede`

Texture payload total: 324,129 B
Complete runtime payload: 1,086,021 B

## Checks performed

Dedicated compact-storehouse workflow run `35413378475`: PASS.

Performed and passed:
- `npm run validate`
- compact storehouse GLB admission gate
- complete payload URI/size/SHA gate
- production build
- WebGL2 browser smoke
- interaction regression smoke
- 3× lifecycle remount smoke
- software WebGPU smoke
- Phase 1 benchmark smoke
- storehouse admission smoke
- storehouse close-up smoke
- required QA artifact upload

Standard foundation workflow run `35413378474`: PASS through the standard browser/lifecycle/Phase-1/storehouse regression suite.

QA artifact:
- artifact ID: `10575176306`
- name: `compact-storehouse-current-baseline`
- contents: generated GLB, three runtime JPEGs, receipts, Phase-1 screenshot, admission screenshot and close-up screenshot
- artifact ZIP SHA-256: `12d28807e971d2fe438780251e24b6e8c0edbbe16ae1b8aeb333cd6c96d8afd2`

Implementation-side screenshot review found no obvious missing texture, UV collapse, inverted scale or grounding failure at the tested RTS/QA views.

## Checks not performed / not claimed

The following are deliberately NOT claimed as complete:
- independent QA approval by the QA chat;
- final visual-art acceptance;
- final historical acceptance;
- actual-hardware GPU performance / VRAM / frame-time acceptance;
- production LOD approval for the storehouse;
- final material polish, normal/roughness/AO maps or production PBR acceptance;
- deployment of this PR;
- merge to `main`.

The current evidence is software-backend CI + implementation-side screenshot review only. It does not set `artGatePassed=true`.

## Known correction versus historical PR #41 evidence

Do not reuse the historical truncated JPEG transport from PR #41. The old ~0.78 MB result was associated with invalid 7,506 B JPEG blobs that failed decoding in the full benchmark. PR #60 reproduces valid 512×512 runtime JPEGs and reports GLB size separately from the complete runtime payload.

## QA decision requested

QA should decide only whether PR #60 is acceptable as the compact storehouse transport/UV/material-transfer checkpoint on the current baseline.

Recommended QA focus:
1. verify PR diff stays inside this task boundary;
2. inspect the current artifact screenshots for UV seams/stretching, roof orientation, texture repetition, colour balance and grounding;
3. verify the exact GLB and runtime-texture hashes above;
4. independently confirm the required CI runs are green;
5. keep `artGatePassed=false` unless a separate art/historical/hardware gate explicitly changes that state.

No merge to `main` is authorized by this DEV handoff. DEV work stops at this handoff boundary and waits for QA disposition.
