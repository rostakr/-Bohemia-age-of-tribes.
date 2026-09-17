import { mkdtempSync, rmSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const host = '127.0.0.1';
const previewPort = 4174;
const debugPort = 9223;
const baseUrl = `http://${host}:${previewPort}/?renderer=webgl2&debug=1`;
const debugBase = `http://${host}:${debugPort}`;

const sleep = ms => new Promise(resolvePromise => setTimeout(resolvePromise, ms));

function findChrome() {
  for (const candidate of [process.env.CHROME_BIN, 'google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser'].filter(Boolean)) {
    const result = spawnSync('which', [candidate], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  throw new Error('No Chromium/Chrome executable found');
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
    pauseText: document.querySelector('#pause')?.textContent || '',
    errorHidden: document.querySelector('#error')?.hidden ?? null,
    canvasCount: document.querySelectorAll('canvas').length,
    innerWidth,
    innerHeight,
    diagnostics,
  };
})()`;

async function readState(cdp) { return evaluate(cdp, stateExpression); }

async function waitFor(cdp, predicate, label, timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs;
  let latest;
  while (Date.now() < deadline) {
    try {
      latest = await readState(cdp);
      if (predicate(latest)) return latest;
    } catch {}
    await sleep(150);
  }
  throw new Error(`${label} timed out. Last state: ${JSON.stringify(latest)}`);
}

const viteBin = resolve('node_modules/vite/bin/vite.js');
const preview = spawn(process.execPath, [viteBin, 'preview', '--host', host, '--port', String(previewPort), '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CI: '1' },
});
const chromePath = findChrome();
const profileDir = mkdtempSync(join(tmpdir(), 'bohemia-phase0-chrome-'));
let chrome;
let cdp;

try {
  await waitForHttp(`http://${host}:${previewPort}/`);
  chrome = spawn(chromePath, [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
    `--remote-debugging-address=${host}`, `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`, '--window-size=1280,720', 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  await waitForHttp(`${debugBase}/json/list`);
  const targets = await (await fetch(`${debugBase}/json/list`)).json();
  const page = targets.find(target => target.type === 'page');
  if (!page?.webSocketDebuggerUrl) throw new Error('No debuggable page target found');
  cdp = await connectCdp(page.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Page.navigate', { url: baseUrl });

  let state = await waitFor(cdp, s => s?.diagnostics?.renderer === 'webgl2' && s.diagnostics.tick >= 1 && s.canvasCount === 1, 'initial WebGL2 runtime');
  if (!state.errorHidden || state.diagnostics.failed || state.diagnostics.deviceLost) throw new Error(`Unexpected initial state: ${JSON.stringify(state)}`);

  await evaluate(cdp, `document.querySelector('#pause').click()`);
  state = await waitFor(cdp, s => s?.diagnostics?.paused === true && s.pauseText.includes('Resume'), 'pause state');
  const pausedTick = state.diagnostics.tick;
  await sleep(1000);
  state = await readState(cdp);
  if (state.diagnostics.tick !== pausedTick) throw new Error(`Tick advanced while paused: ${pausedTick} -> ${state.diagnostics.tick}`);
  await evaluate(cdp, `document.querySelector('#pause').click()`);
  state = await waitFor(cdp, s => s?.diagnostics?.paused === false && s.diagnostics.tick > pausedTick, 'resume state');

  await evaluate(cdp, `(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); return document.hidden; })()`);
  state = await waitFor(cdp, s => s?.diagnostics?.hidden === true, 'synthetic hidden state');
  const hiddenTick = state.diagnostics.tick;
  await sleep(10_250);
  state = await readState(cdp);
  if (state.diagnostics.tick !== hiddenTick) throw new Error(`Tick advanced while hidden: ${hiddenTick} -> ${state.diagnostics.tick}`);
  await evaluate(cdp, `(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); return document.hidden; })()`);
  const returned = await waitFor(cdp, s => s?.diagnostics?.hidden === false, 'visibility restore');
  if (returned.diagnostics.tick - hiddenTick > 3) throw new Error(`Catch-up burst after visibility restore: ${hiddenTick} -> ${returned.diagnostics.tick}`);
  await waitFor(cdp, s => s?.diagnostics?.tick > hiddenTick, 'post-visibility tick resume');

  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
  const large = await waitFor(cdp, s => s?.innerWidth === 1600 && s.innerHeight === 900 && s?.diagnostics?.width > 0 && s.diagnostics.height > 0, 'large viewport');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 640, deviceScaleFactor: 1, mobile: false });
  const small = await waitFor(cdp, s => s?.innerWidth === 1024 && s.innerHeight === 640 && s?.diagnostics?.width > 0 && s.diagnostics.height > 0 && s.diagnostics.width < large.diagnostics.width && s.diagnostics.height < large.diagnostics.height, 'small viewport');
  await cdp.send('Emulation.clearDeviceMetricsOverride');

  const canLose = await evaluate(cdp, `(() => { const gl = document.querySelector('#viewport')?.getContext('webgl2'); const ext = gl?.getExtension('WEBGL_lose_context'); if (!ext) return false; window.__phase0LossExt = ext; ext.loseContext(); return true; })()`);
  if (!canLose) throw new Error('WEBGL_lose_context extension unavailable');
  await waitFor(cdp, s => s?.diagnostics?.deviceLost === true, 'graphics device loss');
  await evaluate(cdp, `window.__phase0LossExt.restoreContext()`);
  state = await waitFor(cdp, s => s?.diagnostics?.deviceLost === false && s.status.includes('Foundation running'), 'graphics device restore', 15_000);
  if (state.diagnostics.failed) throw new Error(`Runtime failed after graphics restore: ${JSON.stringify(state)}`);

  for (let i = 0; i < 3; i++) {
    await cdp.send('Page.reload', { ignoreCache: true });
    state = await waitFor(cdp, s => s?.diagnostics?.renderer === 'webgl2' && s.diagnostics.tick >= 1 && s.canvasCount === 1 && s.errorHidden === true, `reload ${i + 1}`, 15_000);
    if (state.diagnostics.failed || state.diagnostics.deviceLost) throw new Error(`Reload ${i + 1} unhealthy: ${JSON.stringify(state)}`);
  }

  console.log('Phase 0 interaction smoke passed.');
  console.log(JSON.stringify({ pausedTick, hiddenTick, large: large.diagnostics, small: small.diagnostics, final: state.diagnostics }, null, 2));
} finally {
  cdp?.close();
  await stopProcess(chrome);
  await stopProcess(preview);
  rmSync(profileDir, { recursive: true, force: true });
}
