import { Color, Entity, StandardMaterial, type Application } from 'playcanvas';
import type { RuntimeScene } from './scene';
import { SceneAssets, instantiateAtHeight } from './scene-assets';

export type SuppliedPreviewKind = 'workshop' | 'worker';

interface PreviewSpec {
  path: string;
  label: string;
  targetHeight: number;
  triangles: number;
  camera: [number, number, number];
  target: [number, number, number];
  initialYaw: number;
}

const PREVIEWS: Record<SuppliedPreviewKind, PreviewSpec> = {
  workshop: {
    path: 'buildings/boii_carpentry_shed_open_qa_preview.glb',
    label: 'Supplied workshop normals preview',
    targetHeight: 3.5,
    triangles: 89_778,
    camera: [6.4, 4.4, 7.8],
    target: [0, 1.65, 0],
    initialYaw: 28,
  },
  worker: {
    path: 'characters/boii_adult_worker_qa_preview.glb',
    label: 'Supplied worker normals preview',
    targetHeight: 1.72,
    triangles: 14_106,
    camera: [3.0, 2.15, 4.2],
    target: [0, 0.9, 0],
    initialYaw: 18,
  },
};

export class SuppliedPreviewScene implements RuntimeScene {
  private root: Entity | undefined;
  private assets: SceneAssets | undefined;
  private groundMaterial: StandardMaterial | undefined;
  private app: Application | undefined;
  private model: Entity | undefined;
  private elapsed = 0;
  private drawCalls = 0;
  private modelLoaded = false;
  private destroyed = false;

  constructor(private readonly kind: SuppliedPreviewKind) {}

  async enter(app: Application): Promise<void> {
    if (this.root) throw new Error('Supplied preview scene already entered');
    this.destroyed = false;
    this.app = app;
    this.root = new Entity(`Supplied ${this.kind} QA preview`);
    app.root.addChild(this.root);
    this.assets = new SceneAssets(app);

    app.scene.ambientLight = new Color(0.46, 0.48, 0.45);

    const camera = new Entity('Supplied preview camera');
    camera.addComponent('camera', {
      clearColor: new Color(0.56, 0.60, 0.58),
      fov: 42,
      nearClip: 0.05,
      farClip: 100,
    });
    const spec = PREVIEWS[this.kind];
    camera.setPosition(...spec.camera);
    camera.lookAt(...spec.target);
    this.root.addChild(camera);

    const key = new Entity('Supplied preview key light');
    key.addComponent('light', {
      type: 'directional',
      color: new Color(1, 0.93, 0.82),
      intensity: 1.65,
      castShadows: true,
      shadowDistance: 30,
      shadowResolution: 2048,
    });
    key.setEulerAngles(48, 32, 0);
    this.root.addChild(key);

    const fill = new Entity('Supplied preview fill light');
    fill.addComponent('light', {
      type: 'directional',
      color: new Color(0.58, 0.67, 0.78),
      intensity: 0.45,
      castShadows: false,
    });
    fill.setEulerAngles(65, -135, 0);
    this.root.addChild(fill);

    const ground = new Entity('Supplied preview ground');
    ground.addComponent('render', { type: 'plane', castShadows: false, receiveShadows: true });
    ground.setLocalScale(14, 1, 14);
    this.groundMaterial = new StandardMaterial();
    this.groundMaterial.name = 'Neutral QA ground';
    this.groundMaterial.diffuse = new Color(0.29, 0.31, 0.27);
    this.groundMaterial.gloss = 0.03;
    this.groundMaterial.update();
    for (const instance of ground.render?.meshInstances ?? []) instance.material = this.groundMaterial;
    this.root.addChild(ground);

    const resource = await this.assets.model(spec.path);
    if (this.destroyed || !this.root) return;
    const model = instantiateAtHeight(resource, spec.label, spec.targetHeight);
    model.setPosition(0, 0, 0);
    model.setEulerAngles(0, spec.initialYaw, 0);
    this.root.addChild(model);
    this.model = model;
    this.modelLoaded = true;
  }

  fixedUpdate(_dtSeconds: number, _tick: number): void {}

  update(dtSeconds: number, _interpolationAlpha: number): void {
    this.elapsed += dtSeconds;
    const spec = PREVIEWS[this.kind];
    this.model?.setEulerAngles(0, spec.initialYaw + this.elapsed * 20, 0);
    this.drawCalls = this.app?.stats.drawCalls.total ?? 0;
  }

  diagnostics(): Record<string, string | number | boolean> {
    const spec = PREVIEWS[this.kind];
    return {
      milestone: 'phase-1-supplied-preview',
      artGatePassed: false,
      previewAsset: this.kind,
      previewSource: spec.path,
      previewTriangles: spec.triangles,
      previewYawDegrees: (spec.initialYaw + this.elapsed * 20) % 360,
      modelLoaded: this.modelLoaded,
      drawCalls: this.drawCalls,
    };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.root?.destroy();
    this.root = undefined;
    this.model = undefined;
    this.assets?.destroy();
    this.assets = undefined;
    this.groundMaterial?.destroy();
    this.groundMaterial = undefined;
    this.app = undefined;
    this.elapsed = 0;
    this.modelLoaded = false;
    this.drawCalls = 0;
  }
}
