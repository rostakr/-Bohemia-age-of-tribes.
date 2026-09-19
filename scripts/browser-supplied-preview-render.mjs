import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const host = '127.0.0.1';
const previewPort = 4181;
const debugPort = 9231;
const debugBase = `http://${host}:${debugPort}`;
const artifactsDir = resolve('artifacts', 'supplied-preview');
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
const profileDir = mkdtempSync(join(tmpdir(), 'bohemia-supplied-preview-'));
let chrome;
let cdp;

async function screenshot(name) {
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  const screenshotPath = resolve(artifactsDir, name);
  writeFileSync(screenshotPath, Buffer.from(shot.data, 'base64'));
  return screenshotPath;
}

async function capture(kind, expectedTriangles) {
  const url = `http://${host}:${previewPort}/?scene=supplied-preview&asset=${kind}&renderer=webgl2&debug=1`;
  await cdp.send('Page.navigate', { url });
  const deadline = Date.now() + 30_000;
  let state;
  while (Date.now() < deadline) {
    state = await evaluate(cdp, stateExpression);
    if (state?.errorHidden === false || state?.status === 'Renderer unavailable') {
      throw new Error(`${kind} preview runtime error: ${JSON.stringify(state)}`);
    }
    const diagnostics = state?.diagnostics;
    if (
      state?.status === 'WEBGL2 · Scene running' &&
      state.canvasCount === 1 &&
      diagnostics?.milestone === 'phase-1-supplied-preview' &&
      diagnostics.renderer === 'webgl2' &&
      diagnostics.failed === false &&
      diagnostics.deviceLost === false &&
      diagnostics.previewAsset === kind &&
      diagnostics.modelLoaded === true &&
      Number(diagnostics.previewTriangles) === expectedTriangles &&
      Number(diagnostics.tick) >= 1 &&
      Number(diagnostics.drawCalls) >= 1
    ) break;
    await sleep(250);
  }
  let diagnostics = state?.diagnostics;
  if (!diagnostics || diagnostics.previewAsset !== kind || diagnostics.modelLoaded !== true || Number(diagnostics.previewTriangles) !== expectedTriangles) {
    throw new Error(`Timed out waiting for ${kind} supplied preview: ${JSON.stringify(state)}`);
  }

  await sleep(700);
  await evaluate(cdp, `(() => {
    const shell = document.querySelector('.shell'); if (shell) shell.style.display = 'none';
    const diagnostics = document.querySelector('#diagnostics'); if (diagnostics) diagnostics.style.display = 'none';
    return true;
  })()`);
  state = await evaluate(cdp, stateExpression);
  diagnostics = state?.diagnostics ?? diagnostics;
  const frontPath = await screenshot(`supplied-${kind}-front-1920x1080.png`);
  const frontYaw = Number(diagnostics?.previewYawDegrees ?? 0);

  // The QA scene rotates at 20 degrees/second. Nine seconds gives an opposite-side view
  // while preserving identical camera/light/material conditions.
  await sleep(9000);
  state = await evaluate(cdp, stateExpression);
  diagnostics = state?.diagnostics;
  if (!diagnostics || diagnostics.previewAsset !== kind || diagnostics.modelLoaded !== true || diagnostics.failed !== false) {
    throw new Error(`${kind} preview became unhealthy before rear capture: ${JSON.stringify(state)}`);
  }
  const rearPath = await screenshot(`supplied-${kind}-rear-1920x1080.png`);

  console.log(JSON.stringify({
    kind,
    tick: diagnostics.tick,
    drawCalls: diagnostics.drawCalls,
    previewTriangles: diagnostics.previewTriangles,
    frontYaw,
    rearYaw: diagnostics.previewYawDegrees,
    frontScreenshot: frontPath,
    rearScreenshot: rearPath,
  }, null, 2));
}

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

  await capture('workshop', 89_778);
  await capture('worker', 14_106);
  console.log('Supplied normals preview multi-angle render smoke passed.');
} finally {
  cdp?.close();
  await stopProcess(chrome);
  await stopProcess(preview);
  rmSync(profileDir, { recursive: true, force: true });
}
