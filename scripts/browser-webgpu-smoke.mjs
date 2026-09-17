import { mkdtempSync, rmSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const host = '127.0.0.1';
const previewPort = 4175;
const baseUrl = `http://${host}:${previewPort}/?scene=calibration&debug=1`;
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
    errorHidden: document.querySelector('#error')?.hidden ?? null,
    errorText: document.querySelector('#error-text')?.textContent || '',
    pauseDisabled: document.querySelector('#pause')?.disabled ?? null,
    canvasCount: document.querySelectorAll('canvas').length,
    diagnostics,
  };
})()`;

async function readState(cdp) {
  return evaluate(cdp, stateExpression);
}

async function runProbe(chrome, label, graphicsArgs, index) {
  const debugPort = 9230 + index;
  const debugBase = `http://${host}:${debugPort}`;
  const profileDir = mkdtempSync(join(tmpdir(), `bohemia-webgpu-${index}-`));
  let chromeProcess;
  let cdp;
  let chromeOutput = '';
  let lastState;

  try {
    chromeProcess = spawn(chrome, [
      '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
      '--enable-unsafe-webgpu', '--enable-features=WebGPUDeveloperFeatures,Vulkan',
      `--remote-debugging-address=${host}`, `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profileDir}`, '--window-size=1280,720',
      ...graphicsArgs, 'about:blank',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    chromeProcess.stdout.on('data', chunk => { chromeOutput += chunk.toString(); });
    chromeProcess.stderr.on('data', chunk => { chromeOutput += chunk.toString(); });

    await waitForHttp(`${debugBase}/json/list`, 15_000);
    const targets = await (await fetch(`${debugBase}/json/list`)).json();
    const page = targets.find(target => target.type === 'page');
    if (!page?.webSocketDebuggerUrl) throw new Error('No debuggable page target found');

    cdp = await connectCdp(page.webSocketDebuggerUrl);
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    await cdp.send('Page.navigate', { url: baseUrl });

    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      if (chromeProcess.exitCode !== null) {
        return { label, ok: false, reason: `Chrome exited ${chromeProcess.exitCode}`, state: lastState, chromeOutput: chromeOutput.slice(-4000) };
      }
      try {
        lastState = await readState(cdp);
        const diagnostics = lastState?.diagnostics;
        if (
          lastState?.status === 'WEBGPU · Foundation running' &&
          diagnostics?.renderer === 'webgpu' &&
          diagnostics.failed === false &&
          diagnostics.deviceLost === false &&
          lastState.errorHidden === true &&
          lastState.canvasCount === 1
        ) {
          // WebGPU initialization is the required assertion. Give the render loop a short
          // real-time window so the evidence can also report whether simulation advanced.
          const initialTick = Number(diagnostics.tick || 0);
          const tickDeadline = Date.now() + 2500;
          let finalState = lastState;
          while (Date.now() < tickDeadline) {
            await sleep(200);
            finalState = await readState(cdp);
            if (Number(finalState?.diagnostics?.tick || 0) > initialTick) break;
          }
          return {
            label,
            ok: true,
            tick: Number(finalState?.diagnostics?.tick || 0),
            initialTick,
            state: finalState,
          };
        }

        if (lastState?.status === 'Renderer unavailable' || lastState?.errorHidden === false) {
          return { label, ok: false, reason: 'Application reported renderer failure', state: lastState, chromeOutput: chromeOutput.slice(-4000) };
        }

        if (diagnostics?.renderer === 'webgl2') {
          return { label, ok: false, reason: 'Default path fell back to WebGL2', state: lastState, chromeOutput: chromeOutput.slice(-4000) };
        }
      } catch (error) {
        if (chromeProcess.exitCode !== null) throw error;
      }
      await sleep(250);
    }

    return { label, ok: false, reason: 'Timed out waiting for WebGPU initialization', state: lastState, chromeOutput: chromeOutput.slice(-4000) };
  } catch (error) {
    return { label, ok: false, reason: String(error), state: lastState, chromeOutput: chromeOutput.slice(-4000) };
  } finally {
    cdp?.close();
    await stopProcess(chromeProcess);
    rmSync(profileDir, { recursive: true, force: true });
  }
}

const viteBin = resolve('node_modules/vite/bin/vite.js');
const preview = spawn(process.execPath, [viteBin, 'preview', '--host', host, '--port', String(previewPort), '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CI: '1' },
});
let previewOutput = '';
preview.stdout.on('data', chunk => { previewOutput += chunk.toString(); });
preview.stderr.on('data', chunk => { previewOutput += chunk.toString(); });

try {
  await waitForHttp(`http://${host}:${previewPort}/`);
  const chrome = findChrome();
  console.log(`WebGPU smoke using ${spawnSync(chrome, ['--version'], { encoding: 'utf8' }).stdout.trim()}`);

  const probes = [
    ['vulkan-swiftshader', ['--use-vulkan=swiftshader', '--use-angle=swiftshader']],
    ['angle-swiftshader', ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader']],
    ['default-software', ['--enable-unsafe-swiftshader']],
  ];

  const results = [];
  for (let index = 0; index < probes.length; index++) {
    const [label, args] = probes[index];
    const result = await runProbe(chrome, label, args, index);
    results.push(result);
    if (result.ok) {
      console.log('Phase 0 software WebGPU smoke passed.');
      console.log(JSON.stringify({ label: result.label, initialTick: result.initialTick, tick: result.tick, renderer: result.state?.diagnostics?.renderer }, null, 2));
      break;
    }
    console.warn(`WebGPU probe ${label} did not pass: ${result.reason}`);
  }

  if (!results.some(result => result.ok)) {
    console.error(JSON.stringify(results, null, 2));
    throw new Error('No software WebGPU probe reached a healthy PlayCanvas WebGPU runtime.');
  }
} finally {
  await stopProcess(preview);
  if (preview.exitCode && preview.exitCode !== 0 && previewOutput) console.error(previewOutput);
}
