export interface WorkerMeshData {
  positions: number[];
  indices: number[];
  uvs: number[];
}

export interface WorkerStats {
  triangles: number;
  vertices: number;
  width: number;
  height: number;
  depth: number;
}

type V3 = [number, number, number];
type Rect = [number, number, number, number];

const ATLAS_INSET = 0.006;

export const WORKER_ATLAS_RECTS = {
  tunic: [0, 0, 1 / 3, 1 / 2] as Rect,
  trousers: [1 / 3, 0, 2 / 3, 1 / 2] as Rect,
  leather: [2 / 3, 0, 1, 1 / 2] as Rect,
  skin: [0, 1 / 2, 1 / 3, 1] as Rect,
  hair: [1 / 3, 1 / 2, 2 / 3, 1] as Rect,
  accent: [2 / 3, 1 / 2, 1, 1] as Rect,
} as const;

function emptyMesh(): WorkerMeshData {
  return { positions: [], indices: [], uvs: [] };
}

function atlasUv(rect: Rect, u: number, v: number): [number, number] {
  const [u0, v0, u1, v1] = rect;
  const iu0 = u0 + ATLAS_INSET;
  const iv0 = v0 + ATLAS_INSET;
  const iu1 = u1 - ATLAS_INSET;
  const iv1 = v1 - ATLAS_INSET;
  return [iu0 + (iu1 - iu0) * u, iv0 + (iv1 - iv0) * v];
}

function addVertex(data: WorkerMeshData, p: V3, uv: [number, number]): number {
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

function addTube(
  data: WorkerMeshData,
  a: V3,
  b: V3,
  radiusA: number,
  radiusB: number,
  rect: Rect,
  sections = 32,
): void {
  const axis = normalize([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
  const reference: V3 = Math.abs(axis[1]) < 0.92 ? [0, 1, 0] : [1, 0, 0];
  const uAxis = normalize(cross(axis, reference));
  const vAxis = normalize(cross(axis, uAxis));
  const ringA: number[] = [];
  const ringB: number[] = [];
  for (let i = 0; i <= sections; i++) {
    const t = i / sections;
    const angle = t * Math.PI * 2;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const da: V3 = [
      (uAxis[0] * ca + vAxis[0] * sa) * radiusA,
      (uAxis[1] * ca + vAxis[1] * sa) * radiusA,
      (uAxis[2] * ca + vAxis[2] * sa) * radiusA,
    ];
    const db: V3 = [
      (uAxis[0] * ca + vAxis[0] * sa) * radiusB,
      (uAxis[1] * ca + vAxis[1] * sa) * radiusB,
      (uAxis[2] * ca + vAxis[2] * sa) * radiusB,
    ];
    ringA.push(addVertex(data, [a[0] + da[0], a[1] + da[1], a[2] + da[2]], atlasUv(rect, t, 0)));
    ringB.push(addVertex(data, [b[0] + db[0], b[1] + db[1], b[2] + db[2]], atlasUv(rect, t, 1)));
  }
  for (let i = 0; i < sections; i++) {
    data.indices.push(ringA[i]!, ringB[i]!, ringB[i + 1]!, ringA[i]!, ringB[i + 1]!, ringA[i + 1]!);
  }
}

function addEllipsoid(
  data: WorkerMeshData,
  center: V3,
  radii: V3,
  rect: Rect,
  lonSegments: number,
  latRings: number,
): void {
  const bottom = addVertex(data, [center[0], center[1] - radii[1], center[2]], atlasUv(rect, 0.5, 0));
  const rings: number[][] = [];
  for (let ring = 1; ring <= latRings; ring++) {
    const phi = -Math.PI / 2 + ring / (latRings + 1) * Math.PI;
    const y = center[1] + Math.sin(phi) * radii[1];
    const rr = Math.cos(phi);
    const row: number[] = [];
    for (let i = 0; i <= lonSegments; i++) {
      const t = i / lonSegments;
      const theta = t * Math.PI * 2;
      row.push(addVertex(data, [
        center[0] + Math.cos(theta) * radii[0] * rr,
        y,
        center[2] + Math.sin(theta) * radii[2] * rr,
      ], atlasUv(rect, t, ring / (latRings + 1))));
    }
    rings.push(row);
  }
  const top = addVertex(data, [center[0], center[1] + radii[1], center[2]], atlasUv(rect, 0.5, 1));
  const first = rings[0]!;
  for (let i = 0; i < lonSegments; i++) data.indices.push(bottom, first[i + 1]!, first[i]!);
  for (let ring = 0; ring < rings.length - 1; ring++) {
    const lower = rings[ring]!, upper = rings[ring + 1]!;
    for (let i = 0; i < lonSegments; i++) {
      data.indices.push(lower[i]!, upper[i + 1]!, upper[i]!, lower[i]!, lower[i + 1]!, upper[i + 1]!);
    }
  }
  const last = rings[rings.length - 1]!;
  for (let i = 0; i < lonSegments; i++) data.indices.push(top, last[i]!, last[i + 1]!);
}

function addQuad(data: WorkerMeshData, a: V3, b: V3, c: V3, d: V3, rect: Rect): void {
  const ia = addVertex(data, a, atlasUv(rect, 0, 0));
  const ib = addVertex(data, b, atlasUv(rect, 1, 0));
  const ic = addVertex(data, c, atlasUv(rect, 1, 1));
  const id = addVertex(data, d, atlasUv(rect, 0, 1));
  data.indices.push(ia, ib, ic, ia, ic, id);
}

function addBox(data: WorkerMeshData, center: V3, half: V3, rect: Rect): void {
  const [hx, hy, hz] = half;
  const p = (x: number, y: number, z: number): V3 => [center[0] + x * hx, center[1] + y * hy, center[2] + z * hz];
  addQuad(data, p(-1,-1, 1), p( 1,-1, 1), p( 1, 1, 1), p(-1, 1, 1), rect);
  addQuad(data, p( 1,-1,-1), p(-1,-1,-1), p(-1, 1,-1), p( 1, 1,-1), rect);
  addQuad(data, p(-1,-1,-1), p(-1,-1, 1), p(-1, 1, 1), p(-1, 1,-1), rect);
  addQuad(data, p( 1,-1, 1), p( 1,-1,-1), p( 1, 1,-1), p( 1, 1, 1), rect);
  addQuad(data, p(-1, 1, 1), p( 1, 1, 1), p( 1, 1,-1), p(-1, 1,-1), rect);
  addQuad(data, p(-1,-1,-1), p( 1,-1,-1), p( 1,-1, 1), p(-1,-1, 1), rect);
}

function addTunic(data: WorkerMeshData): void {
  const rect = WORKER_ATLAS_RECTS.tunic;
  const sections = 48;
  const rings = [
    { y: 0.66, rx: 0.305, rz: 0.175 },
    { y: 0.78, rx: 0.295, rz: 0.168 },
    { y: 0.94, rx: 0.255, rz: 0.150 },
    { y: 1.10, rx: 0.245, rz: 0.145 },
    { y: 1.27, rx: 0.265, rz: 0.155 },
    { y: 1.39, rx: 0.285, rz: 0.168 },
    { y: 1.44, rx: 0.205, rz: 0.140 },
  ];
  const ids: number[][] = [];
  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r]!;
    const row: number[] = [];
    for (let i = 0; i <= sections; i++) {
      const t = i / sections;
      const angle = t * Math.PI * 2;
      const fold = 1 + 0.028 * Math.sin(angle * 6 + r * 0.7);
      row.push(addVertex(data, [Math.cos(angle) * ring.rx * fold, ring.y, Math.sin(angle) * ring.rz], atlasUv(rect, t, r / (rings.length - 1))));
    }
    ids.push(row);
  }
  for (let r = 0; r < ids.length - 1; r++) {
    for (let i = 0; i < sections; i++) {
      data.indices.push(ids[r]![i]!, ids[r + 1]![i]!, ids[r + 1]![i + 1]!, ids[r]![i]!, ids[r + 1]![i + 1]!, ids[r]![i + 1]!);
    }
  }
}

/** Project-owned static Boii adult-worker art candidate. No supplied/rejected mesh is reused. */
export function createProjectAdultWorkerGeometry(): WorkerMeshData {
  const data = emptyMesh();
  const R = WORKER_ATLAS_RECTS;

  // Soft leather shoes and trousered legs.
  addEllipsoid(data, [-0.115, 0.075, 0.060], [0.105, 0.072, 0.190], R.leather, 40, 16);
  addEllipsoid(data, [ 0.115, 0.075, 0.060], [0.105, 0.072, 0.190], R.leather, 40, 16);
  addTube(data, [-0.115, 0.14, 0], [-0.115, 0.49, 0.01], 0.088, 0.108, R.trousers, 32);
  addTube(data, [-0.115, 0.49, 0.01], [-0.105, 0.83, 0.015], 0.108, 0.120, R.trousers, 32);
  addTube(data, [ 0.115, 0.14, 0], [ 0.115, 0.49,-0.01], 0.088, 0.108, R.trousers, 32);
  addTube(data, [ 0.115, 0.49,-0.01], [ 0.105, 0.83,-0.015], 0.108, 0.120, R.trousers, 32);

  // Knee-length wool tunic with restrained folds, simple belt and small buckle.
  addTunic(data);
  addBox(data, [0, 1.005, 0], [0.252, 0.028, 0.158], R.leather);
  addBox(data, [0.018, 0.91, 0.166], [0.019, 0.108, 0.014], R.leather);
  addBox(data, [0, 1.006, 0.164], [0.037, 0.034, 0.010], R.accent);

  // Cloth shoulder volume and relaxed sleeved arms.
  addEllipsoid(data, [-0.265, 1.355, 0], [0.125, 0.115, 0.145], R.tunic, 24, 12);
  addEllipsoid(data, [ 0.265, 1.355, 0], [0.125, 0.115, 0.145], R.tunic, 24, 12);
  addTube(data, [-0.275, 1.34, 0], [-0.335, 1.08, 0.020], 0.108, 0.086, R.tunic, 32);
  addTube(data, [-0.335, 1.08, 0.020], [-0.355, 0.88, 0.058], 0.086, 0.065, R.tunic, 32);
  addTube(data, [ 0.275, 1.34, 0], [ 0.335, 1.08,-0.020], 0.108, 0.086, R.tunic, 32);
  addTube(data, [ 0.335, 1.08,-0.020], [ 0.355, 0.88, 0.058], 0.086, 0.065, R.tunic, 32);
  addEllipsoid(data, [-0.360, 0.815, 0.068], [0.074, 0.108, 0.060], R.skin, 40, 20);
  addEllipsoid(data, [ 0.360, 0.815, 0.068], [0.074, 0.108, 0.060], R.skin, 40, 20);

  // Neck and generic adult head. Facial geometry is intentionally generic and not identity-derived.
  addTube(data, [0, 1.405, 0], [0, 1.485, 0], 0.077, 0.074, R.skin, 32);
  addEllipsoid(data, [0, 1.590, 0.020], [0.112, 0.120, 0.102], R.skin, 96, 48);
  addEllipsoid(data, [0, 1.605,-0.020], [0.121, 0.110, 0.095], R.hair, 72, 30);
  addEllipsoid(data, [-0.113, 1.590, 0.018], [0.024, 0.040, 0.020], R.skin, 24, 12);
  addEllipsoid(data, [ 0.113, 1.590, 0.018], [0.024, 0.040, 0.020], R.skin, 24, 12);
  addEllipsoid(data, [0, 1.585, 0.111], [0.019, 0.028, 0.030], R.skin, 32, 16);
  addEllipsoid(data, [0, 1.525, 0.116], [0.083, 0.071, 0.052], R.hair, 48, 24);
  addBox(data, [-0.040, 1.615, 0.111], [0.034, 0.008, 0.008], R.hair);
  addBox(data, [ 0.040, 1.615, 0.111], [0.034, 0.008, 0.008], R.hair);

  return data;
}

export function projectAdultWorkerStats(data: WorkerMeshData): WorkerStats {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < data.positions.length; i += 3) {
    minX = Math.min(minX, data.positions[i]!); maxX = Math.max(maxX, data.positions[i]!);
    minY = Math.min(minY, data.positions[i + 1]!); maxY = Math.max(maxY, data.positions[i + 1]!);
    minZ = Math.min(minZ, data.positions[i + 2]!); maxZ = Math.max(maxZ, data.positions[i + 2]!);
  }
  return {
    triangles: data.indices.length / 3,
    vertices: data.positions.length / 3,
    width: maxX - minX,
    height: maxY - minY,
    depth: maxZ - minZ,
  };
}
