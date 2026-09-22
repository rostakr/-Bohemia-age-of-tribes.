import { Color, Entity, StandardMaterial, type Application } from 'playcanvas';
import type { RuntimeScene, SceneDiagnostics } from './scene';
import { SceneAssets, instantiateAtHeight } from './scene-assets';

const WORKER_PATH = 'characters/boii_adult_worker_project.glb';

/** QA-only close-up scene for the project-owned adult-worker candidate. */
export class WorkerPreviewScene implements RuntimeScene {
  private root: Entity | undefined;
  private assets: SceneAssets | undefined;
  private groundMaterial: StandardMaterial | undefined;
  private app: Application | undefined;
  private loaded = false;
  private destroyed = false;
  private drawCalls = 0;

  async enter(app: Application): Promise<void> {
    if (this.root) throw new Error('Worker preview scene already entered');
    this.destroyed = false;
    this.app = app;
    this.root = new Entity('Project adult worker QA close-up');
    app.root.addChild(this.root);
    this.assets = new SceneAssets(app);

    app.scene.ambientLight = new Color(0.46, 0.48, 0.50);

    const camera = new Entity('Worker preview camera');
    camera.addComponent('camera', {
      clearColor: new Color(0.36, 0.39, 0.39),
      fov: 32,
      nearClip: 0.05,
      farClip: 20,
    });
    camera.setPosition(1.65, 1.22, 3.25);
    camera.lookAt(0, 0.90, 0);
    this.root.addChild(camera);

    const key = new Entity('Worker preview key');
    key.addComponent('light', {
      type: 'directional',
      color: new Color(1.0, 0.93, 0.82),
      intensity: 1.65,
      castShadows: true,
      shadowResolution: 1024,
      shadowDistance: 12,
      shadowBias: 0.15,
      normalOffsetBias: 0.06,
    });
    key.setEulerAngles(48, -38, 0);
    this.root.addChild(key);

    const fill = new Entity('Worker preview fill');
    fill.addComponent('light', {
      type: 'directional',
      color: new Color(0.58, 0.67, 0.78),
      intensity: 0.72,
      castShadows: false,
    });
    fill.setEulerAngles(58, 132, 0);
    this.root.addChild(fill);

    const ground = new Entity('Worker preview ground');
    ground.addComponent('render', { type: 'plane' });
    ground.setLocalScale(4, 1, 4);
    this.groundMaterial = new StandardMaterial();
    this.groundMaterial.name = 'Worker preview neutral ground';
    this.groundMaterial.diffuse = new Color(0.34, 0.32, 0.28);
    this.groundMaterial.useMetalness = true;
    this.groundMaterial.metalness = 0;
    this.groundMaterial.gloss = 0.08;
    this.groundMaterial.update();
    for (const instance of ground.render?.meshInstances ?? []) {
      instance.material = this.groundMaterial;
      instance.receiveShadow = true;
    }
    this.root.addChild(ground);

    const resource = await this.assets.model(WORKER_PATH);
    if (this.destroyed || !this.root) return;
    const worker = instantiateAtHeight(resource, 'Boii adult worker project candidate', 1.72);
    worker.setEulerAngles(0, -18, 0);
    this.root.addChild(worker);
    this.loaded = true;
  }

  fixedUpdate(_dtSeconds: number, _tick: number): void {}

  update(_dtSeconds: number, _interpolationAlpha: number): void {
    this.drawCalls = this.app?.stats.drawCalls.total ?? 0;
  }

  diagnostics(): SceneDiagnostics {
    return {
      milestone: 'phase-1-worker-preview',
      artGatePassed: false,
      workerPreview: true,
      workerLoaded: this.loaded,
      workerPath: WORKER_PATH,
      workerTargetHeight: 1.72,
      drawCalls: this.drawCalls,
    };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.loaded = false;
    this.drawCalls = 0;
    this.root?.destroy();
    this.root = undefined;
    this.groundMaterial?.destroy();
    this.groundMaterial = undefined;
    this.assets?.destroy();
    this.assets = undefined;
    this.app = undefined;
  }
}
