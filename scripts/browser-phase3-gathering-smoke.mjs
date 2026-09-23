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
const artifactsDir = resolve('artifacts', 'phase3-gathering');
mkdirSync(artifactsDir, { recursive: true });
const sleep = ms => new Promise(resolvePromise => setTimeout(resolvePromise, ms));

function findChrome() {
  for (const candidate of [process.env.CHROME_BIN, 'google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser'].filter(Boolean)) {
    const result = spawnSync('which', [candidate], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  throw new Error('No Chrome/Chromium executable found');
}

async function waitForHttp(url, timeoutMs = 25_000) {
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
    resourceMarkers: document.querySelectorAll('.rts-resource-node').length,
    visibleResourceMarkers: [...document.querySelectorAll('.rts-resource-node')].filter(node => !node.hidden).length,
    feedback: document.querySelector('.rts-feedback')?.textContent || '',
    stockpileText: document.querySelector('.rts-stockpile')?.textContent || '',
    snapshot,
  };
})()`;

async function readState(cdp) { return evaluate(cdp, stateExpression); }

async function waitFor(cdp, predicate, label, timeoutMs = 25_000, intervalMs = 75) {
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
  const start = { x: 340, y: 120 };
  const end = { x: 1810, y: 940 };
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

async function rightPointerUp(cdp, x, y) {
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

async function visibleResourceCenter(cdp) {
  return evaluate(cdp, `(() => {
    for (const node of [...document.querySelectorAll('.rts-resource-node')]) {
      if (node.hidden || Number(node.dataset.remaining) <= 0) continue;
      const rect = node.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      if (x >= 40 && y >= 40 && x <= innerWidth - 40 && y <= innerHeight - 40) {
        return { x, y, id: Number(node.dataset.resourceId), remaining: Number(node.dataset.remaining) };
      }
    }
    return null;
  })()`);
}

async function findResourceAcrossViews(cdp) {
  for (const view of ['settlement', 'craft', 'river']) {
    const point = await visibleResourceCenter(cdp);
    if (point) return point;
    await evaluate(cdp, `document.querySelector('[data-view="${view}"]')?.click()`);
    await sleep(700);
  }
  return visibleResourceCenter(cdp);
}

async function safeGroundPoint(cdp) {
  return evaluate(cdp, `(() => {
    const resources = [...document.querySelectorAll('.rts-resource-node')]
      .filter(node => !node.hidden)
      .map(node => { const r = node.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    const candidates = [{x:1500,y:820},{x:1180,y:850},{x:760,y:860},{x:520,y:780}];
    const distance = point => resources.length ? Math.min(...resources.map(r => Math.hypot(point.x-r.x, point.y-r.y))) : 9999;
    candidates.sort((a, b) => distance(b) - distance(a));
    return candidates[0];
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
const profileDir = mkdtempSync(join(tmpdir(), 'bohemia-phase3-gathering-chrome-'));
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
  await waitForHttp(`${debugBase}/json/list`, 30_000);
  const targets = await (await fetch(`${debugBase}/json/list`)).json();
  const page = targets.find(target => target.type === 'page');
  if (!page?.webSocketDebuggerUrl) throw new Error('No debuggable page target found');
  cdp = await connectCdp(page.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });

  await cdp.send('Page.navigate', { url: `${previewBase}/?gather=1&renderer=webgl2&debug=1` });
  let state = await waitFor(cdp, value =>
    value?.snapshot?.milestone === 'phase-3' &&
    value.snapshot.phase3Gathering === true &&
    value.snapshot.renderer === 'webgl2' &&
    value.snapshot.failed === false &&
    value.snapshot.deviceLost === false &&
    Number(value.snapshot.tick) >= 1 &&
    Number(value.snapshot.activeUnits) === 5 &&
    Number(value.snapshot.resourceNodes) >= 1 &&
    Number(value.snapshot.woodRemaining) > 0 &&
    Number(value.snapshot.woodStockpile) === 0 &&
    value.resourceMarkers >= 1 && value.overlayCount === 1 && value.canvasCount === 1,
  'Phase 3 gathering startup', 45_000);

  const initialWood = Number(state.snapshot.woodRemaining);
  await dragSelect(cdp);
  state = await waitFor(cdp, value => Number(value?.snapshot?.selectedUnits) >= 1, 'Phase 3 worker selection');
  const selectedWorkers = Number(state.snapshot.selectedUnits);

  const resourcePoint = await findResourceAcrossViews(cdp);
  if (!resourcePoint) throw new Error(`No visible Phase 3 resource marker found: ${JSON.stringify(await readState(cdp))}`);
  await rightPointerUp(cdp, resourcePoint.x, resourcePoint.y);
  state = await waitFor(cdp, value => value.feedback === 'Gather wood' && Number(value?.snapshot?.gatheringUnits) >= 1,
    'contextual GATHER feedback', 10_000, 40);
  const commandScreenshot = await capture(cdp, 'phase3-gather-command-webgl2.png');

  state = await waitFor(cdp, value =>
    Number(value?.snapshot?.woodStockpile) > 0 && Number(value?.snapshot?.woodRemaining) < initialWood,
  'wood deposit', 80_000, 100);
  const depositedWood = Number(state.snapshot.woodStockpile);
  const remainingWood = Number(state.snapshot.woodRemaining);
  if (!(depositedWood > 0) || !(remainingWood >= 0) || !(remainingWood < initialWood)) {
    throw new Error(`Invalid wood accounting after deposit: ${JSON.stringify(state.snapshot)}`);
  }
  const depositScreenshot = await capture(cdp, 'phase3-wood-deposited-webgl2.png');

  const ground = await safeGroundPoint(cdp);
  await rightPointerUp(cdp, ground.x, ground.y);
  await waitFor(cdp, value => value.feedback === 'Move', 'MOVE remains available after gathering', 10_000, 40);

  await evaluate(cdp, `window.__BOHEMIA_DEBUG__.remount()`);
  state = await waitFor(cdp, value =>
    value?.snapshot?.milestone === 'phase-3' && value.snapshot.phase3Gathering === true &&
    Number(value.snapshot.activeUnits) === 5 && Number(value.snapshot.resourceNodes) >= 1 &&
    Number(value.snapshot.woodStockpile) === 0 && value.overlayCount === 1 && value.canvasCount === 1,
  'Phase 3 gathering remount', 45_000);

  console.log('Phase 3 wood gathering browser smoke passed.');
  console.log(JSON.stringify({
    renderer: state.snapshot.renderer,
    selectedWorkers,
    resourceId: resourcePoint.id,
    initialWood,
    depositedWood,
    remainingWood,
    commandScreenshot,
    depositScreenshot,
    note: 'SwiftShader/WebGL2 CI regression evidence only; not desktop-GPU performance evidence.',
  }, null, 2));
} finally {
  cdp?.close();
  await stopProcess(chrome);
  await stopProcess(preview);
  rmSync(profileDir, { recursive: true, force: true });
}
