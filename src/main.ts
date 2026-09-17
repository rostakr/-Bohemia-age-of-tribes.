import './style.css';
import { CONFIG } from './config';
import { CalibrationScene } from './render/calibration-scene';
import { createRuntime, type Runtime } from './render/runtime';

const canvas = document.querySelector<HTMLCanvasElement>('#viewport')!;
const status = document.querySelector<HTMLElement>('#status')!;
const pause = document.querySelector<HTMLButtonElement>('#pause')!;
const diagnostics = document.querySelector<HTMLElement>('#diagnostics')!;
const errorPanel = document.querySelector<HTMLElement>('#error')!;
const errorText = document.querySelector<HTMLElement>('#error-text')!;
const parameters = new URLSearchParams(window.location.search);
const debug = parameters.get('debug') === '1';
let runtime: Runtime | undefined;
let disposed = false;
let timer: ReturnType<typeof setInterval> | undefined;
const events = new AbortController();

function showError(error: unknown): void {
  console.error('[BOHEMIA foundation]', error);
  status.textContent = 'Renderer unavailable';
  errorPanel.hidden = false;
  errorText.textContent = 'The 3D scene could not continue. Reload, or try the WebGL2 compatibility mode.';
  pause.disabled = true;
}

document.querySelector<HTMLButtonElement>('#retry')!.addEventListener('click', () => location.reload(), { signal: events.signal });
document.querySelector<HTMLButtonElement>('#compatibility')!.addEventListener('click', () => {
  const url = new URL(location.href);
  url.searchParams.set('renderer', 'webgl2');
  location.assign(url);
}, { signal: events.signal });
pause.addEventListener('click', () => {
  if (!runtime) return;
  const paused = !runtime.snapshot().paused;
  runtime.setPaused(paused);
  pause.textContent = paused ? 'Resume simulation' : 'Pause simulation';
  pause.setAttribute('aria-pressed', String(paused));
}, { signal: events.signal });

function dispose(): void {
  disposed = true;
  events.abort();
  if (timer !== undefined) clearInterval(timer);
  runtime?.destroy();
}

async function boot(): Promise<void> {
  try {
    const created = await createRuntime(canvas, new CalibrationScene(), parameters.get('renderer') === 'webgl2', showError);
    if (disposed) { created.destroy(); return; }
    runtime = created;
    pause.disabled = false;
    diagnostics.hidden = !debug;
    const updateDiagnostics = () => {
      const sample = created.snapshot();
      status.textContent = sample.failed ? 'Runtime stopped' : sample.deviceLost ? 'Graphics device lost — waiting for recovery' :
        `${sample.renderer.toUpperCase()} · ${sample.paused ? 'Simulation paused' : 'Foundation running'}`;
      if (debug) diagnostics.textContent = JSON.stringify(sample, null, 2);
    };
    updateDiagnostics();
    timer = setInterval(updateDiagnostics, CONFIG.diagnosticsRefreshSeconds * 1000);
  } catch (error) { if (!disposed) showError(error); }
}

window.addEventListener('pagehide', event => {
  // Preserve a live runtime in the browser's back/forward cache.
  if (!event.persisted) dispose();
}, { signal: events.signal });
if (import.meta.hot) import.meta.hot.dispose(dispose);
void boot();
