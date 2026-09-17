import { Color, Entity, StandardMaterial, type Application } from 'playcanvas';
import type { RuntimeScene } from './scene';

/** Disposable graphics/scale check, deliberately NOT the Phase 1 art benchmark. */
export class CalibrationScene implements RuntimeScene {
  private root: Entity | undefined;
  private readonly materials: StandardMaterial[] = [];

  enter(app: Application): void {
    if (this.root) throw new Error('Scene already entered');
    this.root = new Entity('Phase 0 calibration');
    app.root.addChild(this.root);

    const camera = new Entity('Static inspection camera');
    camera.addComponent('camera', {
      clearColor: new Color(0.09, 0.12, 0.13),
      fov: 45, nearClip: 0.1, farClip: 250,
    });
    camera.setPosition(11, 12, 17);
    camera.lookAt(0, 0, 0);
    this.root.addChild(camera);

    const sun = new Entity('Calibration sun');
    sun.addComponent('light', {
      type: 'directional', color: new Color(1, 0.94, 0.82), intensity: 1.5,
      castShadows: true, shadowDistance: 45, shadowResolution: 1024,
      shadowBias: 0.2, normalOffsetBias: 0.05,
    });
    sun.setEulerAngles(45, 35, 0);
    this.root.addChild(sun);
    app.scene.ambientLight = new Color(0.32, 0.36, 0.4);

    const groundMaterial = this.material(new Color(0.24, 0.29, 0.25));
    const markerMaterial = this.material(new Color(0.68, 0.53, 0.28));
    const floor = new Entity('20 metre calibration floor — greybox');
    floor.addComponent('render', { type: 'plane', material: groundMaterial });
    floor.setLocalScale(20, 1, 20);
    this.root.addChild(floor);

    const marker = new Entity('1.8 metre scale marker — greybox');
    marker.addComponent('render', { type: 'box', material: markerMaterial });
    marker.setLocalScale(0.45, 1.8, 0.45);
    marker.setLocalPosition(0, 0.9, 0);
    this.root.addChild(marker);
  }

  private material(color: Color): StandardMaterial {
    const material = new StandardMaterial();
    material.diffuse = color;
    material.useMetalness = true;
    material.metalness = 0;
    material.gloss = 0.15;
    material.update();
    this.materials.push(material);
    return material;
  }

  fixedUpdate(_dtSeconds: number, _tick: number): void { /* no gameplay yet */ }
  update(_dtSeconds: number, _interpolationAlpha: number): void { /* static view */ }

  destroy(): void {
    this.root?.destroy();
    this.root = undefined;
    for (const material of this.materials) material.destroy();
    this.materials.length = 0;
  }
}
