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

function subtract(a: V3, b: V3): V3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
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

/**
 * Smooth elliptical sweep used for limbs and shoes. Adjacent anatomical sections share
 * the same swept surface instead of being represented by detached spheres/cylinders.
 */
function addSweep(
  data: WorkerMeshData,
  rings: SweepRing[],
  rect: Rect,
  sections: number,
  capStart = false,
  capEnd = false,
): void {
  if (rings.length < 2) throw new Error('Sweep requires at least two rings');
  const rows: number[][] = [];
  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r]!;
    const previous = rings[Math.max(0, r - 1)]!.center;
    const next = rings[Math.min(rings.length - 1, r + 1)]!.center;
    const tangent = normalize(subtract(next, previous));
    const reference: V3 = Math.abs(tangent[1]) < 0.85 ? [0, 1, 0] : [1, 0, 0];
    const uAxis = normalize(cross(tangent, reference));
    const vAxis = normalize(cross(tangent, uAxis));
    const row: number[] = [];
    for (let i = 0; i <= sections; i++) {
      const t = i / sections;
      const angle = t * Math.PI * 2;
      const ca = Math.cos(angle), sa = Math.sin(angle);
      row.push(addVertex(data, [
        ring.center[0] + uAxis[0] * ca * ring.ru + vAxis[0] * sa * ring.rv,
        ring.center[1] + uAxis[1] * ca * ring.ru + vAxis[1] * sa * ring.rv,
        ring.center[2] + uAxis[2] * ca * ring.ru + vAxis[2] * sa * ring.rv,
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
  if (capStart) {
    const center = addVertex(data, rings[0]!.center, atlasUv(rect, 0.5, 0));
    for (let i = 0; i < sections; i++) data.indices.push(center, rows[0]![i + 1]!, rows[0]![i]!);
  }
  if (capEnd) {
    const center = addVertex(data, rings[rings.length - 1]!.center, atlasUv(rect, 0.5, 1));
    const last = rows[rows.length - 1]!;
    for (let i = 0; i < sections; i++) data.indices.push(center, last[i]!, last[i + 1]!);
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

function addTunic(data: WorkerMeshData): void {
  const rect = WORKER_ATLAS_RECTS.tunic;
  const sections = 72;
  const rings = [
    { y: 0.66, rx: 0.305, rz: 0.175 },
    { y: 0.80, rx: 0.292, rz: 0.168 },
    { y: 0.96, rx: 0.255, rz: 0.150 },
    { y: 1.12, rx: 0.246, rz: 0.145 },
    { y: 1.28, rx: 0.265, rz: 0.154 },
    { y: 1.38, rx: 0.296, rz: 0.166 },
    { y: 1.43, rx: 0.270, rz: 0.154 },
    { y: 1.46, rx: 0.205, rz: 0.135 },
  ];
  const ids: number[][] = [];
  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r]!;
    const row: number[] = [];
    for (let i = 0; i <= sections; i++) {
      const t = i / sections;
      const angle = t * Math.PI * 2;
      const fold = 1 + 0.022 * Math.sin(angle * 6 + r * 0.63) + 0.009 * Math.sin(angle * 11 - r * 0.4);
      row.push(addVertex(data, [
        Math.cos(angle) * ring.rx * fold,
        ring.y,
        Math.sin(angle) * ring.rz,
      ], atlasUv(rect, t, r / (rings.length - 1))));
    }
    ids.push(row);
  }
  for (let r = 0; r < ids.length - 1; r++) {
    for (let i = 0; i < sections; i++) {
      data.indices.push(ids[r]![i]!, ids[r + 1]![i]!, ids[r + 1]![i + 1]!, ids[r]![i]!, ids[r + 1]![i + 1]!, ids[r]![i + 1]!);
    }
  }
}

function addShoe(data: WorkerMeshData, x: number): void {
  const z = [-0.13, -0.095, -0.045, 0.015, 0.080, 0.140, 0.190, 0.225, 0.242, 0.248];
  const y = [0.060, 0.066, 0.071, 0.074, 0.072, 0.066, 0.057, 0.047, 0.040, 0.038];
  const xRadius = [0.060, 0.080, 0.097, 0.108, 0.112, 0.108, 0.098, 0.080, 0.055, 0.025];
  const yRadius = [0.036, 0.048, 0.057, 0.062, 0.062, 0.058, 0.050, 0.040, 0.030, 0.018];
  const rings: SweepRing[] = z.map((value, index) => ({
    center: [x, y[index]!, value],
    // For a mostly-Z tangent, sweep u-axis is horizontal X and v-axis is vertical Y.
    ru: xRadius[index]!,
    rv: yRadius[index]!,
  }));
  addSweep(data, rings, WORKER_ATLAS_RECTS.leather, 96, true, true);
}

function addLeg(data: WorkerMeshData, side: -1 | 1): void {
  const x = side * 0.112;
  const rings: SweepRing[] = [
    { center: [x * 0.94, 0.84, side * -0.010], ru: 0.100, rv: 0.120 },
    { center: [x * 0.97, 0.72, side * -0.005], ru: 0.098, rv: 0.116 },
    { center: [x, 0.58, 0.000], ru: 0.094, rv: 0.108 },
    { center: [x, 0.48, side * 0.004], ru: 0.087, rv: 0.100 },
    { center: [x, 0.34, side * 0.006], ru: 0.081, rv: 0.091 },
    { center: [x, 0.22, side * 0.004], ru: 0.075, rv: 0.082 },
    { center: [x, 0.145, 0.000], ru: 0.069, rv: 0.074 },
  ];
  addSweep(data, rings, WORKER_ATLAS_RECTS.trousers, 64);
}

function addSleeve(data: WorkerMeshData, side: -1 | 1): void {
  const s = side;
  const rings: SweepRing[] = [
    { center: [s * 0.248, 1.392, 0.000], ru: 0.094, rv: 0.108 },
    { center: [s * 0.276, 1.300, 0.006], ru: 0.090, rv: 0.102 },
    { center: [s * 0.303, 1.205, 0.014], ru: 0.084, rv: 0.094 },
    { center: [s * 0.320, 1.110, 0.026], ru: 0.077, rv: 0.085 },
    { center: [s * 0.330, 1.010, 0.043], ru: 0.066, rv: 0.073 },
    { center: [s * 0.335, 0.915, 0.060], ru: 0.054, rv: 0.060 },
  ];
  addSweep(data, rings, WORKER_ATLAS_RECTS.tunic, 64);
}

function addHand(data: WorkerMeshData, side: -1 | 1): void {
  const s = side;
  const rings: SweepRing[] = [
    { center: [s * 0.335, 0.915, 0.060], ru: 0.050, rv: 0.055 },
    { center: [s * 0.338, 0.865, 0.066], ru: 0.050, rv: 0.058 },
    { center: [s * 0.341, 0.815, 0.073], ru: 0.047, rv: 0.062 },
    { center: [s * 0.342, 0.770, 0.079], ru: 0.043, rv: 0.060 },
    { center: [s * 0.341, 0.730, 0.083], ru: 0.037, rv: 0.052 },
    { center: [s * 0.339, 0.700, 0.084], ru: 0.030, rv: 0.040 },
    { center: [s * 0.338, 0.682, 0.083], ru: 0.020, rv: 0.024 },
  ];
  // Start ring exactly matches/overlaps the sleeve cuff; only the fingertip is capped.
  addSweep(data, rings, WORKER_ATLAS_RECTS.skin, 64, false, true);
}

function addHead(data: WorkerMeshData): void {
  const rect = WORKER_ATLAS_RECTS.skin;
  const lonSegments = 128;
  const latRings = 42;
  const bottomY = 1.485;
  const topY = 1.710;
  const bottom = addVertex(data, [0, bottomY, 0.014], atlasUv(rect, 0.5, 0));
  const rings: number[][] = [];
  for (let ring = 1; ring <= latRings; ring++) {
    const t = ring / (latRings + 1);
    const y = bottomY + (topY - bottomY) * t;
    const bulge = Math.sin(Math.PI * t) ** 0.58;
    const jaw = t < 0.34 ? 0.68 + 0.32 * (t / 0.34) : 1;
    const crown = t > 0.74 ? 1 - 0.15 * ((t - 0.74) / 0.26) : 1;
    const rx = (0.036 + 0.080 * bulge) * jaw * crown;
    const rz = (0.054 + 0.052 * bulge) * (0.88 + 0.12 * jaw) * crown;
    const centerZ = 0.014 - 0.006 * t;
    const row: number[] = [];
    for (let i = 0; i <= lonSegments; i++) {
      const u = i / lonSegments;
      const theta = u * Math.PI * 2;
      // Slight cheek fullness and a flatter rear cranium avoid a perfect toy sphere.
      const front = Math.max(0, Math.sin(theta));
      const side = Math.abs(Math.cos(theta));
      const cheek = 1 + 0.025 * front * Math.sin(Math.PI * Math.min(1, t / 0.68));
      const sideTaper = 1 - 0.010 * side * Math.max(0, (t - 0.62) / 0.38);
      row.push(addVertex(data, [
        Math.cos(theta) * rx * sideTaper,
        y,
        centerZ + Math.sin(theta) * rz * cheek,
      ], atlasUv(rect, u, t)));
    }
    rings.push(row);
  }
  const top = addVertex(data, [0, topY, 0.008], atlasUv(rect, 0.5, 1));
  for (let i = 0; i < lonSegments; i++) data.indices.push(bottom, rings[0]![i + 1]!, rings[0]![i]!);
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < lonSegments; i++) {
      data.indices.push(
        rings[r]![i]!, rings[r + 1]![i + 1]!, rings[r + 1]![i]!,
        rings[r]![i]!, rings[r]![i + 1]!, rings[r + 1]![i + 1]!,
      );
    }
  }
  const last = rings[rings.length - 1]!;
  for (let i = 0; i < lonSegments; i++) data.indices.push(top, last[i]!, last[i + 1]!);
}

function addHairCap(data: WorkerMeshData): void {
  const rect = WORKER_ATLAS_RECTS.hair;
  const sections = 128;
  const rows = 18;
  const ids: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const v = r / rows;
    const taper = 1 - 0.73 * (v ** 1.38);
    const row: number[] = [];
    for (let i = 0; i <= sections; i++) {
      const u = i / sections;
      const theta = u * Math.PI * 2;
      const front = Math.max(0, Math.sin(theta));
      const side = Math.abs(Math.cos(theta));
      // Lower at the back, higher at the forehead: this is a hairline, not a second head shell.
      const baseY = 1.598 + 0.052 * front + 0.010 * side;
      const y = baseY + (1.699 - baseY) * v;
      const rx = 0.116 * taper;
      const rz = 0.103 * taper;
      row.push(addVertex(data, [
        Math.cos(theta) * rx,
        y,
        -0.004 * (1 - v) + Math.sin(theta) * rz,
      ], atlasUv(rect, u, v)));
    }
    ids.push(row);
  }
  for (let r = 0; r < ids.length - 1; r++) {
    for (let i = 0; i < sections; i++) {
      data.indices.push(
        ids[r]![i]!, ids[r + 1]![i]!, ids[r + 1]![i + 1]!,
        ids[r]![i]!, ids[r + 1]![i + 1]!, ids[r]![i + 1]!,
      );
    }
  }
  const top = addVertex(data, [0, 1.708, 0.004], atlasUv(rect, 0.5, 1));
  const last = ids[ids.length - 1]!;
  for (let i = 0; i < sections; i++) data.indices.push(top, last[i]!, last[i + 1]!);
}

function addBeardPatch(data: WorkerMeshData): void {
  const rect = WORKER_ATLAS_RECTS.hair;
  const rows = 8;
  const columns = 41;
  const ids: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const v = r / (rows - 1);
    const y = 1.500 + v * 0.070;
    const width = [0.034, 0.052, 0.070, 0.084, 0.090, 0.086, 0.073, 0.055][r]!;
    const faceZ = 0.086 + v * 0.036;
    const row: number[] = [];
    for (let c = 0; c < columns; c++) {
      const u = c / (columns - 1);
      const nx = u * 2 - 1;
      const x = nx * width;
      const z = faceZ + 0.0045 * (1 - nx * nx);
      row.push(addVertex(data, [x, y, z], atlasUv(rect, u, v)));
    }
    ids.push(row);
  }
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < columns - 1; c++) {
      data.indices.push(
        ids[r]![c]!, ids[r]![c + 1]!, ids[r + 1]![c + 1]!,
        ids[r]![c]!, ids[r + 1]![c + 1]!, ids[r + 1]![c]!,
      );
    }
  }
}

function addNose(data: WorkerMeshData): void {
  const rect = WORKER_ATLAS_RECTS.skin;
  const a = addVertex(data, [-0.018, 1.604, 0.119], atlasUv(rect, 0.18, 0.72));
  const b = addVertex(data, [ 0.018, 1.604, 0.119], atlasUv(rect, 0.82, 0.72));
  const c = addVertex(data, [-0.015, 1.566, 0.119], atlasUv(rect, 0.22, 0.22));
  const d = addVertex(data, [ 0.015, 1.566, 0.119], atlasUv(rect, 0.78, 0.22));
  const tip = addVertex(data, [0, 1.580, 0.145], atlasUv(rect, 0.50, 0.44));
  const bridge = addVertex(data, [0, 1.617, 0.123], atlasUv(rect, 0.50, 0.90));
  data.indices.push(
    a, b, tip,
    c, tip, d,
    a, tip, c,
    b, d, tip,
    bridge, b, a,
    bridge, tip, b,
    bridge, a, tip,
    c, d, tip,
  );
}

function addBrows(data: WorkerMeshData): void {
  const rect = WORKER_ATLAS_RECTS.hair;
  addQuad(data, [-0.078, 1.623, 0.123], [-0.020, 1.625, 0.126], [-0.022, 1.632, 0.126], [-0.076, 1.630, 0.123], rect);
  addQuad(data, [ 0.020, 1.625, 0.126], [ 0.078, 1.623, 0.123], [ 0.076, 1.630, 0.123], [ 0.022, 1.632, 0.126], rect);
}

/** Project-owned static Boii adult-worker art candidate. No supplied/rejected mesh is reused. */
export function createProjectAdultWorkerGeometry(): WorkerMeshData {
  const data = emptyMesh();
  const R = WORKER_ATLAS_RECTS;

  // Shaped leather shoes and continuous trousered legs.
  addShoe(data, -0.112);
  addShoe(data,  0.112);
  addLeg(data, -1);
  addLeg(data,  1);

  // Knee-length wool tunic with restrained folds, simple belt and small buckle.
  addTunic(data);
  addBox(data, [0, 1.005, 0], [0.252, 0.026, 0.158], R.leather);
  addBox(data, [0.018, 0.910, 0.166], [0.018, 0.102, 0.012], R.leather);
  addBox(data, [0, 1.006, 0.164], [0.034, 0.031, 0.009], R.accent);

  // Shoulder volume is carried by the tunic profile itself. Sleeves are continuous sweeps
  // from inside the shoulder line to cuffs; hands continue from the exact cuff position.
  addSleeve(data, -1);
  addSleeve(data,  1);
  addHand(data, -1);
  addHand(data,  1);

  // Neck and a non-spherical adult head profile with restrained hair/beard treatment.
  addSweep(data, [
    { center: [0, 1.420, 0.000], ru: 0.066, rv: 0.074 },
    { center: [0, 1.458, 0.004], ru: 0.069, rv: 0.076 },
    { center: [0, 1.490, 0.009], ru: 0.064, rv: 0.071 },
  ], R.skin, 48);
  addHead(data);
  addHairCap(data);
  addEllipsoid(data, [-0.112, 1.590, 0.010], [0.018, 0.034, 0.012], R.skin, 32, 10);
  addEllipsoid(data, [ 0.112, 1.590, 0.010], [0.018, 0.034, 0.012], R.skin, 32, 10);
  addBeardPatch(data);
  addNose(data);
  addBrows(data);

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
