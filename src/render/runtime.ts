import {
  Application,
  createGraphicsDevice,
  DEVICETYPE_WEBGL2,
  DEVICETYPE_WEBGPU,
  RESOLUTION_AUTO,
  type GraphicsDevice,
} from 'playcanvas';
import { CONFIG } from '../config';
import { FixedStepClock } from '../core/fixed-step';
import { FrameTelemetry } from '../debug/telemetry';
import type { RuntimeScene } from './scene';

export type RendererPreference = 'auto' | 'webgl2';

export interface GameRuntimeOptions {
  canvas: HTMLCanvasElement;
  scene: RuntimeScene;
  renderer?: RendererPreference;
  onFailure?: (error: unknown) => void;
}

export interface RuntimeSnapshot {
  milestone: 'phase-0';
  renderer: string;
  tick: number;
  paused: boolean;
  hidden: boolean;
  deviceLost: boolean;
  failed: boolean;
  initialized: boolean;
  started: boolean;
  destroyed: boolean;
  width: number;
  height: number;
  samples: number;
  frameMs: number;
  fps: number;
  simulationMs: number;
  droppedSeconds: number;
}

export interface GameRuntime {
  initialize(): Promise<void>;
  start(): void;
  pause(): void;
  resume(): void;
  resize(width: number, height: number, pixelRatio?: number): void;
  setVisibility(hidden: boolean): void;
  snapshot(): RuntimeSnapshot;
  destroy(): void;
}

class PlayCanvasGameRuntime implements GameRuntime {
  private canvas: HTMLCanvasElement | undefined;
  private scene: RuntimeScene | undefined;
  private onFailure: ((error: unknown) => void) | undefined;
  private readonly rendererPreference: RendererPreference;
  private device: GraphicsDevice | undefined;
  private app: Application | undefined;
  private readonly clock = new FixedStepClock(CONFIG.simulationHz, CONFIG.maxCatchUpSteps, CONFIG.maxFrameDeltaSeconds);
  private readonly telemetry = new FrameTelemetry(CONFIG.telemetrySamples);
  private initializePromise: Promise<void> | undefined;
  private initialized = false;
  private started = false;
  private paused = false;
  private hidden = false;
  private destroyed = false;
  private skipNextDelta = true;
  private deviceLost = false;
  private failed = false;
  private pendingWidth = 1;
  private pendingHeight = 1;
  private pendingPixelRatio = 1;
  private lastRenderer = 'uninitialized';
  private lastWidth = 1;
  private lastHeight = 1;

  constructor(options: GameRuntimeOptions) {
    this.canvas = options.canvas;
    this.scene = options.scene;
    this.rendererPreference = options.renderer ?? 'auto';
    this.onFailure = options.onFailure;
    this.pendingWidth = Math.max(1, options.canvas.clientWidth || options.canvas.width || 1);
    this.pendingHeight = Math.max(1, options.canvas.clientHeight || options.canvas.height || 1);
  }

  initialize(): Promise<void> {
    if (this.destroyed) return Promise.reject(new Error('Runtime already destroyed'));
    if (this.initialized) return Promise.resolve();
    if (!this.initializePromise) this.initializePromise = this.initializeInternal();
    return this.initializePromise;
  }

  private async initializeInternal(): Promise<void> {
    const canvas = this.canvas;
    const scene = this.scene;
    if (!canvas || !scene) throw new Error('Runtime has no canvas or scene');

    let device: GraphicsDevice | undefined;
    try {
      device = await createGraphicsDevice(canvas, {
        deviceTypes: this.rendererPreference === 'webgl2' ? [DEVICETYPE_WEBGL2] : [DEVICETYPE_WEBGPU, DEVICETYPE_WEBGL2],
        antialias: true,
        powerPreference: 'high-performance',
      });
      if (this.destroyed) {
        device.destroy();
        return;
      }

      this.device = device;
      this.lastRenderer = device.deviceType;
      const app = new Application(canvas, { graphicsDevice: device });
      this.app = app;
      app.setCanvasResolution(RESOLUTION_AUTO);
      device.on('devicelost', this.handleDeviceLost);
      device.on('devicerestored', this.handleDeviceRestored);
      app.on('update', this.handleUpdate);
      this.applyResize();
      await scene.enter(app);

      if (this.destroyed) return;
      app.autoRender = !this.hidden;
      this.initialized = true;
    } catch (error) {
      if (!this.destroyed) {
        this.failed = true;
        this.onFailure?.(error);
      }
      this.destroy();
      throw error;
    } finally {
      this.initializePromise = undefined;
    }
  }

  start(): void {
    if (this.destroyed) throw new Error('Runtime already destroyed');
    if (!this.initialized || !this.app) throw new Error('Runtime must be initialized before start');
    if (this.started) return;
    this.started = true;
    this.app.start();
  }

  pause(): void {
    if (this.destroyed) return;
    this.paused = true;
    this.clock.discardPendingTime();
    this.skipNextDelta = true;
  }

  resume(): void {
    if (this.destroyed) return;
    this.paused = false;
    this.clock.discardPendingTime();
    this.skipNextDelta = true;
  }

  resize(width: number, height: number, pixelRatio = 1): void {
    this.pendingWidth = Math.max(1, Math.floor(width));
    this.pendingHeight = Math.max(1, Math.floor(height));
    this.pendingPixelRatio = Math.max(0.1, Math.min(pixelRatio || 1, CONFIG.maxPixelRatio));
    this.applyResize();
  }

  private applyResize(): void {
    const device = this.device;
    const app = this.app;
    if (!device || !app || this.destroyed) return;
    device.maxPixelRatio = this.pendingPixelRatio;
    app.resizeCanvas(this.pendingWidth, this.pendingHeight);
    this.lastWidth = device.width;
    this.lastHeight = device.height;
  }

  setVisibility(hidden: boolean): void {
    if (this.destroyed) return;
    this.hidden = hidden;
    this.clock.discardPendingTime();
    this.skipNextDelta = true;
    if (this.app) this.app.autoRender = !hidden && !this.failed;
  }

  private readonly handleDeviceLost = (): void => {
    this.deviceLost = true;
    this.clock.discardPendingTime();
    this.skipNextDelta = true;
  };

  private readonly handleDeviceRestored = (): void => {
    this.deviceLost = false;
    this.clock.discardPendingTime();
    this.skipNextDelta = true;
  };

  private readonly handleUpdate = (deltaSeconds: number): void => {
    if (this.destroyed || this.failed || this.hidden || this.deviceLost || !this.scene) return;
    try {
      const dt = this.skipNextDelta ? 0 : deltaSeconds;
      this.skipNextDelta = false;
      const start = performance.now();
      const result = this.clock.advance(this.paused ? 0 : dt, (fixedDt, tick) => this.scene!.fixedUpdate(fixedDt, tick));
      const simulationMs = performance.now() - start;
      this.scene.update(Math.min(dt, CONFIG.maxFrameDeltaSeconds), result.alpha);
      if (dt > 0) this.telemetry.record(dt * 1000, simulationMs, result.droppedSeconds);
    } catch (error) {
      this.failed = true;
      if (this.app) this.app.autoRender = false;
      this.onFailure?.(error);
    }
  };

  snapshot(): RuntimeSnapshot {
    const device = this.device;
    if (device) {
      this.lastRenderer = device.deviceType;
      this.lastWidth = device.width;
      this.lastHeight = device.height;
    }
    return {
      milestone: 'phase-0',
      renderer: this.lastRenderer,
      tick: this.clock.tick,
      paused: this.paused,
      hidden: this.hidden,
      deviceLost: this.deviceLost,
      failed: this.failed,
      initialized: this.initialized,
      started: this.started,
      destroyed: this.destroyed,
      width: this.lastWidth,
      height: this.lastHeight,
      ...this.telemetry.snapshot(),
    };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    const app = this.app;
    const device = this.device;
    if (app) app.off('update', this.handleUpdate);
    if (device) {
      device.off('devicelost', this.handleDeviceLost);
      device.off('devicerestored', this.handleDeviceRestored);
    }
    this.scene?.destroy();
    if (app) app.destroy();
    else device?.destroy();
    this.app = undefined;
    this.device = undefined;
    this.scene = undefined;
    this.canvas = undefined;
    this.onFailure = undefined;
    this.initialized = false;
    this.started = false;
  }
}

export function createGameRuntime(options: GameRuntimeOptions): GameRuntime {
  return new PlayCanvasGameRuntime(options);
}

export type Runtime = GameRuntime;
