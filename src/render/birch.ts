import { Color, Entity, StandardMaterial, type Application, type Mesh } from 'playcanvas';
import { createSurface, type MeshData } from './landscape.ts';

export interface BirchGeometry {
  lowerBark: MeshData;
  whiteBark: MeshData;
  twigs: MeshData;
  foliage: MeshData;
}

export interface BirchStats {
  triangles: number;
  vertices: number;
  width: number;
  height: number;
  depth: number;
}

export interface ProceduralBirch {
  entity: Entity;
  meshes: Mesh[];
  materials: StandardMaterial[];
  stats: BirchStats;
}

type V3 = [number, number, number];

function emptyMesh(): MeshData {
  return { positions: [], indices: [], uvs: [] };
}

function addVertex(data: MeshData, p: V3, uv: [number, number] = [0, 0]): number {
  const index = data.positions.length / 3;
  data.positions.push(p[0], p[1], p[2]);
  data.uvs.push(uv[0], uv[1]);
  return index;
}

function normalize(v: V3): V3 {
  const length = Math.hypot(v[0], v[1], v[2]);
  if (length <= 1e-8) throw new Error('Cannot normalize zero vector');
  return [v[0] / length, v[1] / length, v[2] / length];
}

function cross(a: V3, b: V3): V3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function addTaperedCylinder(
  data: MeshData,
  a: V3,
  b: V3,
  radiusA: number,
  radiusB: number,
  sections = 8,
): void {
  const axis = normalize([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
  const reference: V3 = Math.abs(axis[1]) < 0.92 ? [0, 1, 0] : [1, 0, 0];
  const u = normalize(cross(axis, reference));
  const v = normalize(cross(axis, u));
  const ringA: number[] = [];
  const ringB: number[] = [];
  for (let i = 0; i < sections; i++) {
    const angle = i / sections * Math.PI * 2;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const ax = (u[0] * ca + v[0] * sa) * radiusA;
    const ay = (u[1] * ca + v[1] * sa) * radiusA;
    const az = (u[2] * ca + v[2] * sa) * radiusA;
    const bx = (u[0] * ca + v[0] * sa) * radiusB;
    const by = (u[1] * ca + v[1] * sa) * radiusB;
    const bz = (u[2] * ca + v[2] * sa) * radiusB;
    ringA.push(addVertex(data, [a[0] + ax, a[1] + ay, a[2] + az], [i / sections, 0]));
    ringB.push(addVertex(data, [b[0] + bx, b[1] + by, b[2] + bz], [i / sections, 1]));
  }
  for (let i = 0; i < sections; i++) {
    const next = (i + 1) % sections;
    data.indices.push(ringA[i]!, ringB[i]!, ringB[next]!, ringA[i]!, ringB[next]!, ringA[next]!);
  }
}

function addLeafCluster(data: MeshData, center: V3, radius: number, stretchY: number, twist: number): void {
  const c = Math.cos(twist), s = Math.sin(twist);
  const px: V3 = [center[0] + radius * c, center[1], center[2] + radius * s];
  const nx: V3 = [center[0] - radius * c, center[1], center[2] - radius * s];
  const pz: V3 = [center[0] - radius * s, center[1], center[2] + radius * c];
  const nz: V3 = [center[0] + radius * s, center[1], center[2] - radius * c];
  const top: V3 = [center[0], center[1] + stretchY, center[2]];
  const bottom: V3 = [center[0], center[1] - stretchY, center[2]];
  const ids = [px, nx, pz, nz, top, bottom].map((p, index) => addVertex(data, p, [index % 2, index < 4 ? 0.5 : index === 4 ? 1 : 0]));
  const [a,b,c0,d,t,bt] = ids;
  data.indices.push(
    a!, c0!, t!, c0!, b!, t!, b!, d!, t!, d!, a!, t!,
    c0!, a!, bt!, b!, c0!, bt!, d!, b!, bt!, a!, d!, bt!,
  );
}

function randomGenerator(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Project-owned young silver-birch candidate for the Phase 1 Bohemian valley.
 * The silhouette deliberately uses a slender trunk, pale upper bark, open irregular
 * crown and drooping higher-order twigs rather than a dense spherical fantasy tree.
 */
export function createYoungBirchGeometry(): BirchGeometry {
  const lowerBark = emptyMesh();
  const whiteBark = emptyMesh();
  const twigs = emptyMesh();
  const foliage = emptyMesh();
  const random = randomGenerator(20260918);

  const height = 12.6;
  const trunkPoints: V3[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    trunkPoints.push([
      Math.sin(t * 3.4) * 0.10 * t,
      height * t,
      Math.sin(t * 2.2 + 0.8) * 0.075 * t,
    ]);
  }

  for (let i = 0; i < 10; i++) {
    const t0 = i / 10;
    const t1 = (i + 1) / 10;
    const r0 = 0.245 * (1 - t0 * 0.72);
    const r1 = 0.245 * (1 - t1 * 0.72);
    addTaperedCylinder(i < 2 ? lowerBark : whiteBark, trunkPoints[i]!, trunkPoints[i + 1]!, r0, r1, 12);
  }

  const branchTips: V3[] = [];
  for (let i = 0; i < 34; i++) {
    const baseT = 0.24 + random() * 0.64;
    const baseY = height * baseT;
    const trunkX = Math.sin(baseT * 3.4) * 0.10 * baseT;
    const trunkZ = Math.sin(baseT * 2.2 + 0.8) * 0.075 * baseT;
    const angle = random() * Math.PI * 2;
    const crownFactor = Math.sin(Math.PI * Math.min(1, Math.max(0, (baseT - 0.20) / 0.78)));
    const length = (1.35 + random() * 2.15) * (0.45 + crownFactor * 0.75);
    const rise = 0.35 + random() * 0.95 - Math.max(0, baseT - 0.72) * 1.2;
    const base: V3 = [trunkX, baseY, trunkZ];
    const mid: V3 = [
      base[0] + Math.cos(angle) * length * 0.55,
      base[1] + rise * 0.72,
      base[2] + Math.sin(angle) * length * 0.55,
    ];
    const tip: V3 = [
      base[0] + Math.cos(angle) * length,
      base[1] + rise - (0.18 + random() * 0.48),
      base[2] + Math.sin(angle) * length,
    ];
    const radius = 0.055 + (1 - baseT) * 0.055;
    addTaperedCylinder(twigs, base, mid, radius, radius * 0.62, 9);
    addTaperedCylinder(twigs, mid, tip, radius * 0.62, radius * 0.22, 8);
    branchTips.push(tip);

    for (let j = 0; j < 2; j++) {
      const side = j === 0 ? -1 : 1;
      const sideAngle = angle + side * (0.55 + random() * 0.35);
      const origin: V3 = [
        mid[0] + (tip[0] - mid[0]) * (0.25 + random() * 0.35),
        mid[1] + (tip[1] - mid[1]) * (0.25 + random() * 0.35),
        mid[2] + (tip[2] - mid[2]) * (0.25 + random() * 0.35),
      ];
      const sideLength = length * (0.26 + random() * 0.22);
      const sideTip: V3 = [
        origin[0] + Math.cos(sideAngle) * sideLength,
        origin[1] - 0.20 - random() * 0.55,
        origin[2] + Math.sin(sideAngle) * sideLength,
      ];
      addTaperedCylinder(twigs, origin, sideTip, radius * 0.30, 0.012, 7);
      branchTips.push(sideTip);
    }
  }

  // Higher-order pendent twigs.
  for (let i = 0; i < 90; i++) {
    const origin = branchTips[Math.floor(random() * branchTips.length)]!;
    const angle = random() * Math.PI * 2;
    const length = 0.35 + random() * 0.75;
    const tip: V3 = [
      origin[0] + Math.cos(angle) * length * 0.45,
      origin[1] - length,
      origin[2] + Math.sin(angle) * length * 0.45,
    ];
    addTaperedCylinder(twigs, origin, tip, 0.014, 0.006, 6);
    branchTips.push(tip);
  }

  // Small merged leaf-clusters: enough irregularity for RTS silhouette while keeping
  // foliage to a single mesh/material rather than hundreds of entities.
  for (let i = 0; i < 1600; i++) {
    const anchor = branchTips[Math.floor(random() * branchTips.length)]!;
    const center: V3 = [
      anchor[0] + (random() - 0.5) * 0.72,
      Math.max(2.7, anchor[1] + (random() - 0.5) * 0.72),
      anchor[2] + (random() - 0.5) * 0.72,
    ];
    const radius = 0.13 + random() * 0.16;
    const stretchY = 0.11 + random() * 0.18;
    addLeafCluster(foliage, center, radius, stretchY, random() * Math.PI);
  }

  return { lowerBark, whiteBark, twigs, foliage };
}

export function birchStats(geometry: BirchGeometry): BirchStats {
  const groups = Object.values(geometry);
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let vertices = 0, triangles = 0;
  for (const data of groups) {
    vertices += data.positions.length / 3;
    triangles += data.indices.length / 3;
    for (let i = 0; i < data.positions.length; i += 3) {
      minX = Math.min(minX, data.positions[i]!);
      maxX = Math.max(maxX, data.positions[i]!);
      minY = Math.min(minY, data.positions[i + 1]!);
      maxY = Math.max(maxY, data.positions[i + 1]!);
      minZ = Math.min(minZ, data.positions[i + 2]!);
      maxZ = Math.max(maxZ, data.positions[i + 2]!);
    }
  }
  return { triangles, vertices, width: maxX - minX, height: maxY - minY, depth: maxZ - minZ };
}

function material(name: string, color: Color, gloss = 0.04): StandardMaterial {
  const value = new StandardMaterial();
  value.name = name;
  value.diffuse = color;
  value.gloss = gloss;
  value.useMetalness = true;
  value.metalness = 0;
  value.update();
  return value;
}

export function createYoungBirchPrototype(app: Application): ProceduralBirch {
  const geometry = createYoungBirchGeometry();
  const root = new Entity('Young silver birch — procedural Phase 1 candidate');
  const definitions: Array<[keyof BirchGeometry, StandardMaterial]> = [
    ['lowerBark', material('Birch lower fissured bark', new Color(0.18, 0.16, 0.14), 0.02)],
    ['whiteBark', material('Birch pale bark', new Color(0.72, 0.70, 0.64), 0.04)],
    ['twigs', material('Birch fine branches', new Color(0.22, 0.17, 0.12), 0.025)],
    ['foliage', material('Birch summer foliage', new Color(0.23, 0.42, 0.16), 0.015)],
  ];
  const meshes: Mesh[] = [];
  const materials: StandardMaterial[] = [];
  for (const [key, surfaceMaterial] of definitions) {
    const surface = createSurface(app, 'Birch ' + key, geometry[key], surfaceMaterial);
    root.addChild(surface.entity);
    meshes.push(surface.mesh);
    materials.push(surfaceMaterial);
  }
  return { entity: root, meshes, materials, stats: birchStats(geometry) };
}
