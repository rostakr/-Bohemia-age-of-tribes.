import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const siteBase = String(process.env.SITE_URL || '').replace(/\/+$/, '');
if (!siteBase) throw new Error('SITE_URL is required');

const debugHost = '127.0.0.1';
const debugPort = 9235;
const debugBase = `http://${debugHost}:${debugPort}`;
const artifactsDir = resolve('artifacts', 'published-phase4');
mkdirSync(artifactsDir, { recursive: true });
const sleep = ms => new Promise(resolvePromise => setTimeout(resolvePromise, ms));

function findChrome() {
  for (const candidate of [process.env.CHROME_BIN, 'google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser'].filter(Boolean)) {
    const result = spawnSync('which', [candidate], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  throw new Error('No Chrome/Chromium executable found');
}

async function waitForHttp(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${url}: ${String(lastError)}`);
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise(resolvePromise => child.once('exit', resolvePromise)),
    sleep(1500),
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
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
  const diagnostics = document.querySelector('#diagnostics');
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
    diagnosticsHidden: diagnostics?.hidden ?? false,
    diagnosticsText: diagnostics?.textContent || '',
    canvasCount: document.querySelectorAll('canvas').length,
    overlayCount: document.querySelectorAll('.rts-overlay').length,
    feedback: document.querySelector('.rts-feedback')?.textContent || '',
    stockpileWood: Number(document.querySelector('.rts-stockpile')?.dataset.wood || 0),
    taskText: task?.textContent || '',
    taskHidden: task?.hidden ?? true,
    taskSelected: Number(task?.dataset.selected || 0),
    taskGathering: Number(task?.dataset.gathering || 0),
    taskReturning: Number(task?.dataset.returning || 0),
    taskIdle: Number(task?.dataset.idle || 0),
    taskCargo: Number(task?.dataset.cargo || 0),
    resources,
  };
})()`;

async function readState(cdp) { return evaluate(cdp, stateExpression); }

async function waitFor(cdp, predicate, label, timeoutMs = 45_000, intervalMs = 75) {
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

const profileDir = mkdtempSync(join(tmpdir(), 'bohemia-published-phase4-'));
let chrome;
let cdp;

try {
  await waitForHttp(`${siteBase}/`);
  chrome = spawn(findChrome(), [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
    `--remote-debugging-address=${debugHost}`, `--remote-debugging-port=${debugPort}`,
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

  const qa = encodeURIComponent(process.env.GITHUB_SHA || String(Date.now()));
  const url = `${siteBase}/?phase4=1&renderer=webgl2&qa=${qa}`;
  await cdp.send('Page.navigate', { url });

  let state = await waitFor(cdp, value =>
    value.status === 'WEBGL2 · Wood gathering running' &&
    value.errorHidden === true &&
    value.diagnosticsHidden === true &&
    value.diagnosticsText === '' &&
    value.canvasCount === 1 &&
    value.overlayCount === 1 &&
    value.taskHidden === true &&
    value.resources.some(resource => !resource.hidden && resource.width > 0 && resource.height > 0 && resource.remaining > 0),
  'Published Phase 4 production startup', 75_000);

  await dragSelect(cdp);
  state = await waitFor(cdp, value =>
    value.taskHidden === false &&
    Number(value.taskSelected) >= 1,
  'Published Phase 4 worker selection', 20_000);
  const selected = Number(state.taskSelected);

  const resource = state.resources.find(candidate => !candidate.hidden && candidate.width > 0 && candidate.height > 0 && candidate.remaining > 0);
  if (!resource) throw new Error(`No visible production resource marker: ${JSON.stringify(state.resources)}`);
  const initialResourceRemaining = Number(resource.remaining);
  const initialStockpile = Number(state.stockpileWood);

  await rightClick(cdp, resource.x + 3, resource.y + 3);
  state = await waitFor(cdp, value =>
    value.feedback === 'Gather wood' &&
    Number(value.taskSelected) === selected &&
    Number(value.taskGathering) >= 1,
  'Published Phase 4 gather command', 20_000);
  const gatherScreenshot = await capture(cdp, 'published-phase4-gather-command.png');

  const cargoState = await waitFor(cdp, value =>
    Number(value.taskCargo) > 0,
  'Published Phase 4 carried cargo', 90_000, 100);
  const carriedWood = Number(cargoState.taskCargo);
  const cargoScreenshot = await capture(cdp, 'published-phase4-cargo.png');

  const depositState = await waitFor(cdp, value => {
    const sameResource = value.resources.find(candidate => candidate.id === resource.id);
    return Number(value.stockpileWood) > initialStockpile &&
      Boolean(sameResource) &&
      Number(sameResource.remaining) < initialResourceRemaining;
  }, 'Published Phase 4 storehouse deposit', 120_000, 100);
  const depositScreenshot = await capture(cdp, 'published-phase4-deposit.png');
  const remainingAfterDeposit = Number(depositState.resources.find(candidate => candidate.id === resource.id)?.remaining ?? NaN);

  if (!depositState.diagnosticsHidden || depositState.diagnosticsText !== '') {
    throw new Error('Production verification exposed debug diagnostics');
  }

  console.log('Published Phase 4 production gathering smoke passed.');
  console.log(JSON.stringify({
    url,
    selected,
    resourceId: resource.id,
    initialResourceRemaining,
    carriedWood,
    initialStockpile,
    depositedWood: Number(depositState.stockpileWood) - initialStockpile,
    remainingAfterDeposit,
    gatherScreenshot,
    cargoScreenshot,
    depositScreenshot,
    diagnosticsHidden: depositState.diagnosticsHidden,
    note: 'Public production route: no debug=1 and therefore no accelerated Phase 4 QA constants.',
  }, null, 2));
} finally {
  cdp?.close();
  await stopProcess(chrome);
  rmSync(profileDir, { recursive: true, force: true });
}
