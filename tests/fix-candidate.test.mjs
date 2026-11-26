import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyDistribution, DISTRIBUTION_MANIFEST } from '../scripts/verify-distribution.mjs';
const project = fileURLToPath(new URL('../', import.meta.url));
const manifestPath = DISTRIBUTION_MANIFEST;
async function fixture(run) {
  const base = await mkdtemp(path.join(tmpdir(), 'pf-distribution-identity-'));
  try {
    const manifest = JSON.parse(await readFile(path.join(project, manifestPath), 'utf8'));
    for (const item of manifest.files) {
      const target = path.join(base, item.path); await mkdir(path.dirname(target), { recursive:true });
      await writeFile(target, await readFile(path.join(project, item.path)));
    }
    await mkdir(path.join(base, path.dirname(manifestPath)), { recursive:true });
    await writeFile(path.join(base, manifestPath), JSON.stringify(manifest));
    await run(base, manifest);
  } finally { assert.ok(path.basename(base).startsWith('pf-distribution-identity-')); await rm(base, { recursive:true, force:true }); }
}
test('release verifies exact tested behavior and retained samples without inventing GUI or quality acceptance', async () => {
  const result = await verifyDistribution(project);
  assert.equal(result.status, 'PASS'); assert.equal(result.version, '0.5.1');
  assert.equal(result.qualityAcceptance, 'NOT_CLAIMED_FOR_RELEASE'); assert.equal(result.authenticatedGui, 'NOT_RUN');
  assert.equal(result.hostObservations, 8); assert.equal(result.runtimeModules, 13);
});
test('release rejects a changed behavior byte', async () => fixture(async base => {
  await writeFile(path.join(base, 'src/intent-guards.mjs'), '// modified\n');
  await assert.rejects(verifyDistribution(base), /Distribution bytes changed/);
}));
test('release rejects additional unrecorded runtime modules', async () => fixture(async base => {
  await writeFile(path.join(base, 'src/unrecorded.mjs'), 'export const x = 1;\n');
  await assert.rejects(verifyDistribution(base), /Runtime or verification file inventory changed/);
}));
test('release rejects path escape and duplicate entries', async () => fixture(async (base, manifest) => {
  manifest.files.push({path:'../outside', bytes:0, sha256:'0'.repeat(64)});
  await writeFile(path.join(base, manifestPath), JSON.stringify(manifest));
  await assert.rejects(verifyDistribution(base), /Unsafe manifest path/);
  manifest.files.pop(); manifest.files.push(manifest.files[0]);
  await writeFile(path.join(base, manifestPath), JSON.stringify(manifest));
  await assert.rejects(verifyDistribution(base), /Duplicate manifest path/);
}));
test('even rehashed metadata must keep the release version aligned', async () => fixture(async (base, manifest) => {
  const target = path.join(base, 'package.json'), pkg = JSON.parse(await readFile(target, 'utf8'));
  pkg.version = '0.5.9'; const data = Buffer.from(JSON.stringify(pkg)); await writeFile(target, data);
  const entry = manifest.files.find(item => item.path === 'package.json');
  entry.bytes = data.length; entry.sha256 = createHash('sha256').update(data).digest('hex');
  await writeFile(path.join(base, manifestPath), JSON.stringify(manifest));
  await assert.rejects(verifyDistribution(base), /Distribution versions differ/);
}));
test('release rejects changing tested behavior even when the current file hash is re-recorded', async () => fixture(async (base, manifest) => {
  const target = path.join(base, 'src/intent-guards.mjs');
  const data = Buffer.from((await readFile(target, 'utf8')) + '\n// untested change\n'); await writeFile(target, data);
  const entry = manifest.files.find(item => item.path === 'src/intent-guards.mjs'); entry.bytes=data.length; entry.sha256=createHash('sha256').update(data).digest('hex');
  await writeFile(path.join(base, manifestPath), JSON.stringify(manifest));
  await assert.rejects(verifyDistribution(base), /Behavior differs from tested fix/);
}));
test('release rejects a fabricated GUI acceptance claim', async () => fixture(async (base, manifest) => {
  manifest.authenticatedGui='PASS'; await writeFile(path.join(base, manifestPath), JSON.stringify(manifest));
  await assert.rejects(verifyDistribution(base), /Unexpected release evidence claim/);
}));
