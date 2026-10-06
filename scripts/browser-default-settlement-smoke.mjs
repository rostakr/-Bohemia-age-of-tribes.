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

async function dragSelectAll(cdp) {
  const start = { x: 280, y: 110 };
  const end = { x: 1820, y: 970 };
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

async function rightClick(cdp, x, y) {
  await evaluate(cdp, `(() => {
    const canvas = document.querySelector('#viewport');
    if (!canvas) throw new Error('RTS canvas missing');
    return canvas.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true, cancelable: true, view: window,
      clientX: ${x}, clientY: ${y}, button: 2, buttons: 0,
      pointerId: 1, pointerType: 'mouse', isPrimary: true,
    }));
  })()`);
}

const preview = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js'), 'preview', '--host', host, '--port', String(previewPort), '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CI: '1' },
});
const profileDir = mkdtempSync(join(tmpdir(), 'bohemia-default-settlement-chrome-'));
let chrome;
let cdp;

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

  await dragSelectAll(cdp);
  state = await waitFor(cdp, value => value.selectedText === '5 selected' && value.taskSelected === 5,
    'Default Boii settlement five-worker selection', 15_000);

  const resource = state.resources.find(candidate => !candidate.hidden && candidate.width > 0 && candidate.height > 0);
  if (!resource) throw new Error(`No visible mapped wood target: ${JSON.stringify(state.resources)}`);
  await rightClick(cdp, resource.x + 3, resource.y + 3);
  state = await waitFor(cdp, value => value.feedback === 'Gather wood' && value.taskSelected === 5 && value.taskGathering >= 1,
    'Default Boii settlement gather command', 15_000);

  const capture = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  const screenshotPath = resolve(artifactsDir, 'default-settlement-webgl2-1920x1080.png');
  writeFileSync(screenshotPath, Buffer.from(capture.data, 'base64'));

  console.log('BOII-SETTLEMENT-01 default-entry smoke passed.');
  console.log(JSON.stringify({
    url: defaultUrl,
    query: state.search,
    rendererStatus: state.status,
    workersSelected: state.taskSelected,
    resourceNodes: state.resources.length,
    resourceAmountEach: 100,
    stockpileWood: state.stockpileWood,
    command: state.feedback,
    diagnosticsHidden: state.diagnosticsHidden,
    debugBridgePresent: state.debugBridgePresent,
    screenshot: screenshotPath,
    note: 'The empty-query entry keeps Phase 4 production constants because debug and milestone parameters are absent.',
  }, null, 2));
} finally {
  cdp?.close();
  await stopProcess(chrome);
  await stopProcess(preview);
  rmSync(profileDir, { recursive: true, force: true });
}
