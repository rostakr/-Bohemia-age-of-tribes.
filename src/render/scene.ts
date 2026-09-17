import type { Application } from 'playcanvas';

/** A scene owns its entities, materials and subscriptions. Destroy is idempotent. */
export interface RuntimeScene {
  enter(app: Application): void | Promise<void>;
  fixedUpdate(dtSeconds: number, tick: number): void;
  update(dtSeconds: number, interpolationAlpha: number): void;
  destroy(): void;
}
