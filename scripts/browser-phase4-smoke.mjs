import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const host = '127.0.0.1';
const previewPort = 4184;
const debugPort = 9234;
const previewBase = `http://${host}:${previewPort}`;
const debugBase = `http://${host}:${debugPort}`;
const artifactsDir = resolve('artifacts', 'phase4');
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
  const resources = [...document.querySelectorAll('.rts-resource-node')].map(element => {
    const rect = element.getBoundingClientRect();
    return {
      id: Number(element.dataset.resourceId || 0),
      remaining: Number(element.dataset.remaining || 0),
      hidden: element.hidden,
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    };
  });
  return {
    status: document.querySelector('#status')?.textContent || '',
    errorHidden: document.querySelector('#error')?.hidden ?? null,
    errorText: document.querySelector('#error-text')?.textContent || '',
    canvasCount: document.querySelectorAll('canvas').length,
    overlayCount: document.querySelectorAll('.rts-overlay').length,
    validMarkers: document.querySelectorAll('.rts-move-marker.valid').length,
    feedback: document.querySelector('.rts-feedback')?.textContent || '',
    stockpileWood: Number(document.querySelector('.rts-stockpile')?.dataset.wood || 0),
    resources,
    snapshot,
  };
})()`;

async function readState(cdp) { return evaluate(cdp, stateExpression); }

async function waitFor(cdp, predicate, label, timeoutMs = 30_000, intervalMs = 75) {
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
  const start = { x: 280, y: 110 };
  const end = { x: 1820, y: 970 };
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: start.x, y: start.y, button: 'none', buttons: 0 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: start.x, y: start.y, button: 'left', buttons: 1, clickCount: 1 });
  for (let step = 1; step <= 8; step++) {
    const t = step / 8;
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

async function rightClick(cdp, x, y) {
  await evaluate(cdp, `(() => {
    const canvas = document.querySelector('#viewport');
    if (!canvas) throw new Error('RTS canvas missing');
    return canvas.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: ${x},
      clientY: ${y},
      button: 2,
      buttons: 0,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
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
const profileDir = mkdtempSync(join(tmpdir(), 'bohemia-phase4-chrome-'));
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

  const url = `${previewBase}/?phase4=1&renderer=webgl2&debug=1`;
  await cdp.send('Page.navigate', { url });
  let state = await waitFor(cdp, value =>
    value?.snapshot?.milestone === 'phase-4' &&
    value.snapshot.renderer === 'webgl2' &&
    value.snapshot.failed === false &&
    value.snapshot.deviceLost === false &&
    Number(value.snapshot.tick) >= 1 &&
    Number(value.snapshot.activeUnits) === 5 &&
    Number(value.snapshot.phase4DebugUnits) === 5 &&
    value.snapshot.phase4QaFast === true &&
    Number(value.snapshot.resourceNodes) >= 1 &&
    Number(value.snapshot.woodStockpile) === 0 &&
    value.resources.some(resource => !resource.hidden && resource.width > 0 && resource.height > 0) &&
    value.overlayCount === 1 &&
    value.canvasCount === 1,
  'Phase 4 startup', 60_000);

  const initialWoodRemaining = Number(state.snapshot.woodRemaining);
  await dragSelect(cdp);
  state = await waitFor(cdp, value => Number(value?.snapshot?.selectedUnits) >= 1, 'Phase 4 worker selection', 15_000);
  const selected = Number(state.snapshot.selectedUnits);

  const resource = state.resources.find(candidate => !candidate.hidden && candidate.width > 0 && candidate.height > 0);
  if (!resource) throw new Error(`No visible Phase 4 resource marker: ${JSON.stringify(state.resources)}`);
  await rightClick(cdp, resource.x + 3, resource.y + 3);
  state = await waitFor(cdp, value => value.feedback === 'Gather wood' && Number(value.snapshot.activeGatherOrders) >= 1,
    'Phase 4 gather command feedback', 12_000, 40);
  const beforeDepositScreenshot = await capture(cdp, 'phase4-gather-command-webgl2.png');

  let sawCargo = false;
  const depositState = await waitFor(cdp, value => {
    if (Number(value?.snapshot?.carriedWoodTotal) > 0) sawCargo = true;
    return Number(value?.snapshot?.woodRemaining) < initialWoodRemaining &&
      Number(value.snapshot.woodStockpile) > 0 &&
      Number(value.stockpileWood) > 0;
  }, 'Phase 4 extraction and storehouse deposit', 70_000, 60);
  if (!sawCargo && Number(depositState.snapshot.woodRemaining) >= initialWoodRemaining) {
    throw new Error('Phase 4 never observed resource extraction or carried cargo');
  }
  const afterDepositScreenshot = await capture(cdp, 'phase4-wood-deposited-webgl2.png');

  await rightClick(cdp, 1500, 690);
  const moved = await waitFor(cdp, value =>
    value.feedback === 'Move' && Number(value?.snapshot?.activeGatherOrders) === 0,
  'Phase 4 MOVE replacement', 15_000, 50);
  if (Number(moved.snapshot.woodStockpile) <= 0) throw new Error('MOVE replacement unexpectedly removed deposited wood');

  await evaluate(cdp, `window.__BOHEMIA_DEBUG__.remount()`);
  const remounted = await waitFor(cdp, value =>
    value?.snapshot?.milestone === 'phase-4' &&
    Number(value.snapshot.activeUnits) === 5 &&
    Number(value.snapshot.resourceNodes) >= 1 &&
    Number(value.snapshot.woodStockpile) === 0 &&
    value.overlayCount === 1 &&
    value.canvasCount === 1,
  'Phase 4 remount', 60_000);

  console.log('Phase 4 wood gathering browser smoke passed.');
  console.log(JSON.stringify({
    renderer: remounted.snapshot.renderer,
    activeUnits: remounted.snapshot.activeUnits,
    selected,
    resourceNodes: remounted.snapshot.resourceNodes,
    initialWoodRemaining,
    depositedWood: depositState.snapshot.woodStockpile,
    remainingAfterDeposit: depositState.snapshot.woodRemaining,
    sawCargo,
    beforeDepositScreenshot,
    afterDepositScreenshot,
    note: 'SwiftShader/WebGL2 regression evidence only; Phase 4 debug mode uses accelerated gathering constants for wall-clock QA only.',
  }, null, 2));
} finally {
  cdp?.close();
  await stopProcess(chrome);
  await stopProcess(preview);
  rmSync(profileDir, { recursive: true, force: true });
}
