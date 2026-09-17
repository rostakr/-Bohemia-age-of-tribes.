import { BLEND_NORMAL, CameraFrame, Color, Entity, FOG_LINEAR, PIXELFORMAT_RGBA8, SSAOTYPE_LIGHTING,
  StandardMaterial, Texture, TONEMAP_ACES, Vec2, type Application, type Mesh, type ContainerResource } from 'playcanvas';
import type { RuntimeScene } from './scene';
import { SceneAssets, instantiateAtHeight } from './scene-assets';
import { createSurface, landscape, pathMesh, riverMarginMesh, riverMesh, terrainMesh, SETTLEMENT, randomGenerator, riverCenter, smoothstep } from './landscape';
import { InspectionCamera, type ViewName } from './inspection-camera';
import { createMeadow } from './meadow';

export interface BenchmarkModels {
  dwelling: string | null;
  storehouse: string | null;
  workshop: string | null;
  inhabitant: string | null;
  tree: string | null;
}

// Never silently replace missing production models with primitives.
export const ADMITTED_MODELS: BenchmarkModels = {
  dwelling: 'assets/buildings/boii_dwelling_rectangular.glb',
  storehouse: null, workshop: null, inhabitant: null, tree: null,
};

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
  private readonly foliage: Entity[] = [];
  private app: Application | undefined;

  constructor(private readonly models: BenchmarkModels = ADMITTED_MODELS) {}

  async enter(app: Application): Promise<void> {
    if (this.root) throw new Error('Benchmark scene already entered');
    this.app = app;
    this.root = new Entity('Bohemian stream valley — Phase 1');
    app.root.addChild(this.root);
    this.assets = new SceneAssets(app);

    const background = new Color(0.59, 0.64, 0.63);
    app.scene.ambientLight = new Color(0.47, 0.51, 0.5);
    app.scene.fog.type = FOG_LINEAR;
    app.scene.fog.color = background;
    app.scene.fog.start = 112;
    app.scene.fog.end = 240;
    const cameraEntity = new Entity('Benchmark inspection camera');
    cameraEntity.addComponent('camera', { clearColor: background, fov: 43, nearClip: 0.2, farClip: 350 });
    this.root.addChild(cameraEntity);
    this.camera = new InspectionCamera(cameraEntity, app.graphicsDevice.canvas as HTMLCanvasElement, landscape);

    const sun = new Entity('Soft daylight');
    sun.addComponent('light', { type: 'directional', color: new Color(1, 0.96, 0.89), intensity: 1.28,
      castShadows: true, shadowDistance: 130, shadowResolution: 2048, numCascades: 3,
      shadowBias: 0.16, normalOffsetBias: 0.08 });
    sun.setEulerAngles(53, -36, 0);
    this.root.addChild(sun);

    const [ground, mud, forest] = await Promise.all([
      this.groundMaterial('grass_path_2'), this.groundMaterial('brown_mud_02'), this.groundMaterial('forest_ground_04'),
    ]);
    ground.diffuseVertexColor = true;
    ground.update();
    this.surface('Rolling Bohemian ground', terrainMesh(), ground);

    const forestMesh = terrainMesh(110);
    for (let i = 0; i < forestMesh.positions.length; i += 3) {
      const x = forestMesh.positions[i]!, z = forestMesh.positions[i + 2]!;
      forestMesh.positions[i + 1]! += 0.025;
      const alpha = smoothstep(20, 45, -x) * smoothstep(-10, 20, -z) * 0.84;
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
    this.surface('Damp stream margins', riverMarginMesh(), mud);

    this.water = this.waterMaterial(app);
    this.surface('Stream surface', riverMesh(), this.water);

    const meadow = createMeadow(app);
    this.materials.push(meadow.material);
    this.grassClumps = meadow.clumps;
    for (const surface of meadow.surfaces) { this.root.addChild(surface.entity); this.meshes.push(surface.mesh); }

    await this.populate();
    this.frame = new CameraFrame(app, cameraEntity.camera!);
    this.frame.rendering.toneMapping = TONEMAP_ACES;
    this.frame.rendering.samples = 1;
    this.frame.ssao.type = SSAOTYPE_LIGHTING;
    this.frame.ssao.intensity = 0.3;
    this.frame.ssao.radius = 1.15;
    this.frame.ssao.power = 1.65;
    this.frame.ssao.samples = 8;
    this.frame.ssao.scale = 0.5;
    this.frame.taa.enabled = true;
    this.frame.grading.enabled = true;
    this.frame.grading.saturation = 0.88;
    this.frame.grading.contrast = 1.045;
    this.frame.update();
  }

  private async groundMaterial(name: string): Promise<StandardMaterial> {
    const prefix = `assets/materials/terrain/${name}`;
    const [color, normal, rough] = await Promise.all([
      this.assets!.texture(`${prefix}_diff_1k.jpg`), this.assets!.texture(`${prefix}_nor_gl_1k.jpg`), this.assets!.texture(`${prefix}_rough_1k.jpg`),
    ]);
    const material = new StandardMaterial();
    material.name = name;
    material.diffuseMap = color;
    material.normalMap = normal;
    material.bumpiness = 0.62;
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
    const texture = new Texture(app.graphicsDevice, { name: 'Analytic ripple normals', width: size, height: size,
      format: PIXELFORMAT_RGBA8, mipmaps: true });
    const pixels = texture.lock() as Uint8Array;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2;
      const nx = Math.cos(u * 3 + v * 2) * 0.085 + Math.cos(u * 7 - v * 3) * 0.045;
      const ny = Math.cos(u * 2 + v * 5) * 0.1;
      const length = Math.hypot(nx, ny, 1), index = (y * size + x) * 4;
      pixels[index] = (nx / length * 0.5 + 0.5) * 255;
      pixels[index + 1] = (ny / length * 0.5 + 0.5) * 255;
      pixels[index + 2] = (1 / length * 0.5 + 0.5) * 255;
      pixels[index + 3] = 255;
    }
    texture.unlock();
    this.textures.push(texture);

    const material = new StandardMaterial();
    material.name = 'Shallow rippled stream';
    material.diffuse = new Color(0.22, 0.29, 0.25);
    material.diffuseVertexColor = true;
    material.specular = new Color(0.42, 0.46, 0.44);
    material.gloss = 0.78;
    material.normalMap = texture;
    material.normalMapTiling = new Vec2(2.1, 1.55);
    material.bumpiness = 0.28;
    material.opacity = 1;
    material.opacityVertexColor = true;
    material.opacityVertexColorChannel = 'a';
    material.blendType = BLEND_NORMAL;
    material.depthWrite = false;
    material.update();
    this.materials.push(material);
    return material;
  }

  private surface(name: string, data: ReturnType<typeof terrainMesh>, material: StandardMaterial): void {
    const surface = createSurface(this.app!, name, data, material);
    this.root!.addChild(surface.entity); this.meshes.push(surface.mesh);
  }

  private async populate(): Promise<void> {
    const entries: [string | null, string, number, number][] = [
      [this.models.dwelling, 'Boii dwelling', 4.5, 0], [this.models.storehouse, 'Boii storehouse', 3.2, 1],
      [this.models.workshop, 'Boii craft shelter', 3.5, 2],
    ];
    for (const [path, name, height, index] of entries) {
      if (!path) continue;
      const resource = await this.assets!.model(path);
      const entity = instantiateAtHeight(resource, name, height);
      const pad = SETTLEMENT[index]!;
      entity.setPosition(pad.x, pad.y, pad.z);
      entity.setEulerAngles(0, index === 0 ? 15 : -25, 0);
      this.root!.addChild(entity); this.buildings++;
    }
    if (this.models.inhabitant) {
      const resource = await this.assets!.model(this.models.inhabitant);
      for (const [index, position] of [[-5,1],[-2,3],[4,-5],[-10,9],[12,1]].entries()) {
        const [x, z] = position as [number, number];
        const entity = instantiateAtHeight(resource, `Inhabitant ${index + 1}`, 1.68 + index * 0.025);
        entity.setPosition(x, landscape.heightAt(x, z), z);
        entity.setEulerAngles(0, index * 67, 0);
        this.root!.addChild(entity); this.inhabitants++;
      }
    }
    if (this.models.tree) this.plantTrees(await this.assets!.model(this.models.tree));
  }

  private plantTrees(resource: ContainerResource): void {
    const random = randomGenerator(31415);
    for (let i = 0; i < 45; i++) {
      const x = -65 + random() * 110, z = -60 + random() * 80;
      if (Math.hypot(x, z) < 28 || Math.abs(x - riverCenter(z)) < 8) continue;
      const tree = instantiateAtHeight(resource, `Deciduous tree ${i}`, 10 + random() * 6);
      tree.setPosition(x, landscape.heightAt(x,z), z);
      tree.setEulerAngles(0, random() * 360, 0);
      this.root!.addChild(tree); this.foliage.push(tree); this.trees++;
    }
  }

  setView(view: ViewName): void { this.camera?.setView(view); }
  fixedUpdate(_dt: number, _tick: number): void { }
  update(dt: number, _alpha: number): void {
    this.camera?.update(dt);
    this.elapsed += dt;
    if (this.water) this.water.normalMapOffset.set(this.elapsed * 0.005, this.elapsed * 0.008);
    this.frame?.update();
    this.drawCalls = this.app?.stats.drawCalls.total ?? 0;
  }

  diagnostics(): Record<string, string | number | boolean> {
    return { milestone: 'phase-1', artGatePassed: false, terrainMetres: 220, structures: this.buildings,
      inhabitants: this.inhabitants, trees: this.trees, grassClumps: this.grassClumps, drawCalls: this.drawCalls };
  }

  destroy(): void {
    this.camera?.destroy(); this.camera = undefined;
    this.frame?.destroy(); this.frame = undefined;
    this.root?.destroy(); this.root = undefined;
    for (const mesh of this.meshes) mesh.destroy(); this.meshes.length = 0;
    for (const material of this.materials) material.destroy(); this.materials.length = 0;
    for (const texture of this.textures) texture.destroy(); this.textures.length = 0;
    this.assets?.destroy(); this.assets = undefined;
    this.foliage.length = 0;
    this.water = undefined; this.app = undefined;
  }
}
