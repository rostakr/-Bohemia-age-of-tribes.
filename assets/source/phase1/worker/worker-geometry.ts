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
type SweepRing = { center: V3; ru: number; rv: number };
type LoftRing = { y: number; rx: number; rz: number; cz?: number; fold?: number };
type ZRing = { center: V3; rx: number; ry: number };

const ATLAS_INSET = 0.006;

export const WORKER_ATLAS_RECTS = {
  tunic: [0, 0, 1 / 3, 1 / 2] as Rect,
  trousers: [1 / 3, 0, 2 / 3, 1 / 2] as Rect,
  leather: [2 / 3, 0, 1, 1 / 2] as Rect,
  skin: [0, 1 / 2, 1 / 3, 1] as Rect,
  face: [1 / 3, 1 / 2, 2 / 3, 1] as Rect,
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

function sub(a: V3, b: V3): V3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
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

function addSweep(
  data: WorkerMeshData,
  rings: SweepRing[],
  rect: Rect,
  sections: number,
  capStart = true,
  capEnd = true,
): void {
  if (rings.length < 2) throw new Error('Sweep requires at least two rings');
  const rows: number[][] = [];

  for (let r = 0; r < rings.length; r++) {
    const current = rings[r]!;
    const prev = rings[Math.max(0, r - 1)]!.center;
    const next = rings[Math.min(rings.length - 1, r + 1)]!.center;
    const tangent = normalize(sub(next, prev));
    const reference: V3 = Math.abs(tangent[1]) < 0.92 ? [0, 1, 0] : [1, 0, 0];
    const uAxis = normalize(cross(tangent, reference));
    const vAxis = normalize(cross(tangent, uAxis));
    const row: number[] = [];

    for (let i = 0; i <= sections; i++) {
      const t = i / sections;
      const angle = t * Math.PI * 2;
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      const p: V3 = [
        current.center[0] + uAxis[0] * ca * current.ru + vAxis[0] * sa * current.rv,
        current.center[1] + uAxis[1] * ca * current.ru + vAxis[1] * sa * current.rv,
        current.center[2] + uAxis[2] * ca * current.ru + vAxis[2] * sa * current.rv,
      ];
      row.push(addVertex(data, p, atlasUv(rect, t, r / (rings.length - 1))));
    }
    rows.push(row);
  }

  for (let r = 0; r < rows.length - 1; r++) {
    const lower = rows[r]!;
    const upper = rows[r + 1]!;
    for (let i = 0; i < sections; i++) {
      data.indices.push(lower[i]!, upper[i]!, upper[i + 1]!, lower[i]!, upper[i + 1]!, lower[i + 1]!);
    }
  }

  if (capStart) {
    const center = addVertex(data, rings[0]!.center, atlasUv(rect, 0.5, 0));
    const row = rows[0]!;
    for (let i = 0; i < sections; i++) data.indices.push(center, row[i + 1]!, row[i]!);
  }
  if (capEnd) {
    const center = addVertex(data, rings[rings.length - 1]!.center, atlasUv(rect, 0.5, 1));
    const row = rows[rows.length - 1]!;
    for (let i = 0; i < sections; i++) data.indices.push(center, row[i]!, row[i + 1]!);
  }
}

/** Stable shoe sweep: all cross-sections stay in world X/Y while progress follows Z. */
function addZSweep(
  data: WorkerMeshData,
  rings: ZRing[],
  rect: Rect,
  sections: number,
): void {
  if (rings.length < 2) throw new Error('Z sweep requires at least two rings');
  const rows: number[][] = [];

  for (let r = 0; r < rings.length; r++) {
    const current = rings[r]!;
    const row: number[] = [];
    for (let i = 0; i <= sections; i++) {
      const t = i / sections;
      const angle = t * Math.PI * 2;
      row.push(addVertex(data, [
        current.center[0] + Math.cos(angle) * current.rx,
        current.center[1] + Math.sin(angle) * current.ry,
        current.center[2],
      ], atlasUv(rect, t, r / (rings.length - 1))));
    }
    rows.push(row);
  }

  for (let r = 0; r < rows.length - 1; r++) {
    const lower = rows[r]!;
    const upper = rows[r + 1]!;
    for (let i = 0; i < sections; i++) {
      data.indices.push(lower[i]!, upper[i]!, upper[i + 1]!, lower[i]!, upper[i + 1]!, lower[i + 1]!);
    }
  }

  const heel = addVertex(data, rings[0]!.center, atlasUv(rect, 0.5, 0));
  const toe = addVertex(data, rings[rings.length - 1]!.center, atlasUv(rect, 0.5, 1));
  for (let i = 0; i < sections; i++) {
    data.indices.push(heel, rows[0]![i + 1]!, rows[0]![i]!);
    data.indices.push(toe, rows[rows.length - 1]![i]!, rows[rows.length - 1]![i + 1]!);
  }
}

function addHorizontalLoft(
  data: WorkerMeshData,
  rings: LoftRing[],
  rect: Rect,
  sections: number,
): void {
  const rows: number[][] = [];
  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r]!;
    const row: number[] = [];
    for (let i = 0; i <= sections; i++) {
      const t = i / sections;
      const theta = (t - 0.25) * Math.PI * 2;
      const fold = 1 + (ring.fold ?? 0) * (
        0.55 * Math.sin(theta * 5 + r * 0.53) +
        0.30 * Math.sin(theta * 9 - r * 0.31)
      );
      row.push(addVertex(data, [
        Math.cos(theta) * ring.rx * fold,
        ring.y,
        (ring.cz ?? 0) + Math.sin(theta) * ring.rz * fold,
      ], atlasUv(rect, t, r / (rings.length - 1))));
    }
    rows.push(row);
  }

  for (let r = 0; r < rows.length - 1; r++) {
    for (let i = 0; i < sections; i++) {
      data.indices.push(
        rows[r]![i]!, rows[r + 1]![i]!, rows[r + 1]![i + 1]!,
        rows[r]![i]!, rows[r + 1]![i + 1]!, rows[r]![i + 1]!,
      );
    }
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
  const rows: number[][] = [];
  for (let ring = 1; ring <= latRings; ring++) {
    const v = ring / (latRings + 1);
    const phi = -Math.PI / 2 + v * Math.PI;
    const y = center[1] + Math.sin(phi) * radii[1];
    const rr = Math.cos(phi);
    const row: number[] = [];
    for (let i = 0; i <= lonSegments; i++) {
      const t = i / lonSegments;
      const theta = (t - 0.25) * Math.PI * 2;
      row.push(addVertex(data, [
        center[0] + Math.cos(theta) * radii[0] * rr,
        y,
        center[2] + Math.sin(theta) * radii[2] * rr,
      ], atlasUv(rect, t, v)));
    }
    rows.push(row);
  }
  const top = addVertex(data, [center[0], center[1] + radii[1], center[2]], atlasUv(rect, 0.5, 1));

  const first = rows[0]!;
  for (let i = 0; i < lonSegments; i++) data.indices.push(bottom, first[i + 1]!, first[i]!);
  for (let r = 0; r < rows.length - 1; r++) {
    for (let i = 0; i < lonSegments; i++) {
      data.indices.push(
        rows[r]![i]!, rows[r + 1]![i]!, rows[r + 1]![i + 1]!,
        rows[r]![i]!, rows[r + 1]![i + 1]!, rows[r]![i + 1]!,
      );
    }
  }
  const last = rows[rows.length - 1]!;
  for (let i = 0; i < lonSegments; i++) data.indices.push(top, last[i]!, last[i + 1]!);
}

function addHead(data: WorkerMeshData): void {
  const R = WORKER_ATLAS_RECTS;
  const rings: LoftRing[] = [
    { y: 1.485, rx: 0.071, rz: 0.073, cz: 0.004 },
    { y: 1.497, rx: 0.077, rz: 0.079, cz: 0.008 },
    { y: 1.510, rx: 0.084, rz: 0.086, cz: 0.011 },
    { y: 1.523, rx: 0.091, rz: 0.092, cz: 0.014 },
    { y: 1.536, rx: 0.098, rz: 0.097, cz: 0.016 },
    { y: 1.549, rx: 0.104, rz: 0.101, cz: 0.017 },
    { y: 1.562, rx: 0.109, rz: 0.104, cz: 0.017 },
    { y: 1.575, rx: 0.113, rz: 0.106, cz: 0.016 },
    { y: 1.588, rx: 0.116, rz: 0.107, cz: 0.014 },
    { y: 1.601, rx: 0.118, rz: 0.108, cz: 0.011 },
    { y: 1.614, rx: 0.119, rz: 0.108, cz: 0.008 },
    { y: 1.627, rx: 0.119, rz: 0.107, cz: 0.005 },
    { y: 1.640, rx: 0.118, rz: 0.104, cz: 0.002 },
    { y: 1.653, rx: 0.115, rz: 0.100, cz: 0.000 },
    { y: 1.666, rx: 0.111, rz: 0.095, cz: -0.001 },
    { y: 1.679, rx: 0.104, rz: 0.088, cz: -0.001 },
    { y: 1.692, rx: 0.094, rz: 0.079, cz: 0.000 },
    { y: 1.704, rx: 0.079, rz: 0.066, cz: 0.002 },
    { y: 1.714, rx: 0.056, rz: 0.046, cz: 0.004 },
    { y: 1.722, rx: 0.024, rz: 0.020, cz: 0.005 },
  ];

  const sections = 208;
  const rows: number[][] = [];
  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r]!;
    const v = r / (rings.length - 1);
    const row: number[] = [];
    for (let i = 0; i <= sections; i++) {
      const t = i / sections;
      const theta = (t - 0.25) * Math.PI * 2;
      const du = Math.min(Math.abs(t - 0.5), 1 - Math.abs(t - 0.5));
      const nose = Math.exp(-Math.pow(du / 0.043, 2) - Math.pow((v - 0.43) / 0.12, 2)) * 0.013;
      const brow = Math.exp(-Math.pow(du / 0.15, 2) - Math.pow((v - 0.60) / 0.12, 2)) * 0.002;
      const chin = Math.exp(-Math.pow(du / 0.11, 2) - Math.pow((v - 0.10) / 0.10, 2)) * 0.003;
      row.push(addVertex(data, [
        Math.cos(theta) * ring.rx,
        ring.y,
        (ring.cz ?? 0) + Math.sin(theta) * ring.rz + nose + brow + chin,
      ], atlasUv(R.face, t, v)));
    }
    rows.push(row);
  }

  for (let r = 0; r < rows.length - 1; r++) {
    for (let i = 0; i < sections; i++) {
      data.indices.push(
        rows[r]![i]!, rows[r + 1]![i]!, rows[r + 1]![i + 1]!,
        rows[r]![i]!, rows[r + 1]![i + 1]!, rows[r]![i + 1]!,
      );
    }
  }

  const top = addVertex(data, [0, 1.724, 0.005], atlasUv(R.face, 0.5, 1));
  const last = rows[rows.length - 1]!;
  for (let i = 0; i < sections; i++) data.indices.push(top, last[i]!, last[i + 1]!);

  addEllipsoid(data, [-0.120, 1.607, 0.010], [0.016, 0.030, 0.009], R.skin, 32, 8);
  addEllipsoid(data, [ 0.120, 1.607, 0.010], [0.016, 0.030, 0.009], R.skin, 32, 8);
}

function addLeg(data: WorkerMeshData, side: -1 | 1): void {
  const x = 0.112 * side;
  const R = WORKER_ATLAS_RECTS;
  addSweep(data, [
    { center: [x, 0.135, 0.010 * side], ru: 0.071, rv: 0.080 },
    { center: [x, 0.235, 0.006 * side], ru: 0.076, rv: 0.085 },
    { center: [x * 0.99, 0.350, 0.003 * side], ru: 0.082, rv: 0.091 },
    { center: [x * 0.98, 0.475, 0.002 * side], ru: 0.089, rv: 0.098 },
    { center: [x * 0.96, 0.600, 0.000], ru: 0.097, rv: 0.106 },
    { center: [x * 0.94, 0.710, -0.003 * side], ru: 0.104, rv: 0.113 },
    { center: [x * 0.91, 0.805, -0.006 * side], ru: 0.110, rv: 0.117 },
    { center: [x * 0.88, 0.885, -0.008 * side], ru: 0.114, rv: 0.119 },
  ], R.trousers, 72, false, false);

  addZSweep(data, [
    { center: [x, 0.062, -0.082], rx: 0.054, ry: 0.038 },
    { center: [x, 0.061, -0.048], rx: 0.063, ry: 0.043 },
    { center: [x, 0.061, -0.012], rx: 0.070, ry: 0.047 },
    { center: [x, 0.061,  0.025], rx: 0.075, ry: 0.048 },
    { center: [x, 0.062,  0.062], rx: 0.076, ry: 0.047 },
    { center: [x, 0.064,  0.097], rx: 0.072, ry: 0.043 },
    { center: [x, 0.067,  0.129], rx: 0.064, ry: 0.037 },
    { center: [x, 0.071,  0.155], rx: 0.053, ry: 0.030 },
    { center: [x, 0.074,  0.173], rx: 0.039, ry: 0.023 },
    { center: [x, 0.077,  0.182], rx: 0.026, ry: 0.016 },
  ], R.leather, 96);
}

function addArm(data: WorkerMeshData, side: -1 | 1): void {
  const R = WORKER_ATLAS_RECTS;
  const s = side;

  addSweep(data, [
    { center: [0.268 * s, 1.354, 0.000], ru: 0.082, rv: 0.090 },
    { center: [0.281 * s, 1.323, 0.003 * s], ru: 0.081, rv: 0.088 },
    { center: [0.294 * s, 1.290, 0.007 * s], ru: 0.078, rv: 0.084 },
    { center: [0.306 * s, 1.256, 0.011 * s], ru: 0.074, rv: 0.080 },
    { center: [0.316 * s, 1.224, 0.014 * s], ru: 0.070, rv: 0.075 },
    { center: [0.324 * s, 1.196, 0.017 * s], ru: 0.065, rv: 0.070 },
    { center: [0.330 * s, 1.173, 0.019 * s], ru: 0.061, rv: 0.066 },
  ], R.tunic, 72, false, false);

  addSweep(data, [
    { center: [0.330 * s, 1.176, 0.019 * s], ru: 0.058, rv: 0.063 },
    { center: [0.337 * s, 1.128, 0.023 * s], ru: 0.056, rv: 0.060 },
    { center: [0.343 * s, 1.079, 0.027 * s], ru: 0.053, rv: 0.057 },
    { center: [0.348 * s, 1.030, 0.031 * s], ru: 0.050, rv: 0.054 },
    { center: [0.352 * s, 0.981, 0.035 * s], ru: 0.047, rv: 0.051 },
    { center: [0.355 * s, 0.936, 0.038 * s], ru: 0.044, rv: 0.048 },
    { center: [0.357 * s, 0.897, 0.041 * s], ru: 0.041, rv: 0.045 },
  ], R.skin, 72, false, false);

  addSweep(data, [
    { center: [0.357 * s, 0.899, 0.041 * s], ru: 0.038, rv: 0.043 },
    { center: [0.358 * s, 0.877, 0.043 * s], ru: 0.039, rv: 0.044 },
    { center: [0.359 * s, 0.855, 0.044 * s], ru: 0.040, rv: 0.044 },
    { center: [0.360 * s, 0.833, 0.045 * s], ru: 0.039, rv: 0.043 },
    { center: [0.361 * s, 0.812, 0.046 * s], ru: 0.037, rv: 0.041 },
    { center: [0.362 * s, 0.792, 0.046 * s], ru: 0.034, rv: 0.038 },
    { center: [0.363 * s, 0.774, 0.046 * s], ru: 0.030, rv: 0.034 },
    { center: [0.363 * s, 0.759, 0.045 * s], ru: 0.022, rv: 0.026 },
  ], R.skin, 72, false, true);

  addSweep(data, [
    { center: [0.363 * s, 0.846, 0.054 * s], ru: 0.017, rv: 0.019 },
    { center: [0.374 * s, 0.835, 0.057 * s], ru: 0.016, rv: 0.018 },
    { center: [0.383 * s, 0.823, 0.059 * s], ru: 0.014, rv: 0.016 },
    { center: [0.388 * s, 0.812, 0.060 * s], ru: 0.011, rv: 0.013 },
    { center: [0.389 * s, 0.804, 0.059 * s], ru: 0.008, rv: 0.010 },
  ], R.skin, 48, false, true);
}

/**
 * Project-owned static Boii adult-worker R2 art candidate.
 * This is a new geometry build aimed at the visual blocker identified by QA.
 */
export function createProjectAdultWorkerGeometry(): WorkerMeshData {
  const data = emptyMesh();
  const R = WORKER_ATLAS_RECTS;

  addLeg(data, -1);
  addLeg(data, 1);

  addHorizontalLoft(data, [
    { y: 0.760, rx: 0.292, rz: 0.171, fold: 0.028 },
    { y: 0.810, rx: 0.289, rz: 0.168, fold: 0.025 },
    { y: 0.885, rx: 0.280, rz: 0.163, fold: 0.021 },
    { y: 0.960, rx: 0.266, rz: 0.157, fold: 0.017 },
    { y: 1.040, rx: 0.257, rz: 0.152, fold: 0.014 },
    { y: 1.120, rx: 0.264, rz: 0.155, fold: 0.012 },
    { y: 1.205, rx: 0.280, rz: 0.160, fold: 0.010 },
    { y: 1.285, rx: 0.299, rz: 0.165, fold: 0.008 },
    { y: 1.350, rx: 0.315, rz: 0.168, fold: 0.006 },
    { y: 1.395, rx: 0.292, rz: 0.161, fold: 0.004 },
    { y: 1.430, rx: 0.225, rz: 0.143, fold: 0.002 },
    { y: 1.456, rx: 0.145, rz: 0.111, fold: 0.000 },
  ], R.tunic, 160);

  addHorizontalLoft(data, [
    { y: 1.000, rx: 0.264, rz: 0.158 },
    { y: 1.010, rx: 0.268, rz: 0.160 },
    { y: 1.024, rx: 0.268, rz: 0.160 },
    { y: 1.034, rx: 0.264, rz: 0.158 },
  ], R.leather, 80);

  addArm(data, -1);
  addArm(data, 1);

  addSweep(data, [
    { center: [0, 1.438, 0.003], ru: 0.078, rv: 0.073 },
    { center: [0, 1.452, 0.004], ru: 0.079, rv: 0.074 },
    { center: [0, 1.466, 0.005], ru: 0.078, rv: 0.073 },
    { center: [0, 1.478, 0.006], ru: 0.076, rv: 0.071 },
    { center: [0, 1.488, 0.006], ru: 0.073, rv: 0.068 },
  ], R.skin, 64, false, false);

  addHead(data);

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
