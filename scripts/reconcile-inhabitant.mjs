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

edit('src/render/benchmark-scene.ts', source => {
  source = replaceOnce(
    source,
    "import { createCentralEuropeanTree } from './tree.ts';",
    "import { createCentralEuropeanTree } from './tree.ts';\nimport { createBoiiInhabitantCandidate } from './inhabitant';",
    'inhabitant import',
  );
  source = replaceOnce(
    source,
    'export const USE_PROCEDURAL_TREE_CANDIDATE = true;',
    'export const USE_PROCEDURAL_TREE_CANDIDATE = true;\nexport const USE_PROCEDURAL_INHABITANT_CANDIDATE = true;',
    'inhabitant candidate flag',
  );
  source = replaceOnce(
    source,
    '  private treeTriangles = 0;',
    '  private treeTriangles = 0;\n  private inhabitantTriangles = 0;',
    'inhabitant triangle field',
  );

  const importedBlock = `    if (this.models.inhabitant && this.assets) {\n      const resource = await this.assets.model(this.models.inhabitant);\n      if (!this.active) return;\n      for (const [index, position] of [[-5,1],[-2,3],[4,-5],[-10,9],[12,1]].entries()) {\n        const [x, z] = position as [number, number];\n        const entity = instantiateAtHeight(resource, \`Inhabitant \${index + 1}\`, 1.68 + index * 0.025);\n        entity.setPosition(x, landscape.heightAt(x, z), z);\n        entity.setEulerAngles(0, index * 67, 0);\n        this.root!.addChild(entity);\n        this.inhabitants++;\n      }\n    }`;
  const candidateBlock = importedBlock + ` else if (USE_PROCEDURAL_INHABITANT_CANDIDATE && this.active && this.app && this.root) {\n      const candidate = createBoiiInhabitantCandidate(this.app);\n      this.meshes.push(candidate.mesh);\n      this.materials.push(candidate.material);\n      this.inhabitantTriangles = candidate.stats.triangles;\n      const positions: [number, number][] = [[-5, 1], [-2, 3], [4, -5], [-10, 9], [12, 1]];\n      for (const [index, [x, z]] of positions.entries()) {\n        const entity = index === 0 ? candidate.entity : candidate.entity.clone();\n        entity.name = \`Boii inhabitant readability prototype \${index + 1}\`;\n        const scale = 0.97 + index * 0.012;\n        entity.setLocalScale(scale, scale, scale);\n        entity.setPosition(x, landscape.heightAt(x, z), z);\n        entity.setEulerAngles(0, index * 67, 0);\n        this.root.addChild(entity);\n        this.inhabitants++;\n      }\n    }`;
  source = replaceOnce(source, importedBlock, candidateBlock, 'inhabitant population block');

  source = replaceOnce(
    source,
    '      inhabitants: this.inhabitants,\n      trees: this.trees,',
    "      inhabitants: this.inhabitants,\n      inhabitantCandidate: this.inhabitantTriangles > 0 ? 'procedural-project-owned-readability-prototype' : 'absent',\n      inhabitantTriangles: this.inhabitantTriangles,\n      trees: this.trees,",
    'inhabitant diagnostics',
  );
  source = replaceOnce(
    source,
    '    this.treeTriangles = 0;\n    this.app = undefined;',
    '    this.treeTriangles = 0;\n    this.inhabitantTriangles = 0;\n    this.app = undefined;',
    'inhabitant cleanup',
  );
  return source;
});

edit('package.json', source => replaceOnce(
  source,
  'scripts/check-workshop.mjs scripts/check-tree.mjs',
  'scripts/check-workshop.mjs scripts/check-tree.mjs scripts/check-inhabitant.mjs',
  'npm test inhabitant gate',
));

edit('scripts/browser-phase1-smoke.mjs', source => {
  source = replaceOnce(
    source,
    "diagnostics.treeCandidate === 'procedural-project-owned' &&\n      Number(diagnostics.treeCandidateTriangles) >= 15_000 &&\n      Number(diagnostics.trees) >= 24 &&",
    "diagnostics.treeCandidate === 'procedural-project-owned' &&\n      Number(diagnostics.treeCandidateTriangles) >= 15_000 &&\n      Number(diagnostics.trees) >= 24 &&\n      diagnostics.inhabitantCandidate === 'procedural-project-owned-readability-prototype' &&\n      Number(diagnostics.inhabitants) >= 5 &&\n      Number(diagnostics.inhabitantTriangles) >= 1_200 && Number(diagnostics.inhabitantTriangles) <= 3_000 &&",
    'healthy inhabitant smoke gate',
  );
  source = replaceOnce(
    source,
    "diagnostics?.treeCandidate !== 'procedural-project-owned' ||\n    Number(diagnostics?.treeCandidateTriangles) < 15_000 ||\n    Number(diagnostics?.trees) < 24",
    "diagnostics?.treeCandidate !== 'procedural-project-owned' ||\n    Number(diagnostics?.treeCandidateTriangles) < 15_000 ||\n    Number(diagnostics?.trees) < 24 ||\n    diagnostics?.inhabitantCandidate !== 'procedural-project-owned-readability-prototype' ||\n    Number(diagnostics?.inhabitants) < 5 ||\n    Number(diagnostics?.inhabitantTriangles) < 1_200 || Number(diagnostics?.inhabitantTriangles) > 3_000",
    'final inhabitant smoke gate',
  );
  source = replaceOnce(
    source,
    '    inhabitants: diagnostics.inhabitants,\n    trees: diagnostics.trees,',
    '    inhabitants: diagnostics.inhabitants,\n    inhabitantCandidate: diagnostics.inhabitantCandidate,\n    inhabitantTriangles: diagnostics.inhabitantTriangles,\n    trees: diagnostics.trees,',
    'inhabitant evidence output',
  );
  return source;
});

edit('index.html', source => replaceOnce(
  source,
  'Work in progress: dwelling plus project-owned storehouse, workshop and deciduous-tree candidates integrated; inhabitants pending.',
  'Work in progress: dwelling, storehouse, workshop, deciduous-tree composition and five project-owned low-poly inhabitant readability prototypes integrated.',
  'inhabitant UI note',
));

edit('docs/ASSET_MANIFEST.md', source => {
  const marker = '\nExact terrain paths, dimensions, published MD5 and SHA256 are recorded';
  const row = '\n| Generic Boii adult inhabitant readability prototype | Original project code `src/render/inhabitant.ts`; internal project work; no third-party mesh or texture | One shared procedural PlayCanvas mesh with vertex colours, cloned to five static benchmark inhabitants | Measured bounds 0.840 × 1.717 × 0.395 m | 910 vertices; 1,404 triangles per shared prototype; no rig/LOD. **Prototype deviation:** production brief remains 25k–50k triangles with one 2K atlas | One vertex-coloured non-metallic material | Boii / Late La Tène generic adult worker readability study | Integrated only as `procedural-project-owned-readability-prototype`; five static figures are intended to prove settlement scale/readability, not production character quality. `ADMITTED_MODELS.inhabitant` remains null; production GLB, visual/historical and actual-hardware acceptance remain pending; `artGatePassed=false`. |\n';
  if (!source.includes(marker)) throw new Error('Manifest receipt marker missing');
  source = source.replace(marker, row + marker);
  source = replaceOnce(
    source,
    'Exact procedural tree source, geometry/placement seeds, LOD plan and CI evidence are recorded in `assets/source/phase1/tree-receipt.json`. All images are retained',
    'Exact procedural tree source, geometry/placement seeds, LOD plan and CI evidence are recorded in `assets/source/phase1/tree-receipt.json`. Exact inhabitant prototype scope, production-brief deviation and reconciliation QA are recorded in `assets/source/phase1/inhabitant-study-receipt.json`. All images are retained',
    'manifest inhabitant receipt reference',
  );
  return source;
});

const receipt = {
  schema_version: 2,
  asset: 'Generic Boii adult inhabitant low-poly readability prototype',
  project: 'BOHEMIA: AGE OF TRIBES',
  updated: '2026-09-18',
  source: {
    type: 'original_project_code_with_prior_user_visual_reference',
    path: 'src/render/inhabitant.ts',
    third_party_mesh_or_texture: false,
    external_generator: null,
    cost: 0,
    reference_scope: 'Broad adult proportions and earth-tone tunic/trouser silhouette only; no source pixels/textures and no identity reproduction.',
  },
  design_basis: {
    culture: 'Boii / Late La Tene readability study',
    role: 'generic adult worker / settlement inhabitant',
    target_population: 5,
    production_brief: 'assets/source/PHASE1_ASSET_REQUESTS.md#boii_adult_workerglb',
    production_target: '1.72 m; 25k-50k triangles; one 2K atlas; rig optional for milestone',
    prototype_deviation: 'Current procedural prototype is intentionally only ~1.4k triangles with vertex colours and no texture atlas/rig. It must not be treated as satisfying the production character request.',
    historical_acceptance: 'pending',
  },
  runtime: {
    method: 'one shared procedural PlayCanvas mesh and shared vertex-colour material cloned across five static entities',
    production_glb_slot: null,
    rigged: false,
    animation: false,
    prototype_triangle_gate: '1200-3000',
    production_triangle_gate: '25000-50000 (not met by prototype by design)',
    target_height_metres: '1.65-1.80 prototype gate; 1.72 m production target',
  },
  handoff_evidence: {
    source_pull_request: 30,
    source_workflow_run: 35294218995,
    result: 'passed on superseded forest-base branch; used only as prior evidence before reconciliation',
    observed_inhabitants: 5,
    observed_prototype_triangles: 1404,
    observed_prototype_vertices: 910,
    observed_bounds_metres: { width: 0.8403896193541825, height: 1.7169999999999999, depth: 0.395 },
  },
  reconciled_validation: {
    status: 'pending current-branch CI',
  },
  admission: {
    candidate_integrated_on_branch: true,
    admitted_models_inhabitant: null,
    art_gate_passed: false,
    production_brief_satisfied: false,
    visual_acceptance: 'pending',
    historical_acceptance: 'pending',
    actual_hardware_performance: 'pending',
    production_asset_status: 'low_poly_readability_prototype_not_final',
  },
};
writeFileSync('assets/source/phase1/inhabitant-study-receipt.json', JSON.stringify(receipt, null, 2) + '\n', 'utf8');

console.log('Inhabitant reconciliation patch applied.');
