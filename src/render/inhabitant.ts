import { Color, Entity, StandardMaterial, type Application, type Mesh } from 'playcanvas';
import { createSurface, type MeshData } from './landscape';

type V3 = [number, number, number];
type RGBA = [number, number, number, number];

export interface InhabitantStats {
  triangles: number;
  vertices: number;
  width: number;
  height: number;
  depth: number;
}

export interface ProceduralInhabitant {
  entity: Entity;
  mesh: Mesh;
  material: StandardMaterial;
  stats: InhabitantStats;
}

const TUNIC: RGBA = [0.42, 0.30, 0.19, 1];
const TUNIC_DARK: RGBA = [0.32, 0.22, 0.14, 1];
const TROUSERS: RGBA = [0.20, 0.18, 0.15, 1];
const LEATHER: RGBA = [0.18, 0.105, 0.055, 1];
const SKIN: RGBA = [0.62, 0.43, 0.30, 1];
const HAIR: RGBA = [0.13, 0.085, 0.055, 1];

function meshData(): MeshData {
  return { positions: [], indices: [], uvs: [], colors: [] };
}

function addVertex(data: MeshData, p: V3, uv: [number, number], color: RGBA): number {
  const index = data.positions.length / 3;
  data.positions.push(p[0], p[1], p[2]);
  data.uvs.push(uv[0], uv[1]);
  data.colors!.push(color[0], color[1], color[2], color[3]);
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

function addTube(
  data: MeshData,
  a: V3,
  b: V3,
  radiusA: number,
  radiusB: number,
  color: RGBA,
  sections = 12,
): void {
  const axis = normalize([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
  const reference: V3 = Math.abs(axis[1]) < 0.92 ? [0, 1, 0] : [1, 0, 0];
  const u = normalize(cross(axis, reference));
  const v = normalize(cross(axis, u));
  const ringA: number[] = [];
  const ringB: number[] = [];

  for (let i = 0; i < sections; i++) {
    const angle = i / sections * Math.PI * 2;
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const da: V3 = [
      (u[0] * ca + v[0] * sa) * radiusA,
      (u[1] * ca + v[1] * sa) * radiusA,
      (u[2] * ca + v[2] * sa) * radiusA,
    ];
    const db: V3 = [
      (u[0] * ca + v[0] * sa) * radiusB,
      (u[1] * ca + v[1] * sa) * radiusB,
      (u[2] * ca + v[2] * sa) * radiusB,
    ];
    ringA.push(addVertex(data, [a[0] + da[0], a[1] + da[1], a[2] + da[2]], [i / sections, 0], color));
    ringB.push(addVertex(data, [b[0] + db[0], b[1] + db[1], b[2] + db[2]], [i / sections, 1], color));
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
  color: RGBA,
  lonSegments = 14,
  latRings = 7,
): void {
  const bottom = addVertex(
    data,
    [center[0], center[1] - radii[1], center[2]],
    [0.5, 0],
    color,
  );
  const rings: number[][] = [];
  for (let ring = 1; ring <= latRings; ring++) {
    const phi = -Math.PI / 2 + ring / (latRings + 1) * Math.PI;
    const y = center[1] + Math.sin(phi) * radii[1];
    const rr = Math.cos(phi);
    const row: number[] = [];
    for (let i = 0; i < lonSegments; i++) {
      const theta = i / lonSegments * Math.PI * 2;
      row.push(addVertex(
        data,
        [
          center[0] + Math.cos(theta) * radii[0] * rr,
          y,
          center[2] + Math.sin(theta) * radii[2] * rr,
        ],
        [i / lonSegments, ring / (latRings + 1)],
        color,
      ));
    }
    rings.push(row);
  }
  const top = addVertex(
    data,
    [center[0], center[1] + radii[1], center[2]],
    [0.5, 1],
    color,
  );

  const first = rings[0]!;
  for (let i = 0; i < lonSegments; i++) {
    const next = (i + 1) % lonSegments;
    data.indices.push(bottom, first[next]!, first[i]!);
  }
  for (let ring = 0; ring < rings.length - 1; ring++) {
    const lower = rings[ring]!;
    const upper = rings[ring + 1]!;
    for (let i = 0; i < lonSegments; i++) {
      const next = (i + 1) % lonSegments;
      data.indices.push(
        lower[i]!, upper[next]!, upper[i]!,
        lower[i]!, lower[next]!, upper[next]!,
      );
    }
  }
  const last = rings[rings.length - 1]!;
  for (let i = 0; i < lonSegments; i++) {
    const next = (i + 1) % lonSegments;
    data.indices.push(top, last[i]!, last[next]!);
  }
}

function addQuad(
  data: MeshData,
  a: V3,
  b: V3,
  c: V3,
  d: V3,
  color: RGBA,
): void {
  const ia = addVertex(data, a, [0, 0], color);
  const ib = addVertex(data, b, [1, 0], color);
  const ic = addVertex(data, c, [1, 1], color);
  const id = addVertex(data, d, [0, 1], color);
  data.indices.push(ia, ib, ic, ia, ic, id);
}

function addBox(
  data: MeshData,
  center: V3,
  half: V3,
  color: RGBA,
): void {
  const [hx, hy, hz] = half;
  const p = (x: number, y: number, z: number): V3 => [
    center[0] + x * hx,
    center[1] + y * hy,
    center[2] + z * hz,
  ];
  addQuad(data, p(-1,-1, 1), p( 1,-1, 1), p( 1, 1, 1), p(-1, 1, 1), color);
  addQuad(data, p( 1,-1,-1), p(-1,-1,-1), p(-1, 1,-1), p( 1, 1,-1), color);
  addQuad(data, p(-1,-1,-1), p(-1,-1, 1), p(-1, 1, 1), p(-1, 1,-1), color);
  addQuad(data, p( 1,-1, 1), p( 1,-1,-1), p( 1, 1,-1), p( 1, 1, 1), color);
  addQuad(data, p(-1, 1, 1), p( 1, 1, 1), p( 1, 1,-1), p(-1, 1,-1), color);
  addQuad(data, p(-1,-1,-1), p( 1,-1,-1), p( 1,-1, 1), p(-1,-1, 1), color);
}

function addTunic(data: MeshData): void {
  const sections = 16;
  const rings = [
    { y: 0.67, rx: 0.31, rz: 0.18, color: TUNIC_DARK },
    { y: 1.00, rx: 0.235, rz: 0.145, color: TUNIC },
    { y: 1.36, rx: 0.285, rz: 0.17, color: TUNIC },
    { y: 1.43, rx: 0.19, rz: 0.135, color: TUNIC },
  ] as const;
  const ids: number[][] = [];
  for (const [ringIndex, ring] of rings.entries()) {
    const row: number[] = [];
    for (let i = 0; i < sections; i++) {
      const angle = i / sections * Math.PI * 2;
      row.push(addVertex(
        data,
        [Math.cos(angle) * ring.rx, ring.y, Math.sin(angle) * ring.rz],
        [i / sections, ringIndex / (rings.length - 1)],
        ring.color,
      ));
    }
    ids.push(row);
  }
  for (let ring = 0; ring < ids.length - 1; ring++) {
    for (let i = 0; i < sections; i++) {
      const next = (i + 1) % sections;
      data.indices.push(
        ids[ring]![i]!, ids[ring + 1]![i]!, ids[ring + 1]![next]!,
        ids[ring]![i]!, ids[ring + 1]![next]!, ids[ring]![next]!,
      );
    }
  }
}

export function createBoiiInhabitantGeometry(): MeshData {
  const data = meshData();

  // Soft shoes and trousered legs.
  addBox(data, [-0.115, 0.075, 0.045], [0.095, 0.065, 0.17], LEATHER);
  addBox(data, [ 0.115, 0.075, 0.045], [0.095, 0.065, 0.17], LEATHER);
  addTube(data, [-0.115, 0.14, 0], [-0.115, 0.50, 0.01], 0.085, 0.105, TROUSERS, 12);
  addTube(data, [-0.115, 0.50, 0.01], [-0.105, 0.83, 0.015], 0.105, 0.12, TROUSERS, 12);
  addTube(data, [ 0.115, 0.14, 0], [ 0.115, 0.50,-0.01], 0.085, 0.105, TROUSERS, 12);
  addTube(data, [ 0.115, 0.50,-0.01], [ 0.105, 0.83,-0.015], 0.105, 0.12, TROUSERS, 12);

  // Knee-length tunic, simple leather belt, no armour or status jewellery.
  addTunic(data);
  addBox(data, [0, 1.005, 0], [0.245, 0.026, 0.155], LEATHER);
  addBox(data, [0.015, 0.91, 0.164], [0.018, 0.105, 0.013], LEATHER);

  // Relaxed arms in long sleeves and visible hands.
  addTube(data, [-0.265, 1.34, 0], [-0.325, 1.08, 0.018], 0.105, 0.085, TUNIC, 12);
  addTube(data, [-0.325, 1.08, 0.018], [-0.345, 0.87, 0.055], 0.085, 0.064, TUNIC, 12);
  addTube(data, [ 0.265, 1.34, 0], [ 0.325, 1.08,-0.018], 0.105, 0.085, TUNIC, 12);
  addTube(data, [ 0.325, 1.08,-0.018], [ 0.345, 0.87, 0.055], 0.085, 0.064, TUNIC, 12);
  addEllipsoid(data, [-0.35, 0.815, 0.065], [0.072, 0.105, 0.058], SKIN, 12, 6);
  addEllipsoid(data, [ 0.35, 0.815, 0.065], [0.072, 0.105, 0.058], SKIN, 12, 6);

  // Neck and generic adult head. Hair and beard are deliberately schematic so the
  // candidate cannot reproduce the identity of the visual-reference person.
  addTube(data, [0, 1.405, 0], [0, 1.48, 0], 0.075, 0.073, SKIN, 12);
  addEllipsoid(data, [0, 1.585, 0.015], [0.112, 0.142, 0.105], HAIR, 16, 8);
  addEllipsoid(data, [0, 1.575, 0.050], [0.094, 0.122, 0.086], SKIN, 16, 8);
  addEllipsoid(data, [0, 1.525, 0.116], [0.076, 0.070, 0.050], HAIR, 12, 6);
  addEllipsoid(data, [0, 1.583, 0.137], [0.018, 0.025, 0.026], SKIN, 10, 5);

  return data;
}

export function inhabitantStats(data: MeshData): InhabitantStats {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < data.positions.length; i += 3) {
    minX = Math.min(minX, data.positions[i]!);
    maxX = Math.max(maxX, data.positions[i]!);
    minY = Math.min(minY, data.positions[i + 1]!);
    maxY = Math.max(maxY, data.positions[i + 1]!);
    minZ = Math.min(minZ, data.positions[i + 2]!);
    maxZ = Math.max(maxZ, data.positions[i + 2]!);
  }
  return {
    triangles: data.indices.length / 3,
    vertices: data.positions.length / 3,
    width: maxX - minX,
    height: maxY - minY,
    depth: maxZ - minZ,
  };
}

/**
 * Static Phase 1 readability candidate only. The production character slot remains
 * reserved for a validated rigged/imported inhabitant later in the pipeline.
 */
export function createBoiiInhabitantCandidate(app: Application): ProceduralInhabitant {
  const geometry = createBoiiInhabitantGeometry();
  const material = new StandardMaterial();
  material.name = 'Boii inhabitant vertex-colour study';
  material.diffuse = new Color(1, 1, 1);
  material.diffuseVertexColor = true;
  material.useMetalness = true;
  material.metalness = 0;
  material.gloss = 0.04;
  material.update();

  const surface = createSurface(app, 'Boii adult inhabitant — procedural Phase 1 candidate', geometry, material);
  surface.entity.render!.meshInstances[0]!.castShadow = true;

  const root = new Entity('Boii adult inhabitant — procedural Phase 1 candidate');
  root.addChild(surface.entity);
  return {
    entity: root,
    mesh: surface.mesh,
    material,
    stats: inhabitantStats(geometry),
  };
}
