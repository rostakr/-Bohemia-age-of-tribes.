import { calculateNormals, Entity, Mesh, MeshInstance, type Application, type StandardMaterial } from 'playcanvas';
import type { TerrainSurface } from '../core/contracts';

export const WORLD_HALF_SIZE = 110;
export const WATER_HEIGHT = 0.35;
export const SETTLEMENT = [
  { x: -9, z: -6, radius: 7, y: 3.15 },
  { x: 8, z: -12, radius: 5, y: 3.05 },
  { x: -12, z: 13, radius: 6, y: 3.0 },
] as const;

export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function riverCenter(z: number): number {
  return 29 + 7 * Math.sin(z * 0.032) + 1.8 * Math.sin(z * 0.085);
}

export function riverWidth(z: number): number {
  return 3.75 + 0.5 * Math.sin(z * 0.06) + 0.22 * Math.sin(z * 0.137 + 0.8);
}

export function pathCenter(x: number): number {
  return 4.4
    + 4.8 * Math.sin((x + 15) * 0.044)
    + 1.15 * Math.sin((x - 7) * 0.105)
    + 0.45 * Math.sin((x + 31) * 0.19);
}

export function pathHalfWidth(x: number): number {
  return 1.28 + 0.22 * Math.sin((x + 8) * 0.083) + 0.11 * Math.sin((x - 19) * 0.173);
}

function pathSlope(x: number): number {
  const epsilon = 0.35;
  return (pathCenter(x + epsilon) - pathCenter(x - epsilon)) / (epsilon * 2);
}

export const landscape: TerrainSurface = {
  heightAt(x, z) {
    const center = riverCenter(z);
    const riverDistance = Math.abs(x - center);
    const relief = 3.1
      + 0.65 * Math.sin(x * 0.063) * Math.cos(z * 0.071)
      + 0.25 * Math.sin(x * 0.18 + z * 0.05)
      + 0.16 * Math.sin((x + z) * 0.037)
      + 9 * Math.exp(-((x + 45) ** 2 + (z + 65) ** 2) / 1500)
      + 5 * Math.exp(-((x - 65) ** 2 + (z - 50) ** 2) / 1900);

    const width = riverWidth(z);
    const bed = WATER_HEIGHT - 0.52
      + 0.045 * Math.sin(z * 0.071)
      + 0.025 * Math.sin(z * 0.19 + 1.3);
    const shelf = WATER_HEIGHT - 0.075 - 0.02 * Math.sin(z * 0.095 + 0.5);
    const channelBlend = smoothstep(0.15, Math.max(0.3, width - 0.2), riverDistance);
    const channelHeight = bed + (shelf - bed) * channelBlend;
    const bankReach = 8.2 + 1.3 * (0.5 + 0.5 * Math.sin(z * 0.041 + 0.6));
    const bankBlend = smoothstep(width - 0.25, width + bankReach, riverDistance);
    let height = channelHeight + (relief - channelHeight) * bankBlend;

    for (const pad of SETTLEMENT) {
      const blend = 1 - smoothstep(pad.radius, pad.radius + 4, Math.hypot(x - pad.x, z - pad.z));
      height += (pad.y - height) * blend;
    }
    return height;
  },
};

export type MeshData = { positions: number[]; indices: number[]; uvs: number[]; colors?: number[] };

export function createSurface(app: Application, name: string, data: MeshData, material: StandardMaterial) {
  const mesh = new Mesh(app.graphicsDevice);
  mesh.setPositions(data.positions);
  mesh.setNormals(calculateNormals(data.positions, data.indices));
  mesh.setUvs(0, data.uvs);
  mesh.setIndices(data.indices);
  if (data.colors) mesh.setColors(data.colors);
  mesh.update();
  const entity = new Entity(name);
  const instance = new MeshInstance(mesh, material);
  instance.castShadow = false;
  entity.addComponent('render', { meshInstances: [instance] });
  return { entity, mesh };
}

export function terrainMesh(segments = 180): MeshData {
  const positions: number[] = [], indices: number[] = [], uvs: number[] = [], colors: number[] = [];
  for (let zi = 0; zi <= segments; zi++) {
    const z = -WORLD_HALF_SIZE + zi / segments * WORLD_HALF_SIZE * 2;
    for (let xi = 0; xi <= segments; xi++) {
      const x = -WORLD_HALF_SIZE + xi / segments * WORLD_HALF_SIZE * 2;
      positions.push(x, landscape.heightAt(x, z), z);

      // World-space UVs with low-frequency warp reduce obvious grid repetition without
      // introducing another texture dependency or a custom shader path.
      const u = x / 8.5 + 0.21 * Math.sin(z * 0.052) + 0.11 * Math.sin((x + z) * 0.021);
      const v = z / 8.5 + 0.18 * Math.sin(x * 0.047 + 0.7) - 0.1 * Math.cos((x - z) * 0.019);
      uvs.push(u, v);

      const macro = 0.89
        + 0.055 * Math.sin(x * 0.033 + z * 0.011)
        + 0.035 * Math.cos(z * 0.041 - x * 0.017)
        + 0.025 * Math.sin((x + z) * 0.079);
      const wet = 1 - smoothstep(riverWidth(z) + 1.5, riverWidth(z) + 12, Math.abs(x - riverCenter(z)));
      const upland = smoothstep(2.7, 5.8, landscape.heightAt(x, z));
      const r = macro * (0.94 - wet * 0.1 + upland * 0.02);
      const g = macro * (0.98 - wet * 0.045 + upland * 0.025);
      const b = macro * (0.88 + wet * 0.035 - upland * 0.015);
      colors.push(Math.min(1, r), Math.min(1, g), Math.min(1, b), 1);

      if (xi < segments && zi < segments) {
        const a = zi * (segments + 1) + xi, bIndex = a + segments + 1;
        indices.push(a, bIndex, a + 1, a + 1, bIndex, bIndex + 1);
      }
    }
  }
  return { positions, indices, uvs, colors };
}

export function riverMesh(): MeshData {
  const positions: number[] = [], indices: number[] = [], uvs: number[] = [];
  for (let i = 0; i <= 220; i++) {
    const z = i - WORLD_HALF_SIZE;
    const width = riverWidth(z) + 0.18;
    const center = riverCenter(z);
    positions.push(center - width, WATER_HEIGHT, z, center + width, WATER_HEIGHT, z);
    uvs.push(0, z / 7, 1, z / 7);
    if (i < 220) indices.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
  }
  return { positions, indices, uvs };
}

export function pathMesh(): MeshData {
  const positions: number[] = [], indices: number[] = [], uvs: number[] = [], colors: number[] = [];
  const cross = [-1, -0.58, 0, 0.58, 1];
  const alpha = [0, 0.48, 0.78, 0.48, 0];
  const rows = 170;
  for (let i = 0; i <= rows; i++) {
    const x = i - 85;
    const center = pathCenter(x);
    const halfWidth = pathHalfWidth(x);
    const slope = pathSlope(x);
    const normalLength = Math.hypot(slope, 1);
    const nx = -slope / normalLength;
    const nz = 1 / normalLength;

    for (let j = 0; j < cross.length; j++) {
      const offset = cross[j]! * halfWidth;
      const px = x + nx * offset;
      const pz = center + nz * offset;
      positions.push(px, landscape.heightAt(px, pz) + 0.035, pz);
      uvs.push(x / 6.5 + 0.06 * Math.sin(x * 0.11), j / (cross.length - 1));
      const edge = Math.abs(cross[j]!);
      const tone = 0.98 - 0.05 * edge + 0.025 * Math.sin(x * 0.09 + j);
      colors.push(tone, tone * 0.965, tone * 0.9, alpha[j]!);
      if (i < rows && j < cross.length - 1) {
        const a = i * cross.length + j;
        indices.push(a, a + 1, a + cross.length, a + 1, a + cross.length + 1, a + cross.length);
      }
    }
  }
  return { positions, indices, uvs, colors };
}

export function randomGenerator(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
