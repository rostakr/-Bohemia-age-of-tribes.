import { Application, createGraphicsDevice, DEVICETYPE_WEBGPU, DEVICETYPE_WEBGL2,
  RESOLUTION_AUTO, type GraphicsDevice } from 'playcanvas';
import { CONFIG } from '../config';
import { FixedStepClock } from '../core/fixed-step';
import { FrameTelemetry } from '../debug/telemetry';
import type { RuntimeScene } from './scene';

export async function createRuntime(
  canvas: HTMLCanvasElement,
  scene: RuntimeScene,
  forceWebGL2: boolean,
  onFailure: (error: unknown) => void,
) {
  const device: GraphicsDevice = await createGraphicsDevice(canvas, {
    deviceTypes: forceWebGL2 ? [DEVICETYPE_WEBGL2] : [DEVICETYPE_WEBGPU, DEVICETYPE_WEBGL2],
    antialias: true, powerPreference: 'high-performance',
  });
  let app: Application | undefined;
  const events = new AbortController();
  const clock = new FixedStepClock(CONFIG.simulationHz, CONFIG.maxCatchUpSteps, CONFIG.maxFrameDeltaSeconds);
  const telemetry = new FrameTelemetry(CONFIG.telemetrySamples);
  let paused = false;
  let destroyed = false;
  let skipNextDelta = true;
  let deviceLost = false;
  let failed = false;

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    events.abort();
    scene.destroy();
    device.off('devicelost', onDeviceLost);
    device.off('devicerestored', onDeviceRestored);
    if (app) app.destroy();
    else device.destroy();
  }

  function onDeviceLost(): void {
    deviceLost = true;
    clock.discardPendingTime();
    skipNextDelta = true;
  }
  function onDeviceRestored(): void {
    deviceLost = false;
    skipNextDelta = true;
  }

  try {
    device.maxPixelRatio = Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio);
    app = new Application(canvas, { graphicsDevice: device });
    app.setCanvasResolution(RESOLUTION_AUTO);
    const resize = () => {
      device.maxPixelRatio = Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio);
      // resizeCanvas writes inline pixel sizes; use viewport, not stale clientWidth.
      app!.resizeCanvas(Math.max(1, window.innerWidth), Math.max(1, window.innerHeight));
    };
    resize();
    window.addEventListener('resize', resize, { signal: events.signal });
    document.addEventListener('visibilitychange', () => {
      clock.discardPendingTime();
      skipNextDelta = true;
      app!.autoRender = !document.hidden;
    }, { signal: events.signal });
    device.on('devicelost', onDeviceLost);
    device.on('devicerestored', onDeviceRestored);
    scene.enter(app);
    app.autoRender = !document.hidden;
    app.on('update', (deltaSeconds: number) => {
      if (destroyed || failed || document.hidden || deviceLost) return;
      try {
        const dt = skipNextDelta ? 0 : deltaSeconds;
        skipNextDelta = false;
        const start = performance.now();
        const result = clock.advance(paused ? 0 : dt, (fixedDt, tick) => scene.fixedUpdate(fixedDt, tick));
        const simulationMs = performance.now() - start;
        scene.update(Math.min(dt, CONFIG.maxFrameDeltaSeconds), result.alpha);
        if (dt > 0) telemetry.record(dt * 1000, simulationMs, result.droppedSeconds);
      } catch (error) {
        failed = true;
        app!.autoRender = false;
        onFailure(error);
      }
    });
    app.start();
    return {
      destroy,
      setPaused(value: boolean): void {
        paused = value;
        clock.discardPendingTime();
        skipNextDelta = true;
      },
      snapshot: () => ({
        milestone: 'phase-0', renderer: device.deviceType, tick: clock.tick,
        paused, hidden: document.hidden, deviceLost, failed,
        width: device.width, height: device.height,
        ...telemetry.snapshot(),
      }),
    };
  } catch (error) {
    destroy();
    throw error;
  }
}

export type Runtime = Awaited<ReturnType<typeof createRuntime>>;
