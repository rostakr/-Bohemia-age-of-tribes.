import {
  BLEND_NORMAL,
  CameraFrame,
  Color,
  Entity,
  FOG_LINEAR,
  PIXELFORMAT_RGBA8,
  SSAOTYPE_LIGHTING,
  StandardMaterial,
  Texture,
  TONEMAP_ACES,
  Vec2,
  type Application,
  type ContainerResource,
  type Mesh,
} from 'playcanvas';
import { resolveAsset, type AssetResolver } from '../assets/resolve-asset';
import type { RuntimeScene } from './scene';
import { SceneAssets, instantiateAtHeight } from './scene-assets';
import {
  createSurface,
  landscape,
  pathMesh,
  riverMesh,
  terrainMesh,
  SETTLEMENT,
  randomGenerator,
  riverCenter,
  pathCenter,
  smoothstep,
} from './landscape';
import { InspectionCamera, type ViewName } from './inspection-camera';
import { createMeadow } from './meadow';
import { createBoiiStorehouse } from './storehouse';
import { createBoiiWorkshop } from './workshop.ts';
import { createCentralEuropeanTree } from './tree.ts';
import { createBoiiInhabitantCandidate } from './inhabitant';

export interface BenchmarkModels {
  dwelling: string | null;
  storehouse: string | null;
  workshop: string | null;
  inhabitant: string | null;
  tree: string | null;
}

export const SUPPLIED_STOREHOUSE_PATH = 'buildings/boii_storehouse_small.glb';

// Never silently replace missing production models with primitives.
export const ADMITTED_MODELS: BenchmarkModels = {
  dwelling: 'buildings/boii_dwelling_rectangular_lod1.glb',
  storehouse: SUPPLIED_STOREHOUSE_PATH,
  workshop: null,
  inhabitant: null,
  tree: null,
};

// Explicit WIP content candidate. This is project-owned procedural geometry, not an
// admitted production GLB and not a generic primitive fallback.
export const USE_PROCEDURAL_STOREHOUSE_CANDIDATE = true;
export const USE_PROCEDURAL_WORKSHOP_CANDIDATE = true;
export const USE_PROCEDURAL_TREE_CANDIDATE = true;
export const USE_PROCEDURAL_INHABITANT_CANDIDATE = true;
export const DWELLING_LOD1_TRIANGLES = 53_538;
export const STOREHOUSE_GLB_TRIANGLES = 15_550;

export class BenchmarkScene implements RuntimeScene {
  private root: Entity | undefined;
  private assets: SceneAssets | undefined;
  private camera: InspectionCamera | undefined;
  private frame: CameraFrame | undefined;
  private readonly materials: StandardMaterial[] = [];
  private readonly meshes: Mesh[] = [];
  private readonly textures: Texture[] = [];
  private water: StandardMaterial | undefined;
  private elapsed = 0;
  private buildings = 0;
  private inhabitants = 0;
  private trees = 0;
  private grassClumps = 0;
  private drawCalls = 0;
  private dwellingTriangles = 0;
  private storehouseTriangles = 0;
  private workshopTriangles = 0;
  private treeTriangles = 0;
  private inhabitantTriangles = 0;
  private readonly foliage: Entity[] = [];
  private app: Application | undefined;
  private destroyed = false;

  constructor(
    private readonly models: BenchmarkModels = ADMITTED_MODELS,
    private readonly assetResolver: AssetResolver = resolveAsset,
  ) {}

  private get active(): boolean {
    return !this.destroyed && Boolean(this.root && this.assets && this.app);
  }

  async enter(app: Application): Promise<void> {
    if (this.root) throw new Error('Benchmark scene already entered');
    this.destroyed = false;
    this.app = app;
    this.root = new Entity('Bohemian stream valley — Phase 1');
    app.root.addChild(this.root);
    this.assets = new SceneAssets(app, this.assetResolver);

    const background = new Color(0.61, 0.68, 0.66);
    app.scene.ambientLight = new Color(0.5, 0.57, 0.64);
    app.scene.fog.type = FOG_LINEAR;
    app.scene.fog.color = background;
    app.scene.fog.start = 95;
    app.scene.fog.end = 225;

    const cameraEntity = new Entity('Benchmark inspection camera');
    cameraEntity.addComponent('camera', { clearColor: background, fov: 43, nearClip: 0.2, farClip: 350 });
    this.root.addChild(cameraEntity);
    this.camera = new InspectionCamera(cameraEntity, app.graphicsDevice.canvas as HTMLCanvasElement, landscape);

    const sun = new Entity('Late afternoon sun');
    sun.addComponent('light', {
      type: 'directional',
      color: new Color(1, 0.92, 0.76),
      intensity: 1.8,
      castShadows: true,
      shadowDistance: 130,
      shadowResolution: 2048,
      numCascades: 3,
      shadowBias: 0.16,
      normalOffsetBias: 0.08,
    });
    sun.setEulerAngles(48, -32, 0);
    this.root.addChild(sun);

    const [ground, mud, forest] = await Promise.all([
      this.groundMaterial('grass_path_2'),
      this.groundMaterial('brown_mud_02'),
      this.groundMaterial('forest_ground_04'),
    ]);
    if (!this.active) return;

    ground.diffuseVertexColor = true;
    ground.update();
    this.surface('Rolling Bohemian ground', terrainMesh(), ground);

    const forestMesh = terrainMesh(110);
    for (let i = 0; i < forestMesh.positions.length; i += 3) {
      const x = forestMesh.positions[i]!;
      const z = forestMesh.positions[i + 2]!;
      forestMesh.positions[i + 1]! += 0.025;
      const alpha = smoothstep(20, 45, -x) * smoothstep(-10, 20, -z) * 0.9;
      forestMesh.colors![i / 3 * 4 + 3] = alpha;
    }
    forest.blendType = BLEND_NORMAL;
    forest.opacityVertexColor = true;
    forest.opacityVertexColorChannel = 'a';
    forest.depthWrite = false;
    forest.update();
    this.surface('Woodland leaf litter', forestMesh, forest);

    mud.blendType = BLEND_NORMAL;
    mud.opacityVertexColor = true;
    mud.opacityVertexColorChannel = 'a';
    mud.diffuseVertexColor = true;
    mud.depthWrite = false;
    mud.update();
    this.surface('Worn earthen path', pathMesh(), mud);

    this.water = this.waterMaterial(app);
    this.surface('Stream surface', riverMesh(), this.water);

    const meadow = createMeadow(app);
    this.materials.push(meadow.material);
    this.grassClumps = meadow.clumps;
    for (const surface of meadow.surfaces) {
      if (!this.active) {
        surface.mesh.destroy();
        surface.entity.destroy();
        continue;
      }
      this.root!.addChild(surface.entity);
      this.meshes.push(surface.mesh);
    }

    await this.populate();
    if (!this.active) return;

    this.frame = new CameraFrame(app, cameraEntity.camera!);
    this.frame.rendering.toneMapping = TONEMAP_ACES;
    this.frame.rendering.samples = 1;
    this.frame.ssao.type = SSAOTYPE_LIGHTING;
    this.frame.ssao.intensity = 0.35;
    this.frame.ssao.radius = 1.2;
    this.frame.ssao.power = 1.8;
    this.frame.ssao.samples = 8;
    this.frame.ssao.scale = 0.5;
    this.frame.taa.enabled = true;
    this.frame.grading.enabled = true;
    this.frame.grading.saturation = 0.93;
    this.frame.grading.contrast = 1.03;
    this.frame.update();
  }

  private async groundMaterial(name: string): Promise<StandardMaterial> {
    const prefix = `materials/terrain/${name}`;
    const [color, normal, rough] = await Promise.all([
      this.assets!.texture(`${prefix}_diff_1k.jpg`),
      this.assets!.texture(`${prefix}_nor_gl_1k.jpg`),
      this.assets!.texture(`${prefix}_rough_1k.jpg`),
    ]);
    const material = new StandardMaterial();
    material.name = name;
    material.diffuseMap = color;
    material.normalMap = normal;
    material.bumpiness = 0.7;
    material.glossMap = rough;
    material.glossMapChannel = 'r';
    material.glossInvert = true;
    material.gloss = 1;
    material.useMetalness = true;
    material.metalness = 0;
    material.update();
    this.materials.push(material);
    return material;
  }

  private waterMaterial(app: Application): StandardMaterial {
    const size = 128;
    const texture = new Texture(app.graphicsDevice, {
      name: 'Analytic ripple normals',
      width: size,
      height: size,
      format: PIXELFORMAT_RGBA8,
      mipmaps: true,
    });
    const pixels = texture.lock() as Uint8Array;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size * Math.PI * 2;
      const v = y / size * Math.PI * 2;
      const nx = Math.cos(u * 3 + v * 2) * 0.12 + Math.cos(u * 7 - v * 3) * 0.07;
      const ny = Math.cos(u * 2 + v * 5) * 0.15;
      const length = Math.hypot(nx, ny, 1);
      const index = (y * size + x) * 4;
      pixels[index] = (nx / length * 0.5 + 0.5) * 255;
      pixels[index + 1] = (ny / length * 0.5 + 0.5) * 255;
      pixels[index + 2] = (1 / length * 0.5 + 0.5) * 255;
      pixels[index + 3] = 255;
    }
    texture.unlock();
    this.textures.push(texture);

    const material = new StandardMaterial();
    material.name = 'Shallow rippled stream';
    material.diffuse = new Color(0.16, 0.29, 0.27);
    material.specular = new Color(0.35, 0.4, 0.38);
    material.gloss = 0.88;
    material.normalMap = texture;
    material.normalMapTiling = new Vec2(3, 2);
    material.bumpiness = 0.5;
    material.opacity = 0.88;
    material.blendType = BLEND_NORMAL;
    material.depthWrite = false;
    material.update();
    this.materials.push(material);
    return material;
  }

  private surface(name: string, data: ReturnType<typeof terrainMesh>, material: StandardMaterial): void {
    if (!this.app || !this.root) return;
    const surface = createSurface(this.app, name, data, material);
    this.root.addChild(surface.entity);
    this.meshes.push(surface.mesh);
  }

  private async populate(): Promise<void> {
    const entries: [string | null, string, number, number][] = [
      [this.models.dwelling, 'Boii dwelling', 4.5, 0],
      [this.models.storehouse, 'Boii storehouse', 3.2, 1],
      [this.models.workshop, 'Boii craft shelter', 3.5, 2],
    ];
    for (const [path, name, height, index] of entries) {
      if (!path || !this.assets) continue;
      const resource = await this.assets.model(path);
      if (!this.active) return;
      const entity = instantiateAtHeight(resource, name, height);
      const pad = SETTLEMENT[index]!;
      entity.setPosition(pad.x, pad.y, pad.z);
      entity.setEulerAngles(0, index === 0 ? 15 : -25, 0);
      this.root!.addChild(entity);
      if (index === 0 && path === ADMITTED_MODELS.dwelling) {
        this.dwellingTriangles = DWELLING_LOD1_TRIANGLES;
      }
      if (index === 1 && path === SUPPLIED_STOREHOUSE_PATH) {
        this.storehouseTriangles = STOREHOUSE_GLB_TRIANGLES;
      }
      this.buildings++;
    }

    if (USE_PROCEDURAL_STOREHOUSE_CANDIDATE && !this.models.storehouse && this.active && this.app && this.root) {
      const candidate = createBoiiStorehouse(this.app);
      const pad = SETTLEMENT[1]!;
      candidate.entity.setPosition(pad.x, pad.y, pad.z);
      candidate.entity.setEulerAngles(0, -25, 0);
      this.root.addChild(candidate.entity);
      this.meshes.push(...candidate.meshes);
      this.materials.push(...candidate.materials);
      this.storehouseTriangles = candidate.stats.triangles;
      this.buildings++;
    }

    if (USE_PROCEDURAL_WORKSHOP_CANDIDATE && !this.models.workshop && this.active && this.app && this.root) {
      const candidate = createBoiiWorkshop(this.app);
      const pad = SETTLEMENT[2]!;
      candidate.entity.setPosition(pad.x, pad.y, pad.z);
      candidate.entity.setEulerAngles(0, 18, 0);
      this.root.addChild(candidate.entity);
      this.meshes.push(...candidate.meshes);
      this.materials.push(...candidate.materials);
      this.workshopTriangles = candidate.stats.triangles;
      this.buildings++;
    }

    if (this.models.inhabitant && this.assets) {
      const resource = await this.assets.model(this.models.inhabitant);
      if (!this.active) return;
      for (const [index, position] of [[-5,1],[-2,3],[4,-5],[-10,9],[12,1]].entries()) {
        const [x, z] = position as [number, number];
        const entity = instantiateAtHeight(resource, `Inhabitant ${index + 1}`, 1.68 + index * 0.025);
        entity.setPosition(x, landscape.heightAt(x, z), z);
        entity.setEulerAngles(0, index * 67, 0);
        this.root!.addChild(entity);
        this.inhabitants++;
      }
    } else if (USE_PROCEDURAL_INHABITANT_CANDIDATE && this.active && this.app && this.root) {
      const candidate = createBoiiInhabitantCandidate(this.app);
      this.meshes.push(candidate.mesh);
      this.materials.push(candidate.material);
      this.inhabitantTriangles = candidate.stats.triangles;
      const positions: [number, number][] = [[-5, 1], [-2, 3], [4, -5], [-10, 9], [12, 1]];
      for (const [index, [x, z]] of positions.entries()) {
        const entity = index === 0 ? candidate.entity : candidate.entity.clone();
        entity.name = `Boii inhabitant readability prototype ${index + 1}`;
        const scale = 0.97 + index * 0.012;
        entity.setLocalScale(scale, scale, scale);
        entity.setPosition(x, landscape.heightAt(x, z), z);
        entity.setEulerAngles(0, index * 67, 0);
        this.root.addChild(entity);
        this.inhabitants++;
      }
    }

    if (this.models.tree && this.assets) {
      const resource = await this.assets.model(this.models.tree);
      if (!this.active) return;
      this.plantTrees(resource);
    } else if (USE_PROCEDURAL_TREE_CANDIDATE && this.active && this.app && this.root) {
      const candidate = createCentralEuropeanTree(this.app);
      this.meshes.push(...candidate.meshes);
      this.materials.push(...candidate.materials);
      this.treeTriangles = candidate.stats.triangles;
      this.plantProceduralTrees(candidate.entity);
    }
  }

  private plantTrees(resource: ContainerResource): void {
    const random = randomGenerator(31415);
    for (let i = 0; i < 45; i++) {
      const x = -65 + random() * 110;
      const z = -60 + random() * 80;
      if (Math.hypot(x, z) < 28 || Math.abs(x - riverCenter(z)) < 8) continue;
      const tree = instantiateAtHeight(resource, `Deciduous tree ${i}`, 10 + random() * 6);
      tree.setPosition(x, landscape.heightAt(x, z), z);
      tree.setEulerAngles(0, random() * 360, 0);
      this.root!.addChild(tree);
      this.foliage.push(tree);
      this.trees++;
    }
  }

  private plantProceduralTrees(template: Entity): void {
    if (!this.root) {
      template.destroy();
      return;
    }
    const random = randomGenerator(271828);
    let planted = 0;
    for (let attempt = 0; attempt < 180 && planted < 32; attempt++) {
      const x = -92 + random() * 166;
      const z = -88 + random() * 164;
      if (Math.hypot(x, z) < 34) continue;
      if (Math.abs(x - riverCenter(z)) < 10) continue;
      if (Math.abs(z - pathCenter(x)) < 5.5) continue;

      const tree = planted === 0 ? template : template.clone();
      tree.name = `Procedural deciduous tree ${planted + 1}`;
      const scale = 0.80 + random() * 0.32;
      tree.setLocalScale(scale, scale * (0.94 + random() * 0.12), scale);
      tree.setPosition(x, landscape.heightAt(x, z), z);
      tree.setEulerAngles(0, random() * 360, 0);
      this.root.addChild(tree);
      this.foliage.push(tree);
      this.trees++;
      planted++;
    }
    if (planted === 0) template.destroy();
  }

  setView(view: ViewName): void {
    this.camera?.setView(view);
  }

  fixedUpdate(_dt: number, _tick: number): void {}

  update(dt: number, _alpha: number): void {
    this.camera?.update(dt);
    this.elapsed += dt;
    if (this.water) this.water.normalMapOffset.set(this.elapsed * 0.009, this.elapsed * 0.015);
    this.frame?.update();
    this.drawCalls = this.app?.stats.drawCalls.total ?? 0;
  }

  diagnostics(): Record<string, string | number | boolean> {
    return {
      milestone: 'phase-1',
      artGatePassed: false,
      terrainMetres: 220,
      structures: this.buildings,
      inhabitants: this.inhabitants,
      inhabitantCandidate: this.inhabitantTriangles > 0 ? 'procedural-project-owned-readability-prototype' : 'absent',
      inhabitantTriangles: this.inhabitantTriangles,
      trees: this.trees,
      grassClumps: this.grassClumps,
      dwellingCandidate: this.dwellingTriangles > 0 ? 'trellis-derived-generated-lod1' : 'custom-or-absent',
      dwellingLod: this.dwellingTriangles > 0 ? 1 : 0,
      dwellingTriangles: this.dwellingTriangles,
      storehouseCandidate: this.storehouseTriangles > 0
        ? (this.models.storehouse ? 'project-owned-glb' : 'procedural-project-owned')
        : 'absent',
      storehouseTriangles: this.storehouseTriangles,
      workshopCandidate: this.workshopTriangles > 0 ? 'procedural-project-owned' : 'absent',
      workshopTriangles: this.workshopTriangles,
      treeCandidate: this.treeTriangles > 0 ? 'procedural-project-owned' : 'absent',
      treeCandidateTriangles: this.treeTriangles,
      drawCalls: this.drawCalls,
    };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.camera?.destroy();
    this.camera = undefined;
    this.frame?.destroy();
    this.frame = undefined;
    this.root?.destroy();
    this.root = undefined;
    for (const mesh of this.meshes) mesh.destroy();
    this.meshes.length = 0;
    for (const material of this.materials) material.destroy();
    this.materials.length = 0;
    for (const texture of this.textures) texture.destroy();
    this.textures.length = 0;
    this.assets?.destroy();
    this.assets = undefined;
    this.foliage.length = 0;
    this.water = undefined;
    this.dwellingTriangles = 0;
    this.storehouseTriangles = 0;
    this.workshopTriangles = 0;
    this.treeTriangles = 0;
    this.inhabitantTriangles = 0;
    this.app = undefined;
  }
}