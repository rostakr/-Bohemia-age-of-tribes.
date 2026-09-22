import { Color, Entity, StandardMaterial, type Application, type Mesh } from 'playcanvas';
import { createSurface, type MeshData } from './landscape.ts';

export interface WorkshopGeometry {
  timber: MeshData;
  workwood: MeshData;
  thatch: MeshData;
  earth: MeshData;
  iron: MeshData;
}

export interface WorkshopStats {
  triangles: number;
  vertices: number;
  width: number;
  height: number;
  depth: number;
}

export interface ProceduralWorkshop {
  entity: Entity;
  meshes: Mesh[];
  materials: StandardMaterial[];
  stats: WorkshopStats;
}

type V3 = [number, number, number];

export const WORKSHOP_UV_REPEAT_METRES = 0.65;

function emptyMesh(): MeshData {
  return { positions: [], indices: [], uvs: [] };
}

function addVertex(data: MeshData, p: V3, uv: [number, number] = [0, 0]): number {
  const index = data.positions.length / 3;
  data.positions.push(p[0], p[1], p[2]);
  data.uvs.push(uv[0], uv[1]);
  return index;
}

function addQuad(data: MeshData, a: V3, b: V3, c: V3, d: V3, widthMetres: number, heightMetres: number): void {
  const u = widthMetres / WORKSHOP_UV_REPEAT_METRES;
  const v = heightMetres / WORKSHOP_UV_REPEAT_METRES;
  const ia = addVertex(data, a, [0, 0]);
  const ib = addVertex(data, b, [u, 0]);
  const ic = addVertex(data, c, [u, v]);
  const id = addVertex(data, d, [0, v]);
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
  addQuad(data, p001, p101, p111, p011, halfX * 2, halfY * 2);
  addQuad(data, p100, p000, p010, p110, halfX * 2, halfY * 2);
  addQuad(data, p000, p001, p011, p010, halfZ * 2, halfY * 2);
  addQuad(data, p101, p100, p110, p111, halfZ * 2, halfY * 2);
  addQuad(data, p010, p011, p111, p110, halfZ * 2, halfX * 2);
  addQuad(data, p000, p100, p101, p001, halfX * 2, halfZ * 2);
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
  const delta: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const length = Math.hypot(delta[0], delta[1], delta[2]);
  const axis = normalize(delta);
  const reference: V3 = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = normalize(cross(axis, reference));
  const v = normalize(cross(axis, u));
  const ringA: number[] = [];
  const ringB: number[] = [];
  const circumferenceRepeats = Math.PI * 2 * radius / WORKSHOP_UV_REPEAT_METRES;
  const lengthRepeats = length / WORKSHOP_UV_REPEAT_METRES;
  for (let i = 0; i <= sections; i++) {
    const fraction = i / sections;
    const angle = fraction * Math.PI * 2;
    const ox = (u[0] * Math.cos(angle) + v[0] * Math.sin(angle)) * radius;
    const oy = (u[1] * Math.cos(angle) + v[1] * Math.sin(angle)) * radius;
    const oz = (u[2] * Math.cos(angle) + v[2] * Math.sin(angle)) * radius;
    const texU = fraction * circumferenceRepeats;
    ringA.push(addVertex(data, [a[0] + ox, a[1] + oy, a[2] + oz], [texU, 0]));
    ringB.push(addVertex(data, [b[0] + ox, b[1] + oy, b[2] + oz], [texU, lengthRepeats]));
  }
  for (let i = 0; i < sections; i++) {
    data.indices.push(ringA[i]!, ringB[i]!, ringB[i + 1]!, ringA[i]!, ringB[i + 1]!, ringA[i + 1]!);
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
 * Project-owned Phase 1 candidate for the prepared craft-site pad.
 * Open-sided timber shelter with a steep thatch canopy, bench/trestles, split wood
 * and restrained axe/chisel/gouge silhouettes. It deliberately avoids a sawmill,
 * masonry, medieval framing, fantasy ornament and modern workshop equipment.
 */
export function createWorkshopGeometry(): WorkshopGeometry {
  const timber = emptyMesh();
  const workwood = emptyMesh();
  const thatch = emptyMesh();
  const earth = emptyMesh();
  const iron = emptyMesh();

  // Thin worn-earth patch with an irregular tapered boundary, not a raised slab.
  const center = addVertex(earth, [0, 0.018, 0]);
  const inner: number[] = [];
  const outer: number[] = [];
  for (let i = 0; i < 24; i++) {
    const angle = i / 24 * Math.PI * 2;
    const variation = 1 + 0.06 * Math.sin(i * 2.3);
    const x = Math.cos(angle) * 2.45 * variation;
    const z = Math.sin(angle) * 1.42 * variation;
    inner.push(addVertex(earth, [x * 0.83, 0.018, z * 0.83]));
    outer.push(addVertex(earth, [x, 0, z]));
  }
  for (let i = 0; i < 24; i++) {
    const n = (i + 1) % 24;
    earth.indices.push(center, inner[n]!, inner[i]!, inner[i]!, inner[n]!, outer[n]!, inner[i]!, outer[n]!, outer[i]!);
  }

  // Six principal posts: three bays along the 5 m ridge, fully open between them.
  for (const x of [-2.2, 0, 2.2]) {
    for (const z of [-1.22, 1.22]) {
      addCylinder(timber, [x, 0.03, z], [x, 2.35, z], 0.105, 12);
    }
  }

  // Eave beams and ridge.
  addCylinder(timber, [-2.48, 2.33, -1.25], [2.48, 2.33, -1.25], 0.085, 10);
  addCylinder(timber, [-2.48, 2.33, 1.25], [2.48, 2.33, 1.25], 0.085, 10);
  addCylinder(timber, [-2.58, 3.48, 0], [2.58, 3.48, 0], 0.09, 12);

  // Tie beams and diagonal braces.
  for (const x of [-2.2, 0, 2.2]) {
    addCylinder(timber, [x, 2.28, -1.25], [x, 2.28, 1.25], 0.065, 10);
  }
  for (const x of [-2.2, 2.2]) {
    addCylinder(timber, [x, 1.22, -1.22], [x + (x < 0 ? 0.65 : -0.65), 2.30, -1.22], 0.052, 9);
    addCylinder(timber, [x, 1.22, 1.22], [x + (x < 0 ? 0.65 : -0.65), 2.30, 1.22], 0.052, 9);
  }
  for (const x of [-1.1, 1.1]) {
    addCylinder(timber, [x, 2.34, -1.24], [x, 3.20, -0.28], 0.05, 9);
    addCylinder(timber, [x, 2.34, 1.24], [x, 3.20, 0.28], 0.05, 9);
  }

  // Workbench: heavy slab, four legs and lower stretcher.
  addOrientedBox(workwood, [0.55, 0.91, -0.55], 1.25, 0.09, 0.36);
  for (const x of [-0.48, 1.58]) {
    for (const z of [-0.78, -0.32]) {
      addCylinder(timber, [x, 0.04, z], [x, 0.82, z], 0.075, 9);
    }
  }
  addCylinder(timber, [-0.48, 0.36, -0.55], [1.58, 0.36, -0.55], 0.05, 8);

  // Two portable trestles.
  for (const x of [-1.55, 1.75]) {
    addCylinder(timber, [x - 0.42, 0.05, 0.72], [x - 0.16, 0.72, 0.72], 0.06, 8);
    addCylinder(timber, [x + 0.42, 0.05, 0.72], [x + 0.16, 0.72, 0.72], 0.06, 8);
    addCylinder(timber, [x - 0.42, 0.05, 1.08], [x - 0.16, 0.72, 1.08], 0.06, 8);
    addCylinder(timber, [x + 0.42, 0.05, 1.08], [x + 0.16, 0.72, 1.08], 0.06, 8);
    addOrientedBox(workwood, [x, 0.75, 0.90], 0.48, 0.055, 0.24);
  }

  // Split timber and rough stock around the rear edge.
  const random = randomGenerator(20260918);
  for (let i = 0; i < 24; i++) {
    const x = -2.0 + (i % 8) * 0.55 + (random() - 0.5) * 0.08;
    const layer = Math.floor(i / 8);
    const y = 0.12 + layer * 0.16;
    const z = 1.05 + (random() - 0.5) * 0.16;
    addOrientedBox(timber, [x, y, z], 0.24 + random() * 0.08, 0.055, 0.07);
  }
  for (let i = 0; i < 10; i++) {
    const x = -2.0 + i * 0.43;
    addCylinder(timber, [x, 0.08, 0.98], [x + 0.05, 0.12, 1.38], 0.045 + random() * 0.025, 8);
  }

  // Period-plausible woodworking silhouettes on / beside the bench:
  // axe, socketed chisel and gouge-like tool.
  addCylinder(timber, [1.25, 1.00, -0.62], [1.58, 1.48, -0.58], 0.025, 8);
  addOrientedBox(iron, [1.61, 1.51, -0.58], 0.12, 0.055, 0.035, [0.82, 0.57, 0], [-0.57, 0.82, 0], [0, 0, 1]);
  addOrientedBox(iron, [0.35, 1.03, -0.60], 0.18, 0.022, 0.025, [0.96, 0, 0.28], [0, 1, 0], [-0.28, 0, 0.96]);
  addCylinder(timber, [0.06, 1.02, -0.68], [0.27, 1.03, -0.62], 0.022, 8);
  addOrientedBox(iron, [-0.22, 1.04, -0.50], 0.16, 0.02, 0.02, [0.88, 0, -0.48], [0, 1, 0], [0.48, 0, 0.88]);
  addCylinder(timber, [-0.52, 1.03, -0.34], [-0.36, 1.04, -0.43], 0.021, 8);

  // Steep gable canopy, ridge along X. The local basis remains right-handed on both sides.
  const eaveY = 2.30;
  const ridgeY = 3.48;
  const halfRun = 1.62;
  const rise = ridgeY - eaveY;
  const slope = Math.hypot(halfRun, rise);
  const angle = Math.atan2(rise, halfRun);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (const side of [-1, 1]) {
    const xAxis: V3 = [1, 0, 0];
    const yAxis: V3 = [0, cos, side * sin];
    const zAxis: V3 = [0, -side * sin, cos];
    addOrientedBox(
      thatch,
      [0, (ridgeY + eaveY) / 2, side * halfRun / 2],
      2.62,
      0.065,
      (slope + 0.12) / 2,
      xAxis,
      yAxis,
      zAxis,
    );
  }

  // Dense deterministic straw bundles create a readable, non-primitive roof edge.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 600; i++) {
      const t = 0.12 + random() * 0.73;
      const x = -2.53 + random() * 5.06;
      const z = side * t * halfRun;
      const y = ridgeY - t * rise + 0.082 + (random() - 0.5) * 0.016;
      const length = 0.22 + random() * 0.12;
      const outward = side * cos * length;
      const down = sin * length;
      addCylinder(
        thatch,
        [x, y + down * 0.45, z - outward * 0.45],
        [x, y - down * 0.55, z + outward * 0.55],
        0.008 + random() * 0.006,
        8,
      );
    }
    for (let i = 0; i < 64; i++) {
      const x = -2.48 + i / 63 * 4.96;
      const z = side * (halfRun - 0.025);
      const y = eaveY + 0.06;
      addCylinder(thatch, [x, y, z], [x, y - 0.075 - random() * 0.015, z + side * 0.045], 0.013, 8);
    }
  }

  return { timber, workwood, thatch, earth, iron };
}

export function workshopStats(geometry: WorkshopGeometry): WorkshopStats {
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
  return {
    triangles,
    vertices,
    width: maxX - minX,
    height: maxY - minY,
    depth: maxZ - minZ,
  };
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

export function createBoiiWorkshop(app: Application): ProceduralWorkshop {
  const geometry = createWorkshopGeometry();
  const root = new Entity('Boii carpentry shelter — procedural Phase 1 candidate');
  const definitions: Array<[keyof WorkshopGeometry, StandardMaterial]> = [
    ['timber', material('Workshop weathered oak', new Color(0.32, 0.21, 0.12), 0.045)],
    ['workwood', material('Workshop worn work surfaces', new Color(0.56, 0.43, 0.29), 0.06)],
    ['thatch', material('Workshop straw thatch', new Color(0.50, 0.38, 0.16), 0.015)],
    ['earth', material('Workshop packed earth', new Color(0.29, 0.22, 0.14), 0.01)],
    ['iron', material('Workshop worked iron', new Color(0.18, 0.19, 0.18), 0.16)],
  ];
  definitions[4]![1].metalness = 0.65;
  definitions[4]![1].update();

  const meshes: Mesh[] = [];
  const materials: StandardMaterial[] = [];
  for (const [key, surfaceMaterial] of definitions) {
    const surface = createSurface(app, 'Workshop ' + key, geometry[key], surfaceMaterial);
    root.addChild(surface.entity);
    meshes.push(surface.mesh);
    materials.push(surfaceMaterial);
  }

  return { entity: root, meshes, materials, stats: workshopStats(geometry) };
}
