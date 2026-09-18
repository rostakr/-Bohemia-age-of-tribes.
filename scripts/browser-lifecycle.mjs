import { mkdtempSync, rmSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const host = '127.0.0.1';
const previewPort = 4177;
const debugPort = 9227;
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
  while (Date.now() < deadline) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await sleep(200);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([once(child, 'exit'), sleep(1500)]);
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
  let diagnostics = null;
  try { diagnostics = JSON.parse(document.querySelector('#diagnostics')?.textContent || 'null'); } catch {}
  return {
    canvasCount: document.querySelectorAll('canvas').length,
    errorHidden: document.querySelector('#error')?.hidden ?? null,
    errorText: document.querySelector('#error-text')?.textContent || '',
    status: document.querySelector('#status')?.textContent || '',
    debugBridge: Boolean(window.__BOHEMIA_DEBUG__),
    mounted: Boolean(window.__BOHEMIA_DEBUG__?.snapshot?.()),
    diagnostics,
  };
})()`;

async function waitFor(cdp, predicate, label, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  let latest;
  while (Date.now() < deadline) {
    latest = await evaluate(cdp, stateExpression);
    if (predicate(latest)) return latest;
    await sleep(150);
  }
  throw new Error(`${label} timed out. Last state: ${JSON.stringify(latest)}`);
}

const preview = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js'), 'preview', '--host', host, '--port', String(previewPort), '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CI: '1' },
});
const profileDir = mkdtempSync(join(tmpdir(), 'bohemia-lifecycle-chrome-'));
let chrome;
let cdp;

try {
  await waitForHttp(`http://${host}:${previewPort}/`);
  chrome = spawn(findChrome(), [
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

  let state = await waitFor(cdp, s => s.debugBridge && s.mounted && s.canvasCount === 1 && s.diagnostics?.renderer === 'webgl2' && s.diagnostics.tick >= 1, 'initial mounted runtime');
  if (!state.errorHidden || state.diagnostics.failed || state.diagnostics.destroyed) throw new Error(`Initial runtime unhealthy: ${JSON.stringify(state)}`);

  const cycles = [];
  for (let cycle = 1; cycle <= 3; cycle++) {
    await evaluate(cdp, `window.__BOHEMIA_DEBUG__.unmount()`);
    state = await waitFor(cdp, s => s.debugBridge && !s.mounted && s.canvasCount === 1, `unmount ${cycle}`);
    if (state.errorHidden === false) throw new Error(`Error UI became visible after unmount ${cycle}: ${JSON.stringify(state)}`);

    await evaluate(cdp, `window.__BOHEMIA_DEBUG__.mount()`);
    state = await waitFor(cdp, s => s.mounted && s.canvasCount === 1 && s.diagnostics?.renderer === 'webgl2' && s.diagnostics.tick >= 1, `mount ${cycle}`);
    if (!state.errorHidden || state.diagnostics.failed || state.diagnostics.deviceLost || state.diagnostics.destroyed) {
      throw new Error(`Runtime unhealthy after remount ${cycle}: ${JSON.stringify(state)}`);
    }
    cycles.push({ cycle, tick: state.diagnostics.tick, width: state.diagnostics.width, height: state.diagnostics.height });
  }

  console.log('Phase 0 lifecycle remount smoke passed.');
  console.log(JSON.stringify({ cycles, final: state.diagnostics }, null, 2));
} finally {
  cdp?.close();
  await stopProcess(chrome);
  await stopProcess(preview);
  rmSync(profileDir, { recursive: true, force: true });
}
