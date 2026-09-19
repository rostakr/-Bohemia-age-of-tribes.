import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EXPECTED_TEXTURES = new Map([
  ['../materials/storehouse/weathered-oak-basecolor-runtime-512.jpg', {
    path: 'public/assets/materials/storehouse/weathered-oak-basecolor-runtime-512.jpg',
    bytes: 98279,
    sha256: 'c6abab6dd1959b80929657ffeda3a2425d6f3d965ae4d7f46ea45d774d1e8684',
  }],
  ['../materials/storehouse/straw-thatch-basecolor-runtime-512.jpg', {
    path: 'public/assets/materials/storehouse/straw-thatch-basecolor-runtime-512.jpg',
    bytes: 138633,
    sha256: '0564f253d920fcdb6bc2e300687abe067912991b53e0e9fa72abdd1c7e5a8f0a',
  }],
  ['../materials/storehouse/clay-daub-basecolor-runtime-512.jpg', {
    path: 'public/assets/materials/storehouse/clay-daub-basecolor-runtime-512.jpg',
    bytes: 87217,
    sha256: 'dc10ae700c143796fda36947149a4a47299b6e36a8f4cb1b2b3dd4b9c3f67ede',
  }],
]);

function parseGlb(buffer) {
  if (buffer.length < 20 || buffer.toString('ascii', 0, 4) !== 'glTF') throw new Error('invalid GLB');
  if (buffer.readUInt32LE(4) !== 2) throw new Error('expected GLB 2.0');
  if (buffer.readUInt32LE(8) !== buffer.length) throw new Error('declared GLB length mismatch');
  let offset = 12;
  let json;
  let bin;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + length;
    if (end > buffer.length) throw new Error('GLB chunk exceeds file bounds');
    if (type === 0x4e4f534a) json = JSON.parse(buffer.subarray(start, end).toString('utf8').trimEnd());
    else if (type === 0x004e4942) bin = buffer.subarray(start, end);
    offset = end;
  }
  if (!json || !bin) throw new Error('storehouse GLB must contain JSON and BIN chunks');
  return { json, bin };
}

function pad4(buffer, fill = 0) {
  const padding = (4 - buffer.length % 4) % 4;
  return padding ? Buffer.concat([buffer, Buffer.alloc(padding, fill)]) : buffer;
}

function rebuildGlb(json, bin) {
  const jsonChunk = pad4(Buffer.from(JSON.stringify(json), 'utf8'), 0x20);
  const binChunk = pad4(bin, 0);
  const total = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
  const output = Buffer.alloc(total);
  output.write('glTF', 0, 'ascii');
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(total, 8);
  let offset = 12;
  output.writeUInt32LE(jsonChunk.length, offset);
  output.writeUInt32LE(0x4e4f534a, offset + 4);
  jsonChunk.copy(output, offset + 8);
  offset += 8 + jsonChunk.length;
  output.writeUInt32LE(binChunk.length, offset);
  output.writeUInt32LE(0x004e4942, offset + 4);
  binChunk.copy(output, offset + 8);
  return output;
}

const [file, ...limits] = process.argv.slice(2);
if (!file) {
  console.error('Usage: node scripts/check-storehouse-runtime.mjs <storehouse.glb> [check-glb limits...]');
  process.exit(2);
}

let directory;
try {
  const buffer = readFileSync(file);
  const { json, bin } = parseGlb(buffer);
  const images = json.images ?? [];
  if (images.length !== EXPECTED_TEXTURES.size) throw new Error(`expected exactly ${EXPECTED_TEXTURES.size} storehouse images; got ${images.length}`);
  const seen = new Set();
  for (const [index, image] of images.entries()) {
    const uri = image?.uri;
    const expected = EXPECTED_TEXTURES.get(uri);
    if (!expected) throw new Error(`image[${index}] uses non-allowlisted URI: ${String(uri)}`);
    if (seen.has(uri)) throw new Error(`duplicate storehouse image URI: ${uri}`);
    seen.add(uri);
    const bytes = readFileSync(expected.path);
    if (bytes.length !== expected.bytes) throw new Error(`${expected.path}: bytes ${bytes.length} != ${expected.bytes}`);
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (hash !== expected.sha256) throw new Error(`${expected.path}: sha256 ${hash} != ${expected.sha256}`);
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) {
      throw new Error(`${expected.path}: invalid JPEG SOI/EOI markers`);
    }
    image.uri = `data:image/jpeg;base64,${bytes.toString('base64')}`;
  }
  if (seen.size !== EXPECTED_TEXTURES.size) throw new Error('storehouse texture allowlist is incomplete');

  directory = mkdtempSync(join(tmpdir(), 'bohemia-storehouse-check-'));
  const selfContained = join(directory, 'storehouse-self-contained-for-structural-check.glb');
  writeFileSync(selfContained, rebuildGlb(json, bin));
  const result = spawnSync(process.execPath, ['scripts/check-glb.mjs', selfContained, ...limits], { encoding: 'utf8' });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  else console.log(JSON.stringify({
    storehouseExternalTextures: [...EXPECTED_TEXTURES.keys()],
    externalTextureBytes: [...EXPECTED_TEXTURES.values()].reduce((sum, entry) => sum + entry.bytes, 0),
    allowlistVerified: true,
  }));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (directory) rmSync(directory, { recursive: true, force: true });
}
