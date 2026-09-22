import './style.css';
import { CONFIG } from './config';
import { CalibrationScene } from './render/calibration-scene';
import { ADMITTED_MODELS, BenchmarkScene } from './render/benchmark-scene';
import type { ViewName } from './render/inspection-camera';
import { createGameRuntime, type GameRuntime, type RuntimeSnapshot } from './render/runtime';
import type { RuntimeScene } from './render/scene';
import { WorkerR2PreviewScene, WORKER_R2_PATH } from './render/worker-r2-preview-scene';

interface DebugRuntimeBridge {
  mount(): Promise<void>;
  unmount(): void;
  remount(): Promise<void>;
  snapshot(): RuntimeSnapshot | null;
}

declare global {
  interface Window {
    __BOHEMIA_DEBUG__?: DebugRuntimeBridge;
  }
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required host element: ${selector}`);
  return element;
}

const canvas = requiredElement<HTMLCanvasElement>('#viewport');
const status = requiredElement<HTMLElement>('#status');
const pauseButton = requiredElement<HTMLButtonElement>('#pause');
const diagnostics = requiredElement<HTMLElement>('#diagnostics');
const errorPanel = requiredElement<HTMLElement>('#error');
const errorText = requiredElement<HTMLElement>('#error-text');
const retryButton = requiredElement<HTMLButtonElement>('#retry');
const compatibilityButton = requiredElement<HTMLButtonElement>('#compatibility');
const viewButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-view]')];
const parameters = new URLSearchParams(window.location.search);
const debug = parameters.get('debug') === '1';
const forceWebGL2 = parameters.get('renderer') === 'webgl2';
const calibration = parameters.get('scene') === 'calibration';
const workerR2Closeup = parameters.get('scene') === 'worker-r2-preview';
const workerR2Benchmark = parameters.get('worker') === 'r2';
const runningLabel = calibration
  ? 'Foundation running'
  : workerR2Closeup
    ? 'Worker R2 preview running'
    : 'Scene running';

let runtime: GameRuntime | undefined;
let activeBenchmarkScene: BenchmarkScene | undefined;
let hostEvents: AbortController | undefined;
let diagnosticsTimer: ReturnType<typeof setInterval> | undefined;
let mountGeneration = 0;

function createScene(): RuntimeScene {
  if (calibration) return new CalibrationScene();
  if (workerR2Closeup) return new WorkerR2PreviewScene();
  const benchmark = new BenchmarkScene(workerR2Benchmark
    ? { ...ADMITTED_MODELS, inhabitant: WORKER_R2_PATH }
    : ADMITTED_MODELS);
  activeBenchmarkScene = benchmark;
  return benchmark;
}

function showError(error: unknown): void {
  console.error('[BOHEMIA runtime]', error);
  status.textContent = 'Renderer unavailable';
  errorPanel.hidden = false;
  errorText.textContent = 'The 3D scene could not continue. Reload, or try the WebGL2 compatibility mode.';
  pauseButton.disabled = true;
}

function resizeRuntime(): void {
  runtime?.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
}

function syncVisibility(): void {
  runtime?.setVisibility(document.hidden);
}

function updateDiagnostics(created: GameRuntime): void {
  if (runtime !== created) return;
  const sample = created.snapshot();
  status.textContent = sample.failed
    ? 'Runtime stopped'
    : sample.deviceLost
      ? 'Graphics device lost — waiting for recovery'
      : `${sample.renderer.toUpperCase()} · ${sample.paused ? 'Simulation paused' : runningLabel}`;
  if (debug) diagnostics.textContent = JSON.stringify(sample, null, 2);
}

function setSelectedView(selected: HTMLButtonElement): void {
  for (const button of viewButtons) button.setAttribute('aria-pressed', String(button === selected));
}

function resetHostUi(): void {
  status.textContent = calibration
    ? 'Starting the renderer…'
    : workerR2Closeup
      ? 'Preparing the worker R2 preview…'
      : 'Preparing the landscape…';
  pauseButton.disabled = true;
  pauseButton.textContent = 'Pause simulation';
  pauseButton.setAttribute('aria-pressed', 'false');
  diagnostics.hidden = !debug;
  diagnostics.textContent = '';
  errorPanel.hidden = true;
  errorText.textContent = '';
  for (const button of viewButtons) button.disabled = calibration || workerR2Closeup;
}

async function mount(): Promise<void> {
  if (runtime) return;
  const generation = ++mountGeneration;
  resetHostUi();
  const events = new AbortController();
  hostEvents = events;
  const scene = createScene();

  let created!: GameRuntime;
  created = createGameRuntime({
    canvas,
    scene,
    renderer: forceWebGL2 ? 'webgl2' : 'auto',
    onFailure: error => {
      if (runtime === created) showError(error);
    },
  });
  runtime = created;

  pauseButton.addEventListener('click', () => {
    if (runtime !== created) return;
    const paused = created.snapshot().paused;
    if (paused) created.resume();
    else created.pause();
    pauseButton.textContent = paused ? 'Pause simulation' : 'Resume simulation';
    pauseButton.setAttribute('aria-pressed', String(!paused));
    updateDiagnostics(created);
  }, { signal: events.signal });

  retryButton.addEventListener('click', () => location.reload(), { signal: events.signal });
  compatibilityButton.addEventListener('click', () => {
    const url = new URL(location.href);
    url.searchParams.set('renderer', 'webgl2');
    location.assign(url);
  }, { signal: events.signal });

  for (const button of viewButtons) {
    button.addEventListener('click', () => {
      if (!activeBenchmarkScene || runtime !== created) return;
      activeBenchmarkScene.setView(button.dataset.view as ViewName);
      setSelectedView(button);
      canvas.focus({ preventScroll: true });
    }, { signal: events.signal });
  }

  window.addEventListener('resize', resizeRuntime, { signal: events.signal });
  document.addEventListener('visibilitychange', syncVisibility, { signal: events.signal });
  window.addEventListener('pagehide', event => {
    if (!event.persisted) unmount();
  }, { signal: events.signal });

  created.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  created.setVisibility(document.hidden);

  try {
    await created.initialize();
    if (generation !== mountGeneration || runtime !== created) {
      created.destroy();
      return;
    }
    created.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    created.setVisibility(document.hidden);
    created.start();
    pauseButton.disabled = false;
    updateDiagnostics(created);
    diagnosticsTimer = setInterval(() => updateDiagnostics(created), CONFIG.diagnosticsRefreshSeconds * 1000);
  } catch (error) {
    if (generation === mountGeneration && runtime === created) {
      events.abort();
      if (hostEvents === events) hostEvents = undefined;
      runtime = undefined;
      activeBenchmarkScene = undefined;
      showError(error);
    }
  }
}

function unmount(): void {
  ++mountGeneration;
  hostEvents?.abort();
  hostEvents = undefined;
  if (diagnosticsTimer !== undefined) clearInterval(diagnosticsTimer);
  diagnosticsTimer = undefined;
  const current = runtime;
  runtime = undefined;
  activeBenchmarkScene = undefined;
  current?.destroy();
  pauseButton.disabled = true;
  pauseButton.textContent = 'Pause simulation';
  pauseButton.setAttribute('aria-pressed', 'false');
  diagnostics.textContent = '';
}

if (debug) {
  window.__BOHEMIA_DEBUG__ = {
    mount,
    unmount,
    async remount(): Promise<void> {
      unmount();
      await mount();
    },
    snapshot: () => runtime?.snapshot() ?? null,
  };
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unmount();
    delete window.__BOHEMIA_DEBUG__;
  });
}

void mount();
