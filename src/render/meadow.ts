import { CULLFACE_NONE, Color, StandardMaterial, type Application } from 'playcanvas';
import { createSurface, landscape, pathCenter, randomGenerator, riverCenter, riverWidth, SETTLEMENT, type MeshData } from './landscape';

/** Small ground-cover ribbons are appropriate procedural detail, never substitute trees. */
export function createMeadow(app: Application) {
  const random = randomGenerator(9137);
  const material = new StandardMaterial();
  material.diffuse = new Color(0.46, 0.53, 0.26);
  material.diffuseVertexColor = true;
  material.cull = CULLFACE_NONE;
  material.twoSidedLighting = true;
  material.gloss = 0.05;
  material.update();
  const surfaces: ReturnType<typeof createSurface>[] = [];
  let clumps = 0;
  for (let cz = -2; cz <= 2; cz++) for (let cx = -2; cx <= 2; cx++) {
    const data: MeshData = { positions: [], indices: [], uvs: [], colors: [] };
    for (let sample = 0; sample < 220; sample++) {
      const x = cx * 24 + (random() - 0.5) * 24, z = cz * 24 + (random() - 0.5) * 24;
      if (Math.abs(z - pathCenter(x)) < 2 || Math.abs(x - riverCenter(z)) < riverWidth(z) + 2) continue;
      if (SETTLEMENT.some(p => Math.hypot(x - p.x, z - p.z) < p.radius + 0.8)) continue;
      const y = landscape.heightAt(x, z);
      clumps++;
      for (let blade = 0; blade < 3; blade++) {
        const angle = random() * Math.PI * 2, width = 0.04 + random() * 0.04;
        const h = 0.22 + random() * 0.42, bend = 0.1 + random() * 0.12;
        const dx = Math.cos(angle) * width, dz = Math.sin(angle) * width;
        const bx = Math.sin(angle) * bend, bz = -Math.cos(angle) * bend;
        const index = data.positions.length / 3;
        data.positions.push(x-dx,y,z-dz, x+dx,y,z+dz,
          x-dx*0.45+bx*0.4,y+h*0.55,z-dz*0.45+bz*0.4,
          x+dx*0.45+bx*0.4,y+h*0.55,z+dz*0.45+bz*0.4,
          x+bx,y+h,z+bz);
        data.indices.push(index,index+2,index+1,index+1,index+2,index+3,index+2,index+4,index+3);
        data.uvs.push(0,0,1,0,0,0.55,1,0.55,0.5,1);
        const tint = 0.75 + random() * 0.25;
        data.colors!.push(0.4,0.48,0.3,1, 0.4,0.48,0.3,1,
          tint,tint,tint*0.76,1, tint,tint,tint*0.76,1, 1,0.95,0.69,1);
      }
    }
    if (data.positions.length) surfaces.push(createSurface(app, `Meadow ${cx}:${cz}`, data, material));
  }
  return { surfaces, material, clumps };
}
