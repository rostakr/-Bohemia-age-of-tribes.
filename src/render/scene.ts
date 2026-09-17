import type { Application } from 'playcanvas';

export type SceneDiagnostics = Record<string, string | number | boolean>;

/** A scene owns its entities, materials and subscriptions. Destroy is idempotent. */
export interface RuntimeScene {
  enter(app: Application): void | Promise<void>;
  fixedUpdate(dtSeconds: number, tick: number): void;
  update(dtSeconds: number, interpolationAlpha: number): void;
  diagnostics?(): SceneDiagnostics;
  destroy(): void;
}
