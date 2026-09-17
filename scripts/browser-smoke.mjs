import { mkdirSync, readFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';

const host = '127.0.0.1';
const port = 4173;
const baseUrl = `http://${host}:${port}/`;
const artifactsDir = resolve('artifacts');
mkdirSync(artifactsDir, { recursive: true });

function sleep(ms) {
  return new Promise(resolvePromise => setTimeout(resolvePromise, ms));
}

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    'google-chrome-stable',
    'google-chrome',
    'chromium',
    'chromium-browser',
  ].filter(Boolean);

  for (const candidate of candidates) {
    const result = spawnSync('which', [candidate], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  throw new Error(`No Chromium/Chrome executable found. Tried: ${candidates.join(', ')}`);
}

async function waitForServer(url, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  throw new Error(`Preview server did not become ready: ${String(lastError)}`);
}

function runChrome(chrome, width, height, extraArgs = []) {
  const url = `${baseUrl}?renderer=webgl2&debug=1`;
  const args = [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    `--window-size=${width},${height}`,
    '--virtual-time-budget=2500',
    ...extraArgs,
    url,
  ];
  return spawnSync(chrome, args, {
    encoding: 'utf8',
    timeout: 25_000,
    maxBuffer: 16 * 1024 * 1024,
  });
}

function assertDom(result, label) {
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label}: Chrome exited ${result.status}\n${result.stderr}`);
  }
  const dom = result.stdout;
  if (!dom.includes('WEBGL2 · Foundation running')) {
    throw new Error(`${label}: expected running WebGL2 status not found.\n${dom.slice(-5000)}`);
  }
  if (dom.includes('Renderer unavailable')) {
    throw new Error(`${label}: renderer failure UI was shown.`);
  }
  const tickMatch = dom.match(/"tick"\s*:\s*(\d+)/);
  if (!tickMatch || Number(tickMatch[1]) < 1) {
    throw new Error(`${label}: simulation tick did not advance.\n${dom.slice(-5000)}`);
  }
  if (!/"failed"\s*:\s*false/.test(dom)) {
    throw new Error(`${label}: diagnostics did not report failed=false.`);
  }
  if (!/"deviceLost"\s*:\s*false/.test(dom)) {
    throw new Error(`${label}: diagnostics did not report deviceLost=false.`);
  }

  const widthMatch = dom.match(/"width"\s*:\s*(\d+)/);
  const heightMatch = dom.match(/"height"\s*:\s*(\d+)/);
  return {
    tick: Number(tickMatch[1]),
    width: widthMatch ? Number(widthMatch[1]) : 0,
    height: heightMatch ? Number(heightMatch[1]) : 0,
  };
}

const viteBin = resolve('node_modules/vite/bin/vite.js');
const preview = spawn(process.execPath, [viteBin, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, CI: '1' },
});
let previewOutput = '';
preview.stdout.on('data', chunk => { previewOutput += chunk.toString(); });
preview.stderr.on('data', chunk => { previewOutput += chunk.toString(); });

async function stopPreview() {
  if (preview.exitCode !== null) return;
  preview.kill('SIGTERM');
  await Promise.race([once(preview, 'exit'), sleep(1500)]);
  if (preview.exitCode === null) {
    preview.kill('SIGKILL');
    await Promise.race([once(preview, 'exit'), sleep(1500)]);
  }
}

try {
  await waitForServer(baseUrl);
  const chrome = findChrome();
  const version = spawnSync(chrome, ['--version'], { encoding: 'utf8' }).stdout.trim();
  console.log(`Browser smoke using ${version}`);

  const small = assertDom(runChrome(chrome, 1280, 720, ['--dump-dom']), '1280x720');
  const large = assertDom(runChrome(chrome, 1920, 1080, ['--dump-dom']), '1920x1080');

  if (small.width < 1 || small.height < 1 || large.width < 1 || large.height < 1) {
    throw new Error(`Invalid canvas dimensions: ${JSON.stringify({ small, large })}`);
  }
  if (large.width < small.width || large.height < small.height) {
    throw new Error(`Canvas did not grow with viewport: ${JSON.stringify({ small, large })}`);
  }

  const screenshotPath = resolve(artifactsDir, 'phase0-webgl2-1920x1080.png');
  const screenshot = runChrome(chrome, 1920, 1080, [`--screenshot=${screenshotPath}`]);
  if (screenshot.error) throw screenshot.error;
  if (screenshot.status !== 0) {
    throw new Error(`Screenshot Chrome exited ${screenshot.status}\n${screenshot.stderr}`);
  }
  readFileSync(screenshotPath);

  console.log('Phase 0 WebGL2 browser smoke passed.');
  console.log(JSON.stringify({ small, large, screenshot: screenshotPath }, null, 2));
} finally {
  await stopPreview();
  if (preview.exitCode && preview.exitCode !== 0 && previewOutput) console.error(previewOutput);
}
