import { CULLFACE_NONE, Color, StandardMaterial, type Application } from 'playcanvas';
import { createSurface, landscape, pathCenter, pathHalfWidth, randomGenerator, riverCenter, riverWidth, SETTLEMENT, type MeshData } from './landscape';

function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }

function meadowDensity(x: number, z: number): number {
  const broad = 0.5
    + 0.22 * Math.sin(x * 0.047 + z * 0.013)
    + 0.18 * Math.cos(z * 0.052 - x * 0.019);
  const pockets = 0.5 + 0.5 * Math.sin(x * 0.094 + Math.sin(z * 0.031) * 1.8);
  return clamp01(0.2 + broad * 0.42 + pockets * 0.28);
}

function excluded(x: number, z: number): boolean {
  if (Math.abs(z - pathCenter(x)) < pathHalfWidth(x) + 1.35) return true;
  if (Math.abs(x - riverCenter(z)) < riverWidth(z) + 2.6) return true;
  return SETTLEMENT.some(p => Math.hypot(x - p.x, z - p.z) < p.radius + 1.25);
}

function addRibbon(data: MeshData, x: number, y: number, z: number, angle: number, width: number, height: number, bend: number, color: [number, number, number]) {
  const dx = Math.cos(angle) * width;
  const dz = Math.sin(angle) * width;
  const bx = Math.sin(angle) * bend;
  const bz = -Math.cos(angle) * bend;
  const index = data.positions.length / 3;
  data.positions.push(
    x - dx, y, z - dz,
    x + dx, y, z + dz,
    x - dx * 0.42 + bx, y + height, z - dz * 0.42 + bz,
    x + dx * 0.42 + bx, y + height, z + dz * 0.42 + bz,
  );
  data.indices.push(index, index + 2, index + 1, index + 1, index + 2, index + 3);
  data.uvs.push(0, 0, 1, 0, 0, 1, 1, 1);
  const [r, g, b] = color;
  data.colors!.push(
    r * 0.72, g * 0.72, b * 0.68, 1,
    r * 0.72, g * 0.72, b * 0.68, 1,
    r, g, b, 1,
    r, g, b, 1,
  );
}

/** Batched ground-cover tufts are procedural detail, never substitutes for production trees. */
export function createMeadow(app: Application) {
  const random = randomGenerator(9137);
  const material = new StandardMaterial();
  material.diffuse = new Color(0.39, 0.46, 0.25);
  material.diffuseVertexColor = true;
  material.cull = CULLFACE_NONE;
  material.twoSidedLighting = true;
  material.gloss = 0.035;
  material.update();

  const surfaces: ReturnType<typeof createSurface>[] = [];
  let clumps = 0;
  for (let cz = -2; cz <= 2; cz++) for (let cx = -2; cx <= 2; cx++) {
    const data: MeshData = { positions: [], indices: [], uvs: [], colors: [] };
    for (let sample = 0; sample < 150; sample++) {
      const anchorX = cx * 24 + (random() - 0.5) * 24;
      const anchorZ = cz * 24 + (random() - 0.5) * 24;
      const density = meadowDensity(anchorX, anchorZ);
      if (random() > density * 0.78) continue;

      const tuftCount = random() < density * 0.55 ? 2 : 1;
      for (let tuft = 0; tuft < tuftCount; tuft++) {
        const x = anchorX + (random() - 0.5) * 0.9;
        const z = anchorZ + (random() - 0.5) * 0.9;
        if (excluded(x, z)) continue;
        const y = landscape.heightAt(x, z) + 0.012;
        const baseAngle = random() * Math.PI;
        const width = 0.085 + random() * 0.075;
        const height = 0.23 + random() * 0.34;
        const bend = (random() - 0.35) * 0.13;
        const moisture = 1 - clamp01(Math.abs(x - riverCenter(z)) / 18);
        const variation = 0.9 + random() * 0.16;
        const color: [number, number, number] = [
          (0.43 - moisture * 0.035) * variation,
          (0.51 + moisture * 0.015) * variation,
          (0.27 + moisture * 0.025) * variation,
        ];
        addRibbon(data, x, y, z, baseAngle, width, height, bend, color);
        addRibbon(data, x, y + 0.004, z, baseAngle + Math.PI * 0.5, width * 0.82, height * (0.9 + random() * 0.14), -bend * 0.65, color);
        clumps++;
      }
    }
    if (data.positions.length) surfaces.push(createSurface(app, `Meadow ${cx}:${cz}`, data, material));
  }
  return { surfaces, material, clumps };
}
