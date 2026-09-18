import { CULLFACE_NONE, Color, StandardMaterial, type Application } from 'playcanvas';
import {
  createSurface,
  landscape,
  pathCenter,
  randomGenerator,
  riverCenter,
  riverWidth,
  SETTLEMENT,
  type MeshData,
} from './landscape';

type P3 = [number, number, number];
type RGB = [number, number, number];

export interface TreeStudyGeometry {
  bark: MeshData;
  foliage: MeshData;
  trees: number;
  oaks: number;
  birches: number;
  triangles: number;
}

function cross(a: P3, b: P3): P3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize(v: P3): P3 {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

function lerpPoint(a: P3, b: P3, t: number): P3 {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function tint(base: RGB, amount: number): RGB {
  return [
    Math.max(0, Math.min(1, base[0] * amount)),
    Math.max(0, Math.min(1, base[1] * amount)),
    Math.max(0, Math.min(1, base[2] * amount)),
  ];
}

function addColor(data: MeshData, color: RGB, alpha = 1): void {
  data.colors!.push(color[0], color[1], color[2], alpha);
}

function addTube(data: MeshData, a: P3, b: P3, r0: number, r1: number, sides: number, color: RGB): void {
  const direction = normalize([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
  const reference: P3 = Math.abs(direction[1]) < 0.92 ? [0, 1, 0] : [1, 0, 0];
  const u = normalize(cross(direction, reference));
  const v = normalize(cross(direction, u));
  const start = data.positions.length / 3;

  for (let ring = 0; ring < 2; ring++) {
    const center = ring === 0 ? a : b;
    const radius = ring === 0 ? r0 : r1;
    for (let i = 0; i < sides; i++) {
      const angle = i / sides * Math.PI * 2;
      const ca = Math.cos(angle), sa = Math.sin(angle);
      data.positions.push(
        center[0] + (u[0] * ca + v[0] * sa) * radius,
        center[1] + (u[1] * ca + v[1] * sa) * radius,
        center[2] + (u[2] * ca + v[2] * sa) * radius,
      );
      data.uvs.push(i / sides, ring);
      addColor(data, color);
    }
  }

  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    const a0 = start + i;
    const a1 = start + next;
    const b0 = start + sides + i;
    const b1 = start + sides + next;
    data.indices.push(a0, b0, a1, a1, b0, b1);
  }
}

function addFoliageBlob(
  data: MeshData,
  center: P3,
  radii: P3,
  color: RGB,
  random: () => number,
  segments = 8,
): void {
  const bottom = data.positions.length / 3;
  data.positions.push(center[0], center[1] - radii[1], center[2]);
  data.uvs.push(0.5, 0);
  addColor(data, tint(color, 0.82 + random() * 0.08));

  const lower = data.positions.length / 3;
  for (let i = 0; i < segments; i++) {
    const angle = i / segments * Math.PI * 2;
    const wobble = 0.82 + random() * 0.28;
    data.positions.push(
      center[0] + Math.cos(angle) * radii[0] * wobble,
      center[1] - radii[1] * (0.28 + random() * 0.08),
      center[2] + Math.sin(angle) * radii[2] * wobble,
    );
    data.uvs.push(i / segments, 0.34);
    addColor(data, tint(color, 0.86 + random() * 0.18));
  }

  const upper = data.positions.length / 3;
  for (let i = 0; i < segments; i++) {
    const angle = (i + 0.5) / segments * Math.PI * 2;
    const wobble = 0.78 + random() * 0.3;
    data.positions.push(
      center[0] + Math.cos(angle) * radii[0] * wobble,
      center[1] + radii[1] * (0.3 + random() * 0.08),
      center[2] + Math.sin(angle) * radii[2] * wobble,
    );
    data.uvs.push((i + 0.5) / segments, 0.68);
    addColor(data, tint(color, 0.9 + random() * 0.16));
  }

  const top = data.positions.length / 3;
  data.positions.push(center[0], center[1] + radii[1], center[2]);
  data.uvs.push(0.5, 1);
  addColor(data, tint(color, 0.96 + random() * 0.08));

  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    data.indices.push(bottom, lower + i, lower + next);
    data.indices.push(lower + i, upper + i, lower + next, lower + next, upper + i, upper + next);
    data.indices.push(top, upper + next, upper + i);
  }
}

function validTreePosition(x: number, z: number): boolean {
  if (Math.abs(z - pathCenter(x)) < 5.5) return false;
  if (Math.abs(x - riverCenter(z)) < riverWidth(z) + 7.5) return false;
  if (SETTLEMENT.some(pad => Math.hypot(x - pad.x, z - pad.z) < pad.radius + 12)) return false;
  return true;
}

function addOak(
  bark: MeshData,
  foliage: MeshData,
  base: P3,
  scale: number,
  rotation: number,
  random: () => number,
): void {
  const height = (11.5 + random() * 4.5) * scale;
  const lean = (random() - 0.5) * 0.9 * scale;
  const leanZ = (random() - 0.5) * 0.9 * scale;
  const trunkTop: P3 = [base[0] + lean, base[1] + height * 0.56, base[2] + leanZ];
  const leaderTop: P3 = [
    trunkTop[0] + lean * 0.45,
    base[1] + height * 0.78,
    trunkTop[2] + leanZ * 0.45,
  ];
  const barkColor: RGB = tint([0.32, 0.27, 0.2], 0.84 + random() * 0.2);
  addTube(bark, base, trunkTop, 0.48 * scale, 0.24 * scale, 8, barkColor);
  addTube(bark, trunkTop, leaderTop, 0.24 * scale, 0.075 * scale, 7, tint(barkColor, 1.05));

  const leafBase: RGB = [0.31, 0.39, 0.2];
  for (let i = 0; i < 5; i++) {
    const angle = rotation + i / 5 * Math.PI * 2 + (random() - 0.5) * 0.45;
    const start = lerpPoint(base, trunkTop, 0.64 + i * 0.055);
    const length = (3.2 + random() * 1.9) * scale;
    const end: P3 = [
      start[0] + Math.cos(angle) * length,
      start[1] + height * (0.12 + random() * 0.08),
      start[2] + Math.sin(angle) * length,
    ];
    const twig: P3 = [
      end[0] + Math.cos(angle + (random() - 0.5) * 0.55) * length * 0.42,
      end[1] + height * (0.055 + random() * 0.05),
      end[2] + Math.sin(angle + (random() - 0.5) * 0.55) * length * 0.42,
    ];
    addTube(bark, start, end, 0.19 * scale, 0.07 * scale, 6, tint(barkColor, 1.03));
    addTube(bark, end, twig, 0.07 * scale, 0.028 * scale, 5, tint(barkColor, 1.08));
    addFoliageBlob(
      foliage,
      [end[0], end[1] + 0.65 * scale, end[2]],
      [(1.75 + random() * 0.65) * scale, (1.25 + random() * 0.5) * scale, (1.65 + random() * 0.65) * scale],
      tint(leafBase, 0.9 + random() * 0.18),
      random,
    );
    addFoliageBlob(
      foliage,
      [twig[0], twig[1] + 0.35 * scale, twig[2]],
      [(1.45 + random() * 0.55) * scale, (1.05 + random() * 0.45) * scale, (1.35 + random() * 0.55) * scale],
      tint(leafBase, 0.92 + random() * 0.16),
      random,
    );
  }

  for (let i = 0; i < 3; i++) {
    const angle = rotation + i / 3 * Math.PI * 2 + random() * 0.4;
    const radius = (0.9 + random() * 1.5) * scale;
    addFoliageBlob(
      foliage,
      [
        leaderTop[0] + Math.cos(angle) * radius,
        leaderTop[1] + (random() - 0.35) * 1.8 * scale,
        leaderTop[2] + Math.sin(angle) * radius,
      ],
      [(1.9 + random() * 0.6) * scale, (1.35 + random() * 0.5) * scale, (1.8 + random() * 0.6) * scale],
      tint(leafBase, 0.9 + random() * 0.18),
      random,
    );
  }
}

function addBirch(
  bark: MeshData,
  foliage: MeshData,
  base: P3,
  scale: number,
  rotation: number,
  random: () => number,
): void {
  const height = (8.5 + random() * 4.2) * scale;
  const lean = (random() - 0.5) * 0.55 * scale;
  const leanZ = (random() - 0.5) * 0.55 * scale;
  const trunkMid: P3 = [base[0] + lean * 0.55, base[1] + height * 0.58, base[2] + leanZ * 0.55];
  const trunkTop: P3 = [base[0] + lean, base[1] + height * 0.93, base[2] + leanZ];
  const barkColor: RGB = tint([0.72, 0.7, 0.64], 0.9 + random() * 0.12);
  addTube(bark, base, trunkMid, 0.22 * scale, 0.115 * scale, 7, barkColor);
  addTube(bark, trunkMid, trunkTop, 0.115 * scale, 0.035 * scale, 6, tint(barkColor, 1.04));

  const leafBase: RGB = [0.36, 0.47, 0.23];
  for (let i = 0; i < 5; i++) {
    const angle = rotation + i / 5 * Math.PI * 2 + (random() - 0.5) * 0.65;
    const start = lerpPoint(base, trunkTop, 0.38 + i * 0.105);
    const length = (1.7 + random() * 1.25) * scale;
    const end: P3 = [
      start[0] + Math.cos(angle) * length,
      start[1] + height * (0.08 + random() * 0.07),
      start[2] + Math.sin(angle) * length,
    ];
    addTube(bark, start, end, 0.075 * scale, 0.018 * scale, 5, tint(barkColor, 0.94 + random() * 0.08));
    addFoliageBlob(
      foliage,
      [end[0], end[1] - 0.12 * scale, end[2]],
      [(0.95 + random() * 0.5) * scale, (1.0 + random() * 0.55) * scale, (0.85 + random() * 0.45) * scale],
      tint(leafBase, 0.92 + random() * 0.2),
      random,
      7,
    );
  }

  addFoliageBlob(
    foliage,
    [trunkTop[0], trunkTop[1] - 0.4 * scale, trunkTop[2]],
    [1.1 * scale, 1.45 * scale, 1.05 * scale],
    tint(leafBase, 1.03),
    random,
    7,
  );
}

export function buildCentralEuropeanTreeStudy(seed = 271828, targetTrees = 36): TreeStudyGeometry {
  const random = randomGenerator(seed);
  const bark: MeshData = { positions: [], indices: [], uvs: [], colors: [] };
  const foliage: MeshData = { positions: [], indices: [], uvs: [], colors: [] };
  let trees = 0;
  let oaks = 0;
  let birches = 0;

  for (let attempt = 0; attempt < 1800 && trees < targetTrees; attempt++) {
    const x = -96 + random() * 154;
    const z = -86 + random() * 156;
    if (!validTreePosition(x, z)) continue;

    // Keep a readable forest edge rather than uniformly filling the benchmark.
    const edgeBias = x < -24 || z < -35 || (x < 18 && z > 32);
    if (!edgeBias && random() < 0.78) continue;

    const y = landscape.heightAt(x, z);
    const scale = 0.84 + random() * 0.32;
    const rotation = random() * Math.PI * 2;
    const oak = random() < 0.72;
    if (oak) {
      addOak(bark, foliage, [x, y, z], scale, rotation, random);
      oaks++;
    } else {
      addBirch(bark, foliage, [x, y, z], scale, rotation, random);
      birches++;
    }
    trees++;
  }

  if (trees !== targetTrees) throw new Error(`Could only place ${trees}/${targetTrees} procedural trees`);

  return {
    bark,
    foliage,
    trees,
    oaks,
    birches,
    triangles: (bark.indices.length + foliage.indices.length) / 3,
  };
}

/**
 * Evaluation vegetation authored for the Phase 1 benchmark.
 * This is not a silent substitute for a missing imported tree GLB: it is an explicit
 * deterministic tree-study layer whose historical/art acceptance remains open.
 */
export function createCentralEuropeanTreeStudy(app: Application) {
  const geometry = buildCentralEuropeanTreeStudy();

  const barkMaterial = new StandardMaterial();
  barkMaterial.name = 'Procedural Central-European bark';
  barkMaterial.diffuse = new Color(1, 1, 1);
  barkMaterial.diffuseVertexColor = true;
  barkMaterial.gloss = 0.08;
  barkMaterial.metalness = 0;
  barkMaterial.update();

  const foliageMaterial = new StandardMaterial();
  foliageMaterial.name = 'Procedural Central-European foliage';
  foliageMaterial.diffuse = new Color(1, 1, 1);
  foliageMaterial.diffuseVertexColor = true;
  foliageMaterial.gloss = 0.04;
  foliageMaterial.cull = CULLFACE_NONE;
  foliageMaterial.twoSidedLighting = true;
  foliageMaterial.update();

  const barkSurface = createSurface(app, 'Central-European tree bark study', geometry.bark, barkMaterial);
  const foliageSurface = createSurface(app, 'Central-European tree foliage study', geometry.foliage, foliageMaterial);

  return {
    ...geometry,
    surfaces: [barkSurface, foliageSurface],
    materials: [barkMaterial, foliageMaterial],
  };
}
