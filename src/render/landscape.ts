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
export function riverWidth(z: number): number { return 3.5 + 0.55 * Math.sin(z * 0.06); }
export function pathCenter(x: number): number { return 5 + 5 * Math.sin((x + 15) * 0.044); }

export const landscape: TerrainSurface = {
  heightAt(x, z) {
    const riverDistance = Math.abs(x - riverCenter(z));
    const relief = 3.1 + 0.65 * Math.sin(x * 0.063) * Math.cos(z * 0.071)
      + 0.25 * Math.sin(x * 0.18 + z * 0.05)
      + 9 * Math.exp(-((x + 45) ** 2 + (z + 65) ** 2) / 1500)
      + 5 * Math.exp(-((x - 65) ** 2 + (z - 50) ** 2) / 1900);
    const bank = smoothstep(riverWidth(z) - 0.9, riverWidth(z) + 7, riverDistance);
    const bed = -0.8 + 0.9 * Math.exp(-((z - 6) ** 2) / 24);
    let height = bed + (relief - bed) * bank;
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
      uvs.push(x / 5, z / 5);
      const shade = 0.82 + 0.12 * Math.sin(x * 0.19) * Math.cos(z * 0.13);
      const wet = 1 - smoothstep(4, 10, Math.abs(x - riverCenter(z)));
      colors.push(shade * (1 - wet * 0.32), (shade + 0.08) * (1 - wet * 0.25), shade * 0.76, 1);
      if (xi < segments && zi < segments) {
        const a = zi * (segments + 1) + xi, b = a + segments + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  return { positions, indices, uvs, colors };
}

export function riverMesh(): MeshData {
  const positions: number[] = [], indices: number[] = [], uvs: number[] = [];
  for (let i = 0; i <= 220; i++) {
    const z = i - WORLD_HALF_SIZE;
    const width = riverWidth(z) + 0.7;
    positions.push(riverCenter(z) - width, WATER_HEIGHT, z, riverCenter(z) + width, WATER_HEIGHT, z);
    uvs.push(0, z / 5, 1, z / 5);
    if (i < 220) indices.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
  }
  return { positions, indices, uvs };
}

export function pathMesh(): MeshData {
  const positions: number[] = [], indices: number[] = [], uvs: number[] = [], colors: number[] = [];
  const stripes = [-1.6, -1.05, 1.05, 1.6];
  for (let i = 0; i <= 170; i++) {
    const x = i - 85;
    const center = pathCenter(x);
    stripes.forEach((offset, j) => {
      const z = center + offset;
      positions.push(x, landscape.heightAt(x, z) + 0.045, z);
      uvs.push(x / 4, offset / 4);
      colors.push(0.9, 0.86, 0.75, j === 0 || j === 3 ? 0 : 0.92);
      if (i < 170 && j < 3) {
        const a = i * 4 + j;
        indices.push(a, a + 1, a + 4, a + 1, a + 5, a + 4);
      }
    });
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
