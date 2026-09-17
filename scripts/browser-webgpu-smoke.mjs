import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';

const host = '127.0.0.1';
const port = 4175;
const baseUrl = `http://${host}:${port}/?debug=1`;
const sleep = ms => new Promise(resolvePromise => setTimeout(resolvePromise, ms));

function findChrome() {
  for (const candidate of [process.env.CHROME_BIN, 'google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser'].filter(Boolean)) {
    const result = spawnSync('which', [candidate], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  throw new Error('No Chromium/Chrome executable found');
}

async function waitForServer(url, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) { lastError = error; }
    await sleep(200);
  }
  throw new Error(`Preview server did not become ready: ${String(lastError)}`);
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

function runProbe(chrome, label, graphicsArgs) {
  const args = [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
    '--enable-unsafe-webgpu', '--enable-features=WebGPUDeveloperFeatures,Vulkan',
    '--window-size=1280,720', '--virtual-time-budget=6000',
    ...graphicsArgs, '--dump-dom', baseUrl,
  ];
  const result = spawnSync(chrome, args, {
    encoding: 'utf8', timeout: 30_000, maxBuffer: 16 * 1024 * 1024,
  });
  const dom = result.stdout || '';
  const ok = result.status === 0 && dom.includes('WEBGPU · Foundation running') && /"renderer"\s*:\s*"webgpu"/.test(dom) && /"failed"\s*:\s*false/.test(dom) && /"deviceLost"\s*:\s*false/.test(dom);
  const tick = Number(dom.match(/"tick"\s*:\s*(\d+)/)?.[1] || 0);
  return { label, ok, tick, status: result.status, stderr: result.stderr, tail: dom.slice(-5000) };
}

const viteBin = resolve('node_modules/vite/bin/vite.js');
const preview = spawn(process.execPath, [viteBin, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CI: '1' },
});
let previewOutput = '';
preview.stdout.on('data', chunk => { previewOutput += chunk.toString(); });
preview.stderr.on('data', chunk => { previewOutput += chunk.toString(); });

try {
  await waitForServer(`http://${host}:${port}/`);
  const chrome = findChrome();
  console.log(`WebGPU smoke using ${spawnSync(chrome, ['--version'], { encoding: 'utf8' }).stdout.trim()}`);

  const probes = [
    ['vulkan-swiftshader', ['--use-vulkan=swiftshader', '--use-angle=swiftshader']],
    ['angle-swiftshader', ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader']],
    ['default-software', ['--enable-unsafe-swiftshader']],
  ];

  const results = [];
  for (const [label, args] of probes) {
    const result = runProbe(chrome, label, args);
    results.push(result);
    if (result.ok) {
      console.log('Phase 0 software WebGPU smoke passed.');
      console.log(JSON.stringify({ label: result.label, tick: result.tick }, null, 2));
      process.exitCode = 0;
      break;
    }
  }

  if (!results.some(result => result.ok)) {
    console.error(JSON.stringify(results.map(({ label, status, tick, stderr, tail }) => ({ label, status, tick, stderr: stderr?.slice(-2000), tail })), null, 2));
    throw new Error('No software WebGPU probe reached a healthy PlayCanvas WebGPU runtime.');
  }
} finally {
  await stopProcess(preview);
  if (preview.exitCode && preview.exitCode !== 0 && previewOutput) console.error(previewOutput);
}
