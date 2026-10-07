import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const host = '127.0.0.1';
const previewPort = 4185;
const debugPort = 9235;
const defaultUrl = `http://${host}:${previewPort}/`;
const debugBase = `http://${host}:${debugPort}`;
const artifactsDir = resolve('artifacts', 'settlement');
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
    this.handlers = new Map();
    socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (!message.id) {
        for (const handler of this.handlers.get(message.method) ?? []) handler(message.params ?? {});
        return;
      }
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
  on(method, handler) {
    const handlers = this.handlers.get(method) ?? [];
    handlers.push(handler);
    this.handlers.set(method, handlers);
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
  const task = document.querySelector('.rts-task');
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
  const diagnostics = document.querySelector('#diagnostics');
  return {
    search: location.search,
    status: document.querySelector('#status')?.textContent || '',
    errorHidden: document.querySelector('#error')?.hidden ?? null,
    errorText: document.querySelector('#error-text')?.textContent || '',
    canvasCount: document.querySelectorAll('canvas').length,
    overlayCount: document.querySelectorAll('.rts-overlay').length,
    diagnosticsHidden: diagnostics?.hidden ?? null,
    diagnosticsText: diagnostics?.textContent || '',
    debugBridgePresent: Boolean(window.__BOHEMIA_DEBUG__),
    selectedText: document.querySelector('.rts-count')?.textContent || '',
    feedback: document.querySelector('.rts-feedback')?.textContent || '',
    stockpileCount: document.querySelectorAll('.rts-stockpile').length,
    stockpileWood: Number(document.querySelector('.rts-stockpile')?.dataset.wood || 0),
    taskHidden: task?.hidden ?? true,
    taskSelected: Number(task?.dataset.selected || 0),
    taskGathering: Number(task?.dataset.gathering || 0),
    taskCargo: Number(task?.dataset.cargo || 0),
    resources,
  };
})()`;

async function readState(cdp) { return evaluate(cdp, stateExpression); }

async function waitFor(cdp, predicate, label, timeoutMs = 60_000, intervalMs = 100) {
  const deadline = Date.now() + timeoutMs;
  let latest;
  while (Date.now() < deadline) {
    latest = await readState(cdp);
    if (latest?.errorHidden === false || latest?.status === 'Renderer unavailable') {
      throw new Error(`${label}: runtime error ${JSON.stringify(latest)}`);
    }
    if (predicate(latest)) return latest;
    await sleep(intervalMs);
  }
  throw new Error(`${label} timed out. Last state: ${JSON.stringify(latest)}`);
}

async function dragSelect(cdp, start, end) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: start.x, y: start.y, button: 'none', buttons: 0 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: start.x, y: start.y, button: 'left', buttons: 1, clickCount: 1 });
  for (let step = 1; step <= 8; step++) {
    const t = step / 8;
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t,
      button: 'left', buttons: 1,
    });
  }
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: end.x, y: end.y, button: 'left', buttons: 0, clickCount: 1 });
}

async function dragSelectAll(cdp) {
  await dragSelect(cdp, { x: 280, y: 110 }, { x: 1820, y: 970 });
}

async function rightClick(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'right', buttons: 2, clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'right', buttons: 0, clickCount: 1 });
}

async function clickSelector(cdp, selector) {
  const rect = await evaluate(cdp, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) throw new Error('Missing click target: ' + ${JSON.stringify(selector)});
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rect.x, y: rect.y, button: 'none', buttons: 0 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', buttons: 1, clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x, y: rect.y, button: 'left', buttons: 0, clickCount: 1 });
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
const profileDir = mkdtempSync(join(tmpdir(), 'bohemia-default-settlement-chrome-'));
let chrome;
let cdp;
const consoleErrors = [];
const networkErrors = [];

try {
  await waitForHttp(defaultUrl);
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
  await cdp.send('Log.enable');
  await cdp.send('Network.enable');
  cdp.on('Runtime.exceptionThrown', params => {
    consoleErrors.push(params.exceptionDetails?.text || 'Runtime exception');
  });
  cdp.on('Log.entryAdded', params => {
    if (params.entry?.level === 'error') consoleErrors.push(params.entry.text || 'Console error');
  });
  cdp.on('Network.loadingFailed', params => {
    if (!params.canceled) networkErrors.push(`${params.errorText || 'loading failed'} ${params.type || ''}`.trim());
  });
  cdp.on('Network.responseReceived', params => {
    const status = Number(params.response?.status || 0);
    const url = params.response?.url || '';
    if (status >= 400 && !/favicon\.ico(?:$|\?)/.test(url)) networkErrors.push(`${status} ${url}`);
  });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await cdp.send('Page.navigate', { url: defaultUrl });

  let state = await waitFor(cdp, value =>
    value.search === '' &&
    /^(WEBGL2|WEBGPU) · Boii settlement running$/.test(value.status) &&
    value.canvasCount === 1 && value.overlayCount === 1 &&
    value.diagnosticsHidden === true && value.diagnosticsText === '' && value.debugBridgePresent === false &&
    value.stockpileCount === 1 && value.stockpileWood === 0 &&
    value.resources.length === 8 &&
    value.resources.every(resource => resource.id >= 1001 && resource.remaining === 100) &&
    value.resources.some(resource => !resource.hidden && resource.width > 0 && resource.height > 0),
  'Default Boii settlement startup');

  await clickSelector(cdp, '#pause');
  await waitFor(cdp, value => / · Simulation paused$/.test(value.status) && value.diagnosticsHidden === true,
    'Default Boii settlement pause', 10_000);
  await sleep(300);
  await clickSelector(cdp, '#pause');
  state = await waitFor(cdp, value => / · Boii settlement running$/.test(value.status) && value.diagnosticsHidden === true,
    'Default Boii settlement resume', 10_000);

  await dragSelectAll(cdp);
  state = await waitFor(cdp, value => value.selectedText === '5 selected' && value.taskSelected === 5,
    'Default Boii settlement five-worker selection', 15_000);

  // The production player scenario follows one worker through the full cycle.
  // Keep the all-worker selection above as the five-worker scene/readability contract,
  // then replace it with a bounded normal box-select around the deterministic left worker.
  await dragSelect(cdp, { x: 720, y: 480 }, { x: 820, y: 590 });
  state = await waitFor(cdp, value => value.selectedText === '1 selected' && value.taskSelected === 1,
    'Default Boii settlement single-worker selection', 15_000);

  const resource = state.resources.find(candidate => !candidate.hidden && candidate.width > 0 && candidate.height > 0);
  if (!resource) throw new Error(`No visible mapped wood target: ${JSON.stringify(state.resources)}`);
  const initialRemaining = state.resources.reduce((sum, candidate) => sum + candidate.remaining, 0);
  await rightClick(cdp, resource.x + 3, resource.y + 3);
  const gatherState = await waitFor(cdp, value => value.feedback === 'Gather wood' && value.taskSelected === 1 && value.taskGathering >= 1,
    'Default Boii settlement gather command', 15_000);
  const gatherScreenshot = await capture(cdp, 'default-settlement-gather-1920x1080.png');

  const cargoState = await waitFor(cdp, value =>
    value.taskCargo > 0 &&
    value.resources.reduce((sum, candidate) => sum + candidate.remaining, 0) < initialRemaining,
  'Default Boii settlement visible production cargo', 90_000, 75);
  const cargoScreenshot = await capture(cdp, 'default-settlement-carrying-1920x1080.png');

  const depositState = await waitFor(cdp, value =>
    value.stockpileWood > 0 &&
    value.diagnosticsHidden === true &&
    value.debugBridgePresent === false,
  'Default Boii settlement production deposit', 120_000, 50);
  const depositScreenshot = await capture(cdp, 'default-settlement-deposited-1920x1080.png');

  if (consoleErrors.length > 0) throw new Error(`Default settlement console errors: ${JSON.stringify(consoleErrors)}`);
  if (networkErrors.length > 0) throw new Error(`Default settlement network errors: ${JSON.stringify(networkErrors)}`);

  console.log('BOII-SETTLEMENT-01 default-entry production cycle passed.');
  console.log(JSON.stringify({
    url: defaultUrl,
    query: depositState.search,
    rendererStatus: depositState.status,
    workersSelected: depositState.taskSelected,
    resourceNodes: depositState.resources.length,
    resourceAmountEach: 100,
    carriedWoodObserved: cargoState.taskCargo,
    stockpileWood: depositState.stockpileWood,
    command: gatherState.feedback,
    diagnosticsHidden: depositState.diagnosticsHidden,
    debugBridgePresent: depositState.debugBridgePresent,
    pauseResume: 'passed',
    consoleErrors,
    networkErrors,
    gatherScreenshot,
    cargoScreenshot,
    depositScreenshot,
    note: 'Empty-query production timing and normal CDP mouse input; no debug or milestone parameters.',
  }, null, 2));
} finally {
  cdp?.close();
  await stopProcess(chrome);
  await stopProcess(preview);
  rmSync(profileDir, { recursive: true, force: true });
}
