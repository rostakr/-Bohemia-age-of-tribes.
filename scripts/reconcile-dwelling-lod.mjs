import { readFileSync, writeFileSync } from 'node:fs';

function edit(path, transform) {
  const before = readFileSync(path, 'utf8');
  const after = transform(before);
  if (after === before) throw new Error(`No change produced for ${path}`);
  writeFileSync(path, after, 'utf8');
}

function replaceOnce(text, from, to, label) {
  const first = text.indexOf(from);
  if (first < 0) throw new Error(`Missing marker: ${label}`);
  if (text.indexOf(from, first + from.length) >= 0) throw new Error(`Marker is not unique: ${label}`);
  return text.slice(0, first) + to + text.slice(first + from.length);
}

edit('.gitignore', source => {
  const lines = [
    'public/assets/buildings/boii_dwelling_rectangular_lod1.glb',
    'public/assets/buildings/boii_dwelling_rectangular_lod2.glb',
  ];
  let out = source.trimEnd();
  for (const line of lines) if (!out.split('\n').includes(line)) out += `\n${line}`;
  return out + '\n';
});

edit('package.json', source => {
  const pkg = JSON.parse(source);
  const check = 'scripts/check-dwelling-lods.mjs';
  if (!pkg.scripts?.test?.includes('scripts/check-inhabitant.mjs')) {
    throw new Error('Current inhabitant test gate missing; refusing stale package merge');
  }
  if (!pkg.scripts.test.includes(check)) pkg.scripts.test += ` ${check}`;
  pkg.scripts['generate:dwelling-lods'] = 'node scripts/generate-dwelling-lods.mjs public/assets/buildings/boii_dwelling_rectangular.glb public/assets/buildings';
  pkg.scripts.pretest = 'npm run generate:dwelling-lods';
  pkg.scripts.prebuild = 'npm run generate:dwelling-lods';
  pkg.scripts.predev = 'npm run generate:dwelling-lods';
  return JSON.stringify(pkg, null, 2) + '\n';
});

edit('src/render/benchmark-scene.ts', source => {
  source = replaceOnce(
    source,
    "  dwelling: 'buildings/boii_dwelling_rectangular.glb',",
    "  dwelling: 'buildings/boii_dwelling_rectangular_lod1.glb',",
    'default dwelling LOD path',
  );
  source = replaceOnce(
    source,
    'export const USE_PROCEDURAL_INHABITANT_CANDIDATE = true;',
    'export const USE_PROCEDURAL_INHABITANT_CANDIDATE = true;\nexport const DWELLING_LOD1_TRIANGLES = 53_538;',
    'dwelling LOD diagnostic constant',
  );
  source = replaceOnce(
    source,
    '  private drawCalls = 0;\n  private storehouseTriangles = 0;',
    '  private drawCalls = 0;\n  private dwellingTriangles = 0;\n  private storehouseTriangles = 0;',
    'dwelling triangle field',
  );
  source = replaceOnce(
    source,
    '      this.root!.addChild(entity);\n      this.buildings++;',
    "      this.root!.addChild(entity);\n      if (index === 0 && path === ADMITTED_MODELS.dwelling) {\n        this.dwellingTriangles = DWELLING_LOD1_TRIANGLES;\n      }\n      this.buildings++;",
    'dwelling load diagnostic',
  );
  source = replaceOnce(
    source,
    "      grassClumps: this.grassClumps,\n      storehouseCandidate: this.storehouseTriangles > 0 ? 'procedural-project-owned' : 'absent',",
    "      grassClumps: this.grassClumps,\n      dwellingCandidate: this.dwellingTriangles > 0 ? 'trellis-derived-generated-lod1' : 'custom-or-absent',\n      dwellingLod: this.dwellingTriangles > 0 ? 1 : 0,\n      dwellingTriangles: this.dwellingTriangles,\n      storehouseCandidate: this.storehouseTriangles > 0 ? 'procedural-project-owned' : 'absent',",
    'dwelling diagnostics',
  );
  source = replaceOnce(
    source,
    '    this.water = undefined;\n    this.storehouseTriangles = 0;',
    '    this.water = undefined;\n    this.dwellingTriangles = 0;\n    this.storehouseTriangles = 0;',
    'dwelling cleanup',
  );
  if (!source.includes("procedural-project-owned-readability-prototype")) {
    throw new Error('Current inhabitant diagnostics disappeared during dwelling merge');
  }
  if (!source.includes("procedural-project-owned' : 'absent'")) {
    throw new Error('Current content diagnostics disappeared during dwelling merge');
  }
  return source;
});

edit('scripts/browser-phase1-smoke.mjs', source => {
  source = replaceOnce(
    source,
    "      Number(diagnostics.structures) >= 3 &&\n      diagnostics.storehouseCandidate === 'procedural-project-owned' &&",
    "      Number(diagnostics.structures) >= 3 &&\n      diagnostics.dwellingCandidate === 'trellis-derived-generated-lod1' &&\n      Number(diagnostics.dwellingLod) === 1 &&\n      Number(diagnostics.dwellingTriangles) === 53_538 &&\n      diagnostics.storehouseCandidate === 'procedural-project-owned' &&",
    'healthy dwelling LOD gate',
  );
  source = replaceOnce(
    source,
    "    Number(diagnostics?.structures) < 3 ||\n    diagnostics?.storehouseCandidate !== 'procedural-project-owned' ||",
    "    Number(diagnostics?.structures) < 3 ||\n    diagnostics?.dwellingCandidate !== 'trellis-derived-generated-lod1' ||\n    Number(diagnostics?.dwellingLod) !== 1 ||\n    Number(diagnostics?.dwellingTriangles) !== 53_538 ||\n    diagnostics?.storehouseCandidate !== 'procedural-project-owned' ||",
    'final dwelling LOD gate',
  );
  source = replaceOnce(
    source,
    '    grassClumps: diagnostics.grassClumps,\n    storehouseCandidate: diagnostics.storehouseCandidate,',
    '    grassClumps: diagnostics.grassClumps,\n    dwellingCandidate: diagnostics.dwellingCandidate,\n    dwellingLod: diagnostics.dwellingLod,\n    dwellingTriangles: diagnostics.dwellingTriangles,\n    storehouseCandidate: diagnostics.storehouseCandidate,',
    'dwelling evidence output',
  );
  if (!source.includes("procedural-project-owned-readability-prototype")) {
    throw new Error('Inhabitant smoke gate disappeared during dwelling merge');
  }
  if (!source.includes('treeCandidateTriangles')) {
    throw new Error('Tree smoke gate disappeared during dwelling merge');
  }
  return source;
});

edit('docs/ASSET_MANIFEST.md', source => {
  const oldRow = '| Rectangular Boii dwelling | Original concept converted with Microsoft TRELLIS.2 official Hugging Face Space; MIT model/code reference | GLB; embedded 2048 × 2048 WebP base-color and metallic-roughness maps; `EXT_texture_webp` | 5,621,848 bytes; scaled bounds 8.002 × 4.5 × 5.443 m | 105,019 vertices; 99,298 triangles; no LOD | Boii dwelling candidate; noncommercial current project use | Integrated; GLB structure, finite attributes, index bounds and texture decoding passed; visual, historical and performance QA pending |';
  const newRow = '| Rectangular Boii dwelling | Original concept converted with Microsoft TRELLIS.2 official Hugging Face Space; MIT model/code reference | Source LOD0 GLB with embedded 2048 × 2048 WebP base-color and metallic-roughness maps; `EXT_texture_webp`; deterministic generated LOD1/LOD2 preserve embedded image bytes | Source 5,621,848 bytes; scaled bounds 8.002 × 4.5 × 5.443 m | LOD0 105,019 vertices / 99,298 tris preserved; generated LOD1 55,089 / 53,538; generated LOD2 34,205 / 31,286; generated GLBs are build outputs, not Git-tracked | Boii dwelling candidate; noncommercial current project use | LOD pipeline integrated for evaluation; benchmark uses generated LOD1. Deterministic GLB/hash/texture-preservation checks required in CI; historical/visual and actual-hardware acceptance remain open; `artGatePassed=false`. |';
  source = replaceOnce(source, oldRow, newRow, 'dwelling manifest row');
  source = replaceOnce(
    source,
    'Exact dwelling generation settings, hashes, geometry and validation are recorded in `assets/source/phase1/dwelling-receipt.json`.',
    'Exact dwelling generation settings, source hashes, geometry and validation are recorded in `assets/source/phase1/dwelling-receipt.json`; deterministic generated LOD settings/hashes/evidence are recorded in `assets/source/phase1/dwelling-lod-receipt.json`.',
    'dwelling LOD receipt reference',
  );
  if (!source.includes('Generic Boii adult inhabitant readability prototype')) {
    throw new Error('Current inhabitant manifest row disappeared during dwelling merge');
  }
  if (!source.includes('Mature central-European deciduous tree')) {
    throw new Error('Current tree manifest row disappeared during dwelling merge');
  }
  return source;
});

console.log('Dwelling LOD reconciliation patch applied without replacing current tree/inhabitant gates.');
