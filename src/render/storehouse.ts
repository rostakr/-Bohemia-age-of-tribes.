import { Color, Entity, StandardMaterial, type Application, type Mesh } from 'playcanvas';
import { createSurface, type MeshData } from './landscape';

export interface StorehouseGeometry {
  timber: MeshData;
  wattle: MeshData;
  daub: MeshData;
  thatch: MeshData;
  earth: MeshData;
}

export interface StorehouseStats {
  triangles: number;
  vertices: number;
  width: number;
  height: number;
  depth: number;
}

export interface ProceduralStorehouse {
  entity: Entity;
  meshes: Mesh[];
  materials: StandardMaterial[];
  stats: StorehouseStats;
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

function addQuad(data: MeshData, a: V3, b: V3, c: V3, d: V3): void {
  const ia = addVertex(data, a, [0, 0]);
  const ib = addVertex(data, b, [1, 0]);
  const ic = addVertex(data, c, [1, 1]);
  const id = addVertex(data, d, [0, 1]);
  data.indices.push(ia, ib, ic, ia, ic, id);
}

function addOrientedBox(
  data: MeshData,
  center: V3,
  halfX: number,
  halfY: number,
  halfZ: number,
  xAxis: V3 = [1, 0, 0],
  yAxis: V3 = [0, 1, 0],
  zAxis: V3 = [0, 0, 1],
): void {
  const corner = (sx: number, sy: number, sz: number): V3 => [
    center[0] + xAxis[0] * halfX * sx + yAxis[0] * halfY * sy + zAxis[0] * halfZ * sz,
    center[1] + xAxis[1] * halfX * sx + yAxis[1] * halfY * sy + zAxis[1] * halfZ * sz,
    center[2] + xAxis[2] * halfX * sx + yAxis[2] * halfY * sy + zAxis[2] * halfZ * sz,
  ];
  const p000 = corner(-1, -1, -1), p001 = corner(-1, -1, 1);
  const p010 = corner(-1, 1, -1), p011 = corner(-1, 1, 1);
  const p100 = corner(1, -1, -1), p101 = corner(1, -1, 1);
  const p110 = corner(1, 1, -1), p111 = corner(1, 1, 1);
  addQuad(data, p001, p101, p111, p011);
  addQuad(data, p100, p000, p010, p110);
  addQuad(data, p000, p001, p011, p010);
  addQuad(data, p101, p100, p110, p111);
  addQuad(data, p010, p011, p111, p110);
  addQuad(data, p000, p100, p101, p001);
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

function addCylinder(data: MeshData, a: V3, b: V3, radius: number, sections = 8): void {
  const axis = normalize([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
  const reference: V3 = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = normalize(cross(axis, reference));
  const v = normalize(cross(axis, u));
  const ringA: number[] = [];
  const ringB: number[] = [];
  for (let i = 0; i < sections; i++) {
    const angle = i / sections * Math.PI * 2;
    const ox = (u[0] * Math.cos(angle) + v[0] * Math.sin(angle)) * radius;
    const oy = (u[1] * Math.cos(angle) + v[1] * Math.sin(angle)) * radius;
    const oz = (u[2] * Math.cos(angle) + v[2] * Math.sin(angle)) * radius;
    ringA.push(addVertex(data, [a[0] + ox, a[1] + oy, a[2] + oz], [i / sections, 0]));
    ringB.push(addVertex(data, [b[0] + ox, b[1] + oy, b[2] + oz], [i / sections, 1]));
  }
  for (let i = 0; i < sections; i++) {
    const next = (i + 1) % sections;
    data.indices.push(ringA[i]!, ringB[i]!, ringB[next]!, ringA[i]!, ringB[next]!, ringA[next]!);
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

/**
 * Project-owned Phase 1 candidate, not a silent fallback for a missing production GLB.
 * The form follows the asset brief: raised 3 x 3 m timber/wattle storage, compact steep
 * thatch roof, simple door and restrained wear. It intentionally avoids masonry,
 * medieval half-timbering, Roman ornament and fantasy shorthand.
 */
export function createStorehouseGeometry(): StorehouseGeometry {
  const timber = emptyMesh();
  const wattle = emptyMesh();
  const daub = emptyMesh();
  const thatch = emptyMesh();
  const earth = emptyMesh();

  // Moisture-protected platform and joists.
  addOrientedBox(timber, [0, 0.48, 0], 1.525, 0.06, 1.525);
  for (const z of [-1.18, -0.4, 0.4, 1.18]) addOrientedBox(timber, [0, 0.34, z], 1.575, 0.08, 0.055);
  for (const x of [-1.25, -0.42, 0.42, 1.25]) addOrientedBox(timber, [x, 0.55, 0], 0.06, 0.06, 1.55);
  for (const x of [-1.28, 1.28]) for (const z of [-1.28, 1.28]) addOrientedBox(earth, [x, 0.08, z], 0.17, 0.08, 0.17);

  // Posts, rails and ridge/purlins.
  for (const x of [-1.38, 1.38]) for (const z of [-1.38, 1.38]) addCylinder(timber, [x, 0.12, z], [x, 2.08, z], 0.105, 12);
  for (const x of [-0.52, 0.52]) addCylinder(timber, [x, 0.48, -1.43], [x, 2.02, -1.43], 0.075, 10);
  for (const y of [0.58, 1.98]) {
    addCylinder(timber, [-1.4, y, -1.42], [1.4, y, -1.42], 0.065, 10);
    addCylinder(timber, [-1.4, y, 1.42], [1.4, y, 1.42], 0.065, 10);
    addCylinder(timber, [-1.42, y, -1.4], [-1.42, y, 1.4], 0.065, 10);
    addCylinder(timber, [1.42, y, -1.4], [1.42, y, 1.4], 0.065, 10);
  }
  addCylinder(timber, [0, 3.25, -1.72], [0, 3.25, 1.72], 0.09, 12);
  for (const [x, y] of [[-0.82, 2.65], [0.82, 2.65], [-1.45, 2.08], [1.45, 2.08]] as const) {
    addCylinder(timber, [x, y, -1.7], [x, y, 1.7], 0.07, 10);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    addCylinder(timber, [sx * 1.34, 0.62, sz * 1.34], [sx * 0.85, 1.25, sz * 1.34], 0.045, 8);
  }

  // Daub panels behind visible wattling; front is split around the door.
  addOrientedBox(daub, [-0.93, 1.25, -1.405], 0.38, 0.60, 0.0275);
  addOrientedBox(daub, [0.93, 1.25, -1.405], 0.38, 0.60, 0.0275);
  addOrientedBox(daub, [0, 1.82, -1.405], 0.51, 0.15, 0.0275);
  addOrientedBox(daub, [0, 1.27, 1.405], 1.36, 0.67, 0.0275);
  addOrientedBox(daub, [-1.405, 1.27, 0], 0.0275, 0.67, 1.36);
  addOrientedBox(daub, [1.405, 1.27, 0], 0.0275, 0.67, 1.36);

  // Wattle rods and stakes.
  for (let y = 0.67; y <= 1.94 + 1e-6; y += 0.115) {
    addCylinder(wattle, [-1.34, y, 1.425], [1.34, y, 1.425], 0.021, 8);
    addCylinder(wattle, [-1.425, y, -1.34], [-1.425, y, 1.34], 0.021, 8);
    addCylinder(wattle, [1.425, y, -1.34], [1.425, y, 1.34], 0.021, 8);
    if (y < 1.72) {
      addCylinder(wattle, [-1.34, y, -1.425], [-0.57, y, -1.425], 0.021, 8);
      addCylinder(wattle, [0.57, y, -1.425], [1.34, y, -1.425], 0.021, 8);
    } else {
      addCylinder(wattle, [-1.34, y, -1.425], [1.34, y, -1.425], 0.021, 8);
    }
  }
  for (let p = -1.20; p <= 1.20 + 1e-6; p += 0.30) {
    addCylinder(wattle, [p, 0.64, 1.43], [p, 1.94, 1.43], 0.018, 7);
    addCylinder(wattle, [-1.43, 0.64, p], [-1.43, 1.94, p], 0.018, 7);
    addCylinder(wattle, [1.43, 0.64, p], [1.43, 1.94, p], 0.018, 7);
    if (Math.abs(p) > 0.58) addCylinder(wattle, [p, 0.64, -1.43], [p, 1.70, -1.43], 0.018, 7);
  }

  // Rough plank door and two-step access.
  for (const x of [-0.42, -0.21, 0, 0.21, 0.42]) addOrientedBox(timber, [x, 1.13, -1.49], 0.09, 0.63, 0.0425);
  addOrientedBox(timber, [0, 0.79, -1.50], 0.49, 0.05, 0.05);
  addOrientedBox(timber, [0, 1.47, -1.50], 0.49, 0.05, 0.05);
  addOrientedBox(timber, [0, 0.32, -1.78], 0.55, 0.08, 0.24);
  addOrientedBox(timber, [0, 0.46, -1.61], 0.46, 0.07, 0.19);

  // Wattle gable infill.
  for (const z of [-1.425, 1.425]) for (let y = 2.08; y <= 3.13 + 1e-6; y += 0.11) {
    const half = Math.max(0.05, 1.48 * (3.25 - y) / (3.25 - 2.05));
    addCylinder(wattle, [-half, y, z], [half, y, z], 0.018, 7);
  }

  // Roof planes: local X follows slope, local Y is roof normal, local Z follows ridge.
  const eaveY = 2.05;
  const ridgeY = 3.25;
  const halfRun = 1.72;
  const rise = ridgeY - eaveY;
  const slope = Math.hypot(halfRun, rise);
  const angle = Math.atan2(rise, halfRun);
  const cos = Math.cos(angle), sin = Math.sin(angle);
  for (const side of [-1, 1]) {
    const xAxis: V3 = [side * cos, -sin, 0];
    const yAxis: V3 = [side * sin, cos, 0];
    addOrientedBox(
      thatch,
      [side * halfRun / 2, (ridgeY + eaveY) / 2, 0],
      (slope + 0.12) / 2,
      0.06,
      1.775,
      xAxis,
      yAxis,
      [0, 0, side],
    );
  }

  // Deterministic straw bundles give the roof a non-primitive silhouette at RTS range.
  const random = randomGenerator(20260917);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 360; i++) {
      const t = 0.02 + random() * 0.96;
      const z = -1.72 + random() * 3.44;
      const x = side * t * halfRun;
      const y = ridgeY - t * rise + (random() - 0.5) * 0.03;
      const length = 0.34 + random() * 0.28;
      const outward = side * cos * length;
      const down = sin * length;
      addCylinder(
        thatch,
        [x - outward * 0.45, y + down * 0.45, z],
        [x + outward * 0.55, y - down * 0.55, z],
        0.008 + random() * 0.006,
        8,
      );
    }
    for (let i = 0; i < 48; i++) {
      const z = -1.7 + i / 47 * 3.4;
      const x = side * (halfRun + 0.02 + (random() - 0.5) * 0.06);
      const y = eaveY + (random() - 0.5) * 0.06;
      addCylinder(thatch, [x, y, z], [x + side * 0.13, y - 0.22 - random() * 0.08, z], 0.01, 8);
    }
  }

  return { timber, wattle, daub, thatch, earth };
}

export function storehouseStats(geometry: StorehouseGeometry): StorehouseStats {
  const groups = Object.values(geometry);
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let vertices = 0, triangles = 0;
  for (const data of groups) {
    vertices += data.positions.length / 3;
    triangles += data.indices.length / 3;
    for (let i = 0; i < data.positions.length; i += 3) {
      minX = Math.min(minX, data.positions[i]!); maxX = Math.max(maxX, data.positions[i]!);
      minY = Math.min(minY, data.positions[i + 1]!); maxY = Math.max(maxY, data.positions[i + 1]!);
      minZ = Math.min(minZ, data.positions[i + 2]!); maxZ = Math.max(maxZ, data.positions[i + 2]!);
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

export function createBoiiStorehouse(app: Application): ProceduralStorehouse {
  const geometry = createStorehouseGeometry();
  const root = new Entity('Boii storehouse — procedural Phase 1 candidate');
  const definitions: Array<[keyof StorehouseGeometry, StandardMaterial]> = [
    ['timber', material('Storehouse weathered oak', new Color(0.34, 0.23, 0.13), 0.05)],
    ['wattle', material('Storehouse hazel wattle', new Color(0.43, 0.30, 0.14), 0.03)],
    ['daub', material('Storehouse pale clay daub', new Color(0.62, 0.53, 0.38), 0.02)],
    ['thatch', material('Storehouse straw thatch', new Color(0.49, 0.37, 0.15), 0.015)],
    ['earth', material('Storehouse packed earth', new Color(0.28, 0.20, 0.12), 0.01)],
  ];
  const meshes: Mesh[] = [];
  const materials: StandardMaterial[] = [];
  for (const [key, surfaceMaterial] of definitions) {
    const surface = createSurface(app, `Storehouse ${key}`, geometry[key], surfaceMaterial);
    root.addChild(surface.entity);
    meshes.push(surface.mesh);
    materials.push(surfaceMaterial);
  }
  return { entity: root, meshes, materials, stats: storehouseStats(geometry) };
}
