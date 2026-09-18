import { Color, Entity, StandardMaterial, type Application, type Mesh } from 'playcanvas';
import { createSurface, type MeshData } from './landscape.ts';

export interface TreeGeometry {
  wood: MeshData;
  foliage: MeshData;
}

export interface TreeStats {
  triangles: number;
  vertices: number;
  width: number;
  height: number;
  depth: number;
}

export interface ProceduralTree {
  entity: Entity;
  meshes: Mesh[];
  materials: StandardMaterial[];
  stats: TreeStats;
}

type V3 = [number, number, number];

function emptyMesh(withColors = false): MeshData {
  return { positions: [], indices: [], uvs: [], ...(withColors ? { colors: [] } : {}) };
}

function addVertex(data: MeshData, p: V3, uv: [number, number] = [0, 0], color?: [number, number, number, number]): number {
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
  sections = 10,
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
    const oxA = (u[0] * ca + v[0] * sa) * radiusA;
    const oyA = (u[1] * ca + v[1] * sa) * radiusA;
    const ozA = (u[2] * ca + v[2] * sa) * radiusA;
    const oxB = (u[0] * ca + v[0] * sa) * radiusB;
    const oyB = (u[1] * ca + v[1] * sa) * radiusB;
    const ozB = (u[2] * ca + v[2] * sa) * radiusB;
    ringA.push(addVertex(data, [a[0] + oxA, a[1] + oyA, a[2] + ozA], [i / sections, 0]));
    ringB.push(addVertex(data, [b[0] + oxB, b[1] + oyB, b[2] + ozB], [i / sections, 1]));
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
  lonSegments = 10,
  latRings = 5,
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
      const x = center[0] + Math.cos(theta) * radii[0] * ringRadius;
      const z = center[2] + Math.sin(theta) * radii[2] * ringRadius;
      vertices.push(addVertex(data, [x, y, z], [i / lonSegments, ring / (latRings + 1)], color));
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
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function trunkPoint(y: number): V3 {
  return [
    0.10 * Math.sin(y * 0.73) + 0.035 * Math.sin(y * 1.81),
    y,
    0.08 * Math.cos(y * 0.61) - 0.03 * Math.sin(y * 1.37),
  ];
}

/**
 * Project-owned mature deciduous-tree candidate for the Phase 1 Bohemian benchmark.
 * The broad irregular crown and stout branching are intentionally oak-like without
 * claiming botanical or historical art acceptance. Runtime uses shared cloned meshes.
 */
export function createCentralEuropeanTreeGeometry(): TreeGeometry {
  const wood = emptyMesh();
  const foliage = emptyMesh(true);
  const random = randomGenerator(20260918);

  const trunkHeights = [0, 1.8, 3.6, 5.2, 6.6, 7.8];
  const trunkRadii = [0.62, 0.55, 0.46, 0.37, 0.29, 0.21];
  for (let i = 0; i < trunkHeights.length - 1; i++) {
    addTaperedCylinder(
      wood,
      trunkPoint(trunkHeights[i]!),
      trunkPoint(trunkHeights[i + 1]!),
      trunkRadii[i]!,
      trunkRadii[i + 1]!,
      14,
    );
  }

  // Primary and secondary boughs give the silhouette readable structure beneath the crown.
  for (let i = 0; i < 20; i++) {
    const angle = i / 20 * Math.PI * 2 + (random() - 0.5) * 0.34;
    const startY = 3.6 + random() * 3.3;
    const start = trunkPoint(startY);
    const reach = 2.5 + random() * 2.2;
    const lift = 1.3 + random() * 2.3;
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
    const baseRadius = 0.15 + random() * 0.09;
    addTaperedCylinder(wood, start, mid, baseRadius, baseRadius * 0.72, 11);
    addTaperedCylinder(wood, mid, end, baseRadius * 0.72, baseRadius * 0.34, 9);

    for (const side of [-1, 1]) {
      const sideAngle = angle + side * (0.38 + random() * 0.34);
      const sideStart: V3 = [
        mid[0] + (end[0] - mid[0]) * 0.22,
        mid[1] + (end[1] - mid[1]) * 0.22,
        mid[2] + (end[2] - mid[2]) * 0.22,
      ];
      const sideEnd: V3 = [
        sideStart[0] + Math.cos(sideAngle) * (1.05 + random() * 0.85),
        sideStart[1] + 0.65 + random() * 1.15,
        sideStart[2] + Math.sin(sideAngle) * (1.05 + random() * 0.85),
      ];
      addTaperedCylinder(wood, sideStart, sideEnd, baseRadius * 0.31, baseRadius * 0.12, 8);
    }
  }

  // Broad, irregular summer canopy. Clumps overlap on purpose to read as dense foliage
  // at an RTS camera distance without alpha-tested external textures.
  for (let i = 0; i < 145; i++) {
    const vertical = random();
    const y = 5.75 + vertical * 6.15;
    const crownProfile = 1 - Math.abs(vertical - 0.48) * 0.68;
    const maxRadius = 5.15 * Math.max(0.45, crownProfile);
    const radial = Math.sqrt(random()) * maxRadius;
    const angle = random() * Math.PI * 2;
    const center: V3 = [
      Math.cos(angle) * radial + (random() - 0.5) * 0.45,
      y + (random() - 0.5) * 0.32,
      Math.sin(angle) * radial + (random() - 0.5) * 0.45,
    ];
    const rx = 0.66 + random() * 0.72;
    const ry = 0.48 + random() * 0.70;
    const rz = 0.66 + random() * 0.72;
    const shade = random();
    const color: [number, number, number, number] = [
      0.13 + shade * 0.07,
      0.30 + shade * 0.15,
      0.10 + shade * 0.07,
      1,
    ];
    addEllipsoid(foliage, center, [rx, ry, rz], color, 10, 5);
  }

  return { wood, foliage };
}

export function treeStats(geometry: TreeGeometry): TreeStats {
  const groups = Object.values(geometry);
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let triangles = 0, vertices = 0;
  for (const data of groups) {
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

function makeMaterial(name: string, color: Color, gloss: number): StandardMaterial {
  const material = new StandardMaterial();
  material.name = name;
  material.diffuse = color;
  material.gloss = gloss;
  material.useMetalness = true;
  material.metalness = 0;
  material.update();
  return material;
}

export function createCentralEuropeanTree(app: Application): ProceduralTree {
  const geometry = createCentralEuropeanTreeGeometry();
  const root = new Entity('Central European mature deciduous tree — procedural Phase 1 candidate');

  const woodMaterial = makeMaterial('Tree bark', new Color(0.20, 0.14, 0.085), 0.035);
  const foliageMaterial = makeMaterial('Summer foliage', new Color(1, 1, 1), 0.018);
  foliageMaterial.diffuseVertexColor = true;
  foliageMaterial.update();

  const wood = createSurface(app, 'Tree wood', geometry.wood, woodMaterial);
  const foliage = createSurface(app, 'Tree foliage', geometry.foliage, foliageMaterial);
  for (const surface of [wood, foliage]) {
    surface.entity.render!.meshInstances[0]!.castShadow = true;
    root.addChild(surface.entity);
  }

  return {
    entity: root,
    meshes: [wood.mesh, foliage.mesh],
    materials: [woodMaterial, foliageMaterial],
    stats: treeStats(geometry),
  };
}
