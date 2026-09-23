import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const host = '127.0.0.1';
const previewPort = 4182;
const debugPort = 9232;
const previewBase = `http://${host}:${previewPort}`;
const debugBase = `http://${host}:${debugPort}`;
const artifactsDir = resolve('artifacts', 'phase2');
mkdirSync(artifactsDir, { recursive: true });
const sleep = ms => new Promise(resolvePromise => setTimeout(resolvePromise, ms));

function findChrome() {
  for (const candidate of [process.env.CHROME_BIN, 'google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser'].filter(Boolean)) {
    const result = spawnSync('which', [candidate], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  throw new Error('No Chrome/Chromium executable found');
}

async function waitForHttp(url, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) { lastError = error; }
    await sleep(200);
  }
  throw new Error(`Timed out waiting for ${url}: ${String(lastError)}`);
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([once(child, 'exit'), sleep(1500)]);
  if (child.exitCode === null) {
    child.kill('SIGKILL');
    await Promise.race([once(child, 'exit'), sleep(1500)]);
  }
}

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.id = 0;
    this.pending = new Map();
    socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(`${message.error.code}: ${message.error.message}`));
      else pending.resolve(message.result ?? {});
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolvePromise, reject) => {
      this.pending.set(id, { resolve: resolvePromise, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

async function connectCdp(wsUrl) {
  const socket = new WebSocket(wsUrl);
  await new Promise((resolvePromise, reject) => {
    socket.addEventListener('open', resolvePromise, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  return new Cdp(socket);
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(`Runtime.evaluate failed: ${result.exceptionDetails.text}`);
  return result.result?.value;
}

const stateExpression = `(() => {
  const snapshot = window.__BOHEMIA_DEBUG__?.snapshot?.() ?? null;
  return {
    status: document.querySelector('#status')?.textContent || '',
    errorHidden: document.querySelector('#error')?.hidden ?? null,
    errorText: document.querySelector('#error-text')?.textContent || '',
    canvasCount: document.querySelectorAll('canvas').length,
    overlayCount: document.querySelectorAll('.rts-overlay').length,
    validMarkers: document.querySelectorAll('.rts-move-marker.valid').length,
    invalidMarkers: document.querySelectorAll('.rts-move-marker.invalid').length,
    feedback: document.querySelector('.rts-feedback')?.textContent || '',
    snapshot,
  };
})()`;

async function readState(cdp) { return evaluate(cdp, stateExpression); }

async function waitFor(cdp, predicate, label, timeoutMs = 20_000, intervalMs = 75) {
  const deadline = Date.now() + timeoutMs;
  let latest;
  while (Date.now() < deadline) {
    try {
      latest = await readState(cdp);
      if (latest?.errorHidden === false || latest?.status === 'Renderer unavailable') {
        throw new Error(`${label}: runtime error ${JSON.stringify(latest)}`);
      }
      if (predicate(latest)) return latest;
    } catch (error) {
      if (String(error).includes('runtime error')) throw error;
    }
    await sleep(intervalMs);
  }
  throw new Error(`${label} timed out. Last state: ${JSON.stringify(latest)}`);
}

async function dragSelect(cdp) {
  const start = { x: 360, y: 130 };
  const end = { x: 1800, y: 930 };
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: start.x, y: start.y, button: 'none', buttons: 0 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: start.x, y: start.y, button: 'left', buttons: 1, clickCount: 1 });
  for (let step = 1; step <= 6; step++) {
    const t = step / 6;
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
      button: 'left',
      buttons: 1,
    });
  }
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: end.x, y: end.y, button: 'left', buttons: 0, clickCount: 1 });
}

async function rightClick(cdp, x = 1480, y = 650) {
  // Headless Chromium/CDP does not consistently synthesize a DOM contextmenu event
  // from right-button mouse dispatch. Deliver the standard browser event explicitly
  // to the real gameplay canvas while preserving viewport coordinates.
  await evaluate(cdp, `(() => {
    const canvas = document.querySelector('#viewport');
    if (!canvas) throw new Error('RTS canvas missing');
    return canvas.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: ${x},
      clientY: ${y},
      button: 2,
      buttons: 2,
    }));
  })()`);
}

async function capture(cdp, filename) {
  const image = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  const path = resolve(artifactsDir, filename);
  writeFileSync(path, Buffer.from(image.data, 'base64'));
  return path;
}

const preview = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js'), 'preview', '--host', host, '--port', String(previewPort), '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CI: '1' },
});
const profileDir = mkdtempSync(join(tmpdir(), 'bohemia-phase2-chrome-'));
let chrome;
let cdp;

try {
  await waitForHttp(`${previewBase}/`);
  chrome = spawn(findChrome(), [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
    `--remote-debugging-address=${host}`, `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`, '--window-size=1920,1080', 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  await waitForHttp(`${debugBase}/json/list`);
  const targets = await (await fetch(`${debugBase}/json/list`)).json();
  const page = targets.find(target => target.type === 'page');
  if (!page?.webSocketDebuggerUrl) throw new Error('No debuggable page target found');
  cdp = await connectCdp(page.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });

  const fiveUrl = `${previewBase}/?phase2=1&renderer=webgl2&debug=1`;
  await cdp.send('Page.navigate', { url: fiveUrl });
  let state = await waitFor(cdp, value =>
    value?.snapshot?.milestone === 'phase-2' &&
    value.snapshot.renderer === 'webgl2' &&
    value.snapshot.failed === false &&
    value.snapshot.deviceLost === false &&
    Number(value.snapshot.tick) >= 1 &&
    Number(value.snapshot.activeUnits) === 5 &&
    value.overlayCount === 1 &&
    value.canvasCount === 1,
  'five-unit Phase 2 startup', 35_000);

  await dragSelect(cdp);
  state = await waitFor(cdp, value => Number(value?.snapshot?.selectedUnits) >= 1, 'box selection');
  const selectedFive = Number(state.snapshot.selectedUnits);
  await rightClick(cdp);
  state = await waitFor(cdp, value => value.validMarkers >= 1 && value.feedback === 'Move', 'contextual MOVE feedback', 8_000, 40);
  if (String(state.snapshot.pathFailure || '') !== '') throw new Error(`Unexpected path failure after MOVE: ${state.snapshot.pathFailure}`);
  const fiveScreenshot = await capture(cdp, 'phase2-five-unit-webgl2.png');

  await evaluate(cdp, `window.__BOHEMIA_DEBUG__.remount()`);
  state = await waitFor(cdp, value =>
    value?.snapshot?.milestone === 'phase-2' && Number(value.snapshot.activeUnits) === 5 && value.overlayCount === 1 && value.canvasCount === 1,
  'Phase 2 remount');

  const fortyUrl = `${previewBase}/?phase2=1&units=40&renderer=webgl2&debug=1`;
  await cdp.send('Page.navigate', { url: fortyUrl });
  state = await waitFor(cdp, value =>
    value?.snapshot?.milestone === 'phase-2' && Number(value.snapshot.activeUnits) === 40 && Number(value.snapshot.phase2DebugUnits) === 40 && value.overlayCount === 1,
  '40-unit debug startup', 35_000);
  await dragSelect(cdp);
  state = await waitFor(cdp, value => Number(value?.snapshot?.selectedUnits) >= 5, '40-unit box selection');
  const selectedForty = Number(state.snapshot.selectedUnits);
  await rightClick(cdp, 1500, 680);
  const queued = await waitFor(cdp, value => Number(value?.snapshot?.pendingPaths) > 0 || value.validMarkers >= 1, '40-unit bounded path queue', 5_000, 25);
  if (queued.validMarkers < 1) await waitFor(cdp, value => value.validMarkers >= 1, '40-unit MOVE marker', 5_000, 25);
  const fortyScreenshot = await capture(cdp, 'phase2-40-unit-webgl2.png');

  console.log('Phase 2 RTS browser smoke passed.');
  console.log(JSON.stringify({
    renderer: state.snapshot.renderer,
    selectedFive,
    selectedForty,
    activeUnits: state.snapshot.activeUnits,
    pendingPathsObserved: queued.snapshot.pendingPaths,
    pathsSolvedPerTick: queued.snapshot.pathsSolvedPerTick,
    simulationMs: queued.snapshot.rtsSimulationMs,
    fiveScreenshot,
    fortyScreenshot,
    note: 'SwiftShader/WebGL2 CI regression evidence only; not desktop-GPU performance evidence.',
  }, null, 2));
} finally {
  cdp?.close();
  await stopProcess(chrome);
  await stopProcess(preview);
  rmSync(profileDir, { recursive: true, force: true });
}
