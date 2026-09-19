import type { MeshData } from './landscape.ts';

export type TreeLodLevel = 1 | 2;

export interface TreeLodGeometry {
  wood: MeshData;
  foliage: MeshData;
}

export interface TreeLodStats {
  triangles: number;
  vertices: number;
  width: number;
  height: number;
  depth: number;
}

type V3 = [number, number, number];

type LodProfile = {
  trunkSections: number;
  branchCount: number;
  primarySections: number;
  secondarySections: number;
  sideSections: number;
  sideBranches: 1 | 2;
  foliageCount: number;
  foliageLonSegments: number;
  foliageLatRings: number;
  crownRadius: number;
};

const LOD_PROFILES: Record<TreeLodLevel, LodProfile> = {
  1: {
    trunkSections: 10,
    branchCount: 16,
    primarySections: 8,
    secondarySections: 7,
    sideSections: 6,
    sideBranches: 2,
    foliageCount: 80,
    foliageLonSegments: 8,
    foliageLatRings: 4,
    crownRadius: 5.0,
  },
  2: {
    trunkSections: 8,
    branchCount: 8,
    primarySections: 6,
    secondarySections: 5,
    sideSections: 4,
    sideBranches: 1,
    foliageCount: 50,
    foliageLonSegments: 6,
    foliageLatRings: 3,
    crownRadius: 4.9,
  },
};

function emptyMesh(withColors = false): MeshData {
  return { positions: [], indices: [], uvs: [], ...(withColors ? { colors: [] } : {}) };
}

function addVertex(
  data: MeshData,
  p: V3,
  uv: [number, number] = [0, 0],
  color?: [number, number, number, number],
): number {
  const index = data.positions.length / 3;
  data.positions.push(p[0], p[1], p[2]);
  data.uvs.push(uv[0], uv[1]);
  if (data.colors) {
    const value = color ?? [1, 1, 1, 1];
    data.colors.push(value[0], value[1], value[2], value[3]);
  }
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
  sections: number,
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
    const offsetA: V3 = [
      (u[0] * ca + v[0] * sa) * radiusA,
      (u[1] * ca + v[1] * sa) * radiusA,
      (u[2] * ca + v[2] * sa) * radiusA,
    ];
    const offsetB: V3 = [
      (u[0] * ca + v[0] * sa) * radiusB,
      (u[1] * ca + v[1] * sa) * radiusB,
      (u[2] * ca + v[2] * sa) * radiusB,
    ];
    ringA.push(addVertex(data, [a[0] + offsetA[0], a[1] + offsetA[1], a[2] + offsetA[2]], [i / sections, 0]));
    ringB.push(addVertex(data, [b[0] + offsetB[0], b[1] + offsetB[1], b[2] + offsetB[2]], [i / sections, 1]));
  }

  for (let i = 0; i < sections; i++) {
    const next = (i + 1) % sections;
    data.indices.push(ringA[i]!, ringB[i]!, ringB[next]!, ringA[i]!, ringB[next]!, ringA[next]!);
  }
}

function addEllipsoid(
  data: MeshData,
  center: V3,
  radii: V3,
  color: [number, number, number, number],
  phase: number,
  lonSegments: number,
  latRings: number,
): void {
  const bottom = addVertex(data, [center[0], center[1] - radii[1], center[2]], [0.5, 0], color);
  const rings: number[][] = [];

  for (let ring = 1; ring <= latRings; ring++) {
    const phi = -Math.PI / 2 + ring / (latRings + 1) * Math.PI;
    const y = center[1] + Math.sin(phi) * radii[1];
    const ringRadius = Math.cos(phi);
    const vertices: number[] = [];
    for (let i = 0; i < lonSegments; i++) {
      const theta = i / lonSegments * Math.PI * 2;
      const warp = 1
        + 0.10 * Math.sin(theta * 3 + phase)
        + 0.055 * Math.cos(theta * 5 - phase * 0.73)
        + 0.04 * Math.sin(phi * 4 + phase * 1.31);
      const verticalWarp = 1 + 0.045 * Math.cos(theta * 4 + phase * 0.91);
      const x = center[0] + Math.cos(theta) * radii[0] * ringRadius * warp;
      const z = center[2] + Math.sin(theta) * radii[2] * ringRadius * (2 - warp);
      const warpedY = center[1] + (y - center[1]) * verticalWarp;
      vertices.push(addVertex(data, [x, warpedY, z], [i / lonSegments, ring / (latRings + 1)], color));
    }
    rings.push(vertices);
  }

  const top = addVertex(data, [center[0], center[1] + radii[1], center[2]], [0.5, 1], color);
  const first = rings[0]!;
  for (let i = 0; i < lonSegments; i++) {
    const next = (i + 1) % lonSegments;
    data.indices.push(bottom, first[i]!, first[next]!);
  }
  for (let ring = 0; ring < rings.length - 1; ring++) {
    const lower = rings[ring]!, upper = rings[ring + 1]!;
    for (let i = 0; i < lonSegments; i++) {
      const next = (i + 1) % lonSegments;
      data.indices.push(lower[i]!, upper[i]!, upper[next]!, lower[i]!, upper[next]!, lower[next]!);
    }
  }
  const last = rings[rings.length - 1]!;
  for (let i = 0; i < lonSegments; i++) {
    const next = (i + 1) % lonSegments;
    data.indices.push(top, last[next]!, last[i]!);
  }
}

function randomGenerator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function trunkPoint(y: number): V3 {
  return [
    0.10 * Math.sin(y * 0.73) + 0.035 * Math.sin(y * 1.81),
    y,
    0.08 * Math.cos(y * 0.61) - 0.03 * Math.sin(y * 1.37),
  ];
}

export function createCentralEuropeanTreeLodGeometry(level: TreeLodLevel): TreeLodGeometry {
  const profile = LOD_PROFILES[level];
  const wood = emptyMesh();
  const foliage = emptyMesh(true);
  const branchRandom = randomGenerator(202609180 + level * 17);
  const foliageRandom = randomGenerator(202609180 + level);

  const trunkHeights = [0, 1.8, 3.6, 5.2, 6.6, 7.8];
  const trunkRadii = [0.62, 0.55, 0.46, 0.37, 0.29, 0.21];
  for (let i = 0; i < trunkHeights.length - 1; i++) {
    addTaperedCylinder(
      wood,
      trunkPoint(trunkHeights[i]!),
      trunkPoint(trunkHeights[i + 1]!),
      trunkRadii[i]!,
      trunkRadii[i + 1]!,
      profile.trunkSections,
    );
  }

  for (let i = 0; i < profile.branchCount; i++) {
    const angle = i / profile.branchCount * Math.PI * 2 + (branchRandom() - 0.5) * 0.34;
    const startY = 3.6 + branchRandom() * 3.3;
    const start = trunkPoint(startY);
    const reach = 2.5 + branchRandom() * 2.2;
    const lift = 1.3 + branchRandom() * 2.3;
    const mid: V3 = [
      start[0] + Math.cos(angle) * reach * 0.52,
      start[1] + lift * 0.42,
      start[2] + Math.sin(angle) * reach * 0.52,
    ];
    const end: V3 = [
      start[0] + Math.cos(angle) * reach,
      start[1] + lift,
      start[2] + Math.sin(angle) * reach,
    ];
    const baseRadius = 0.15 + branchRandom() * 0.09;
    addTaperedCylinder(wood, start, mid, baseRadius, baseRadius * 0.72, profile.primarySections);
    addTaperedCylinder(wood, mid, end, baseRadius * 0.72, baseRadius * 0.34, profile.secondarySections);

    for (let sideIndex = 0; sideIndex < profile.sideBranches; sideIndex++) {
      const side = sideIndex === 0 ? -1 : 1;
      const sideAngle = angle + side * (0.38 + branchRandom() * 0.34);
      const sideStart: V3 = [
        mid[0] + (end[0] - mid[0]) * 0.22,
        mid[1] + (end[1] - mid[1]) * 0.22,
        mid[2] + (end[2] - mid[2]) * 0.22,
      ];
      const sideEnd: V3 = [
        sideStart[0] + Math.cos(sideAngle) * (1.05 + branchRandom() * 0.85),
        sideStart[1] + 0.65 + branchRandom() * 1.15,
        sideStart[2] + Math.sin(sideAngle) * (1.05 + branchRandom() * 0.85),
      ];
      addTaperedCylinder(wood, sideStart, sideEnd, baseRadius * 0.31, baseRadius * 0.12, profile.sideSections);
    }
  }

  for (let i = 0; i < profile.foliageCount; i++) {
    const vertical = foliageRandom();
    const y = 5.75 + vertical * 6.15;
    const crownProfile = 1 - Math.abs(vertical - 0.48) * 0.68;
    const maxRadius = profile.crownRadius * Math.max(0.45, crownProfile);
    const radial = Math.sqrt(foliageRandom()) * maxRadius;
    const angle = foliageRandom() * Math.PI * 2;
    const center: V3 = [
      Math.cos(angle) * radial + (foliageRandom() - 0.5) * 0.45,
      y + (foliageRandom() - 0.5) * 0.32,
      Math.sin(angle) * radial + (foliageRandom() - 0.5) * 0.45,
    ];
    const rx = 0.92 + foliageRandom() * 0.98;
    const ry = 0.68 + foliageRandom() * 0.82;
    const rz = 0.92 + foliageRandom() * 0.98;
    const shade = foliageRandom();
    const color: [number, number, number, number] = [
      0.075 + shade * 0.055,
      0.20 + shade * 0.12,
      0.055 + shade * 0.05,
      1,
    ];
    addEllipsoid(
      foliage,
      center,
      [rx, ry, rz],
      color,
      foliageRandom() * Math.PI * 2,
      profile.foliageLonSegments,
      profile.foliageLatRings,
    );
  }

  return { wood, foliage };
}

export function treeLodStats(geometry: TreeLodGeometry): TreeLodStats {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let triangles = 0, vertices = 0;

  for (const data of Object.values(geometry)) {
    triangles += data.indices.length / 3;
    vertices += data.positions.length / 3;
    for (let i = 0; i < data.positions.length; i += 3) {
      minX = Math.min(minX, data.positions[i]!);
      maxX = Math.max(maxX, data.positions[i]!);
      minY = Math.min(minY, data.positions[i + 1]!);
      maxY = Math.max(maxY, data.positions[i + 1]!);
      minZ = Math.min(minZ, data.positions[i + 2]!);
      maxZ = Math.max(maxZ, data.positions[i + 2]!);
    }
  }

  return {
    triangles,
    vertices,
    width: maxX - minX,
    height: maxY - minY,
    depth: maxZ - minZ,
  };
}
