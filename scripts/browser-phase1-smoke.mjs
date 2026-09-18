import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const host = '127.0.0.1';
const previewPort = 4176;
const debugPort = 9226;
const baseUrl = `http://${host}:${previewPort}/?renderer=webgl2&debug=1`;
const debugBase = `http://${host}:${debugPort}`;
const artifactsDir = resolve('artifacts', 'phase1');
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
  let diagnostics = null;
  try { diagnostics = JSON.parse(document.querySelector('#diagnostics')?.textContent || 'null'); } catch {}
  return {
    status: document.querySelector('#status')?.textContent || '',
    errorHidden: document.querySelector('#error')?.hidden ?? null,
    errorText: document.querySelector('#error-text')?.textContent || '',
    canvasCount: document.querySelectorAll('canvas').length,
    diagnostics,
  };
})()`;

const preview = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js'), 'preview', '--host', host, '--port', String(previewPort), '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CI: '1' },
});
const profileDir = mkdtempSync(join(tmpdir(), 'bohemia-phase1-chrome-'));
let chrome;
let cdp;

try {
  await waitForHttp(`http://${host}:${previewPort}/`);
  const chromePath = findChrome();
  chrome = spawn(chromePath, [
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
  await cdp.send('Page.navigate', { url: baseUrl });

  const deadline = Date.now() + 30_000;
  let state;
  let healthyState;
  while (Date.now() < deadline) {
    state = await evaluate(cdp, stateExpression);
    if (state?.errorHidden === false || state?.status === 'Renderer unavailable') {
      throw new Error(`Phase 1 runtime error: ${JSON.stringify(state)}`);
    }
    const diagnostics = state?.diagnostics;
    if (
      state?.status === 'WEBGL2 · Scene running' &&
      state.canvasCount === 1 &&
      diagnostics?.milestone === 'phase-1' &&
      diagnostics.renderer === 'webgl2' &&
      diagnostics.failed === false &&
      diagnostics.deviceLost === false &&
      Number(diagnostics.tick) >= 1 &&
      Number(diagnostics.drawCalls) >= 1 &&
      Number(diagnostics.structures) >= 3 &&
      diagnostics.storehouseCandidate === 'procedural-project-owned' &&
      Number(diagnostics.storehouseTriangles) >= 15_000 &&
      diagnostics.workshopCandidate === 'procedural-project-owned' &&
      Number(diagnostics.workshopTriangles) >= 20_000 &&
      diagnostics.treeCandidate === 'procedural-project-owned' &&
      Number(diagnostics.treeCandidateTriangles) >= 15_000 &&
      Number(diagnostics.trees) >= 24 &&
      diagnostics.inhabitantCandidate === 'procedural-project-owned-readability-prototype' &&
      Number(diagnostics.inhabitants) >= 5 &&
      Number(diagnostics.inhabitantTriangles) >= 1_200 && Number(diagnostics.inhabitantTriangles) <= 3_000 &&
      Number(diagnostics.grassClumps) >= 1
    ) {
      healthyState = state;
      break;
    }
    await sleep(250);
  }
  if (!healthyState) throw new Error(`Timed out waiting for rendered Phase 1 scene: ${JSON.stringify(state)}`);

  await sleep(500);
  const finalState = await evaluate(cdp, stateExpression);
  const diagnostics = finalState?.diagnostics;
  if (
    finalState?.status !== 'WEBGL2 · Scene running' ||
    finalState.canvasCount !== 1 ||
    diagnostics?.failed !== false || diagnostics?.deviceLost !== false ||
    Number(diagnostics?.tick) < 1 || Number(diagnostics?.drawCalls) < 1 ||
    Number(diagnostics?.structures) < 3 ||
    diagnostics?.storehouseCandidate !== 'procedural-project-owned' ||
    Number(diagnostics?.storehouseTriangles) < 15_000 ||
    diagnostics?.workshopCandidate !== 'procedural-project-owned' ||
    Number(diagnostics?.workshopTriangles) < 20_000 ||
    diagnostics?.treeCandidate !== 'procedural-project-owned' ||
    Number(diagnostics?.treeCandidateTriangles) < 15_000 ||
    Number(diagnostics?.trees) < 24 ||
    diagnostics?.inhabitantCandidate !== 'procedural-project-owned-readability-prototype' ||
    Number(diagnostics?.inhabitants) < 5 ||
    Number(diagnostics?.inhabitantTriangles) < 1_200 || Number(diagnostics?.inhabitantTriangles) > 3_000
  ) {
    throw new Error(`Phase 1 scene became unhealthy before evidence capture: ${JSON.stringify(finalState)}`);
  }

  const capture = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  const screenshotPath = resolve(artifactsDir, 'phase1-webgl2-1920x1080.png');
  writeFileSync(screenshotPath, Buffer.from(capture.data, 'base64'));

  console.log('Phase 1 browser smoke passed.');
  console.log(JSON.stringify({
    tick: diagnostics.tick,
    structures: diagnostics.structures,
    inhabitants: diagnostics.inhabitants,
    inhabitantCandidate: diagnostics.inhabitantCandidate,
    inhabitantTriangles: diagnostics.inhabitantTriangles,
    trees: diagnostics.trees,
    grassClumps: diagnostics.grassClumps,
    storehouseCandidate: diagnostics.storehouseCandidate,
    storehouseTriangles: diagnostics.storehouseTriangles,
    workshopCandidate: diagnostics.workshopCandidate,
    workshopTriangles: diagnostics.workshopTriangles,
    treeCandidate: diagnostics.treeCandidate,
    treeCandidateTriangles: diagnostics.treeCandidateTriangles,
    drawCalls: diagnostics.drawCalls,
    fps: diagnostics.fps,
    frameMs: diagnostics.frameMs,
    screenshot: screenshotPath,
  }, null, 2));
} finally {
  cdp?.close();
  await stopProcess(chrome);
  await stopProcess(preview);
  rmSync(profileDir, { recursive: true, force: true });
}
