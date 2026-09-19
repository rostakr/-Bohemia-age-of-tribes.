# Phase 1 supplied content — QA delivery

The approved GitHub upload succeeded via the GitHub app. Earlier 'push blocked' notes in the archived patch are historical.

## Preserve latest work
This delivery extends b34a4491a40c61c39073214350a5d68aec92016d without replacing runtime, tests or current project-state documents.
Current main/branch already contains trees, inhabitant prototypes and dwelling LOD work absent from the older local implementation.

## Assets delivered
- public/assets/buildings/boii_carpentry_shed_open.glb: user supplied, 89,778 triangles.
- public/assets/characters/boii_adult_worker.glb: user supplied, 14,106 triangles, static, one base-color texture.
- public/assets/buildings/boii_storehouse_small.glb: project-owned procedural source exported with three embedded generated base colors; 15,550 triangles, 9,933,356 bytes.
- Original supplied GLBs, concepts, exact prompts, hashes and source receipts under assets/source/phase1/.
- scripts/export-storehouse.mjs and scripts/generate-free-trellis.py are offline production helpers, not runtime dependencies.

The project owner confirms that both user-supplied GLBs are licensed for this noncommercial personal-use project. The exact licence identifier/text and provider metadata remain pending archival in the repository; that missing archival detail is not evidence that the assets are unlicensed. Technical, visual and historical QA remain independent of licence status.
Storehouse uses generated wood/thatch/daub base colors, not calibrated full PBR sets. No asset LODs here. Texture tiling, UV seams, alpha/normal quality and historical fit require review.

## Integration handoff
The complete earlier runtime/document changes are preserved in supplied-content-integration.patch (base 53d2b6e2b37340dad2d6b649ceec60bab68292da).
Do not apply that patch wholesale: reconcile only its storehouse/workshop/inhabitant GLB slots, mesh diagnostics and smoke expectations into the newer scene.
Preserve current trees, dwelling LOD, lifecycle and newer documentation.
Ensure the five character instances replace prototype inhabitants rather than doubling them.
Update public asset credits and current asset manifest from the included intake/source receipts before deployment.

## Validation boundary
All 33 uploaded source blobs matched local Git blob SHAs. The complete original snapshot tree was dd9d0aaee88aba4e1464dde40f1a1937d1684578.
Local content tip: d564e3375d8b93596a8e1ab7436261809054ba63.
No tests/build/browser checks run for this delivery. Earlier 15/15 local tests predate later storehouse changes and are not acceptance evidence.
QA owner: chat “Kontrola repozitáře projektu”. Run integration, GLB import, WebGPU/WebGL2, lifecycle, visual and hardware performance checks after reconciliation.
No merge to main and no deployment authorized by this handoff.
