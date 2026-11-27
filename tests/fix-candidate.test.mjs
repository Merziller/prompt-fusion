import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

// Historical release integrity tests, not acceptance tests for current bugfixes.
// The bytes and the verifier, including its imports, come from this frozen snapshot.
const fixtureDir = new URL('./fixtures/released-0.5.1/', import.meta.url);
const releaseCommit = '276f801784a66b79f3b229f64a633aaedcafae71';
const manifestPath = 'evals/releases/0.5.1/manifest.json';
const manifestSha256 = 'a31bd78e6292c84313779d2e5e87e3430c4ed76449e856b69526b33089e23a37';
const payloadSha256 = 'e0f84e266ac6d43a9303545f6ed036b4f23d7d4230dae91fadf1e7e46163e361';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

async function releasedSnapshot() {
  const provenance = JSON.parse(await readFile(new URL('provenance.json', fixtureDir), 'utf8'));
  const payload = await readFile(new URL('payload.json.gz', fixtureDir));
  assert.equal(provenance.schema, 'prompt-fusion-released-fixture-v1');
  assert.equal(provenance.version, '0.5.1');
  assert.equal(provenance.releaseCommit, releaseCommit);
  assert.equal(provenance.payload.path, 'payload.json.gz');
  assert.equal(provenance.payload.encoding, 'gzip-json-base64');
  assert.equal(provenance.payload.sha256, payloadSha256);
  assert.equal(sha256(payload), payloadSha256, 'Frozen release payload changed');
  assert.equal(payload.length, provenance.payload.bytes);
  const unpacked = gunzipSync(payload, { maxOutputLength: 2 * 1024 * 1024 });
  assert.equal(unpacked.length, provenance.payload.uncompressedBytes);
  assert.equal(sha256(unpacked), provenance.payload.uncompressedSha256);
  const snapshot = JSON.parse(unpacked);
  assert.equal(snapshot.schema, 'prompt-fusion-release-snapshot-v1');
  assert.equal(snapshot.releaseCommit, releaseCommit);
  assert.equal(snapshot.manifestPath, manifestPath);
  assert.equal(snapshot.files.length, 88);
  assert.equal(snapshot.files.length, provenance.archiveEntries);
  const files = new Map();
  for (const entry of snapshot.files) {
    assert.ok(Array.isArray(entry) && entry.length === 2);
    const [name, encoded] = entry;
    assert.ok(typeof name === 'string' && !path.isAbsolute(name) && !/[:\\]/u.test(name) &&
      name.split('/').every(part => part && part !== '.' && part !== '..'), 'Unsafe fixture path');
    assert.ok(!files.has(name), 'Duplicate fixture path');
    assert.equal(typeof encoded, 'string');
    const bytes = Buffer.from(encoded, 'base64');
    assert.equal(bytes.toString('base64'), encoded);
    files.set(name, bytes);
  }
  const manifestBytes = files.get(manifestPath);
  assert.ok(manifestBytes, 'Frozen release manifest missing');
  assert.deepEqual(provenance.manifest, { path: manifestPath, bytes: 14700, sha256: manifestSha256 });
  assert.equal(manifestBytes.length, provenance.manifest.bytes);
  assert.equal(sha256(manifestBytes), manifestSha256, 'Original release manifest changed');
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.files.length, 87);
  assert.equal(manifest.files.length, provenance.inventoryFiles);
  assert.deepEqual([...files.keys()].sort(), [manifestPath, ...manifest.files.map(item => item.path)].sort());
  for (const item of manifest.files) {
    const bytes = files.get(item.path);
    assert.equal(bytes.length, item.bytes, `Frozen release length changed: ${item.path}`);
    assert.equal(sha256(bytes), item.sha256, `Frozen release SHA-256 changed: ${item.path}`);
  }
  return { files, manifest };
}
async function fixture(run) {
  const { files, manifest } = await releasedSnapshot();
  const base = await mkdtemp(path.join(tmpdir(), 'pf-distribution-identity-'));
  try {
    for (const [name, bytes] of files) {
      const target = path.join(base, name); await mkdir(path.dirname(target), { recursive:true });
      await writeFile(target, bytes);
    }
    // Load before tampering, from a unique root so dependencies are also the released versions.
    const { verifyDistribution, DISTRIBUTION_MANIFEST } = await import(pathToFileURL(path.join(base, 'scripts/verify-distribution.mjs')).href);
    assert.equal(DISTRIBUTION_MANIFEST, manifestPath);
    await run(base, manifest, verifyDistribution);
  } finally { assert.ok(path.basename(base).startsWith('pf-distribution-identity-')); await rm(base, { recursive:true, force:true }); }
}
test('historical 0.5.1: release verifies exact tested behavior and retained samples without inventing GUI or quality acceptance', async () => fixture(async (base, manifest, verifyDistribution) => {
  const result = await verifyDistribution(base);
  assert.equal(result.status, 'PASS'); assert.equal(result.version, '0.5.1');
  assert.equal(result.files, 87); assert.equal(manifest.version, '0.5.1');
  assert.equal(result.qualityAcceptance, 'NOT_CLAIMED_FOR_RELEASE'); assert.equal(result.authenticatedGui, 'NOT_RUN');
  assert.equal(result.hostObservations, 8); assert.equal(result.runtimeModules, 13);
}));
test('historical 0.5.1: release rejects a changed behavior byte', async () => fixture(async (base, manifest, verifyDistribution) => {
  await writeFile(path.join(base, 'src/intent-guards.mjs'), '// modified\n');
  await assert.rejects(verifyDistribution(base), /Distribution bytes changed/);
}));
test('historical 0.5.1: release rejects additional unrecorded runtime modules', async () => fixture(async (base, manifest, verifyDistribution) => {
  await writeFile(path.join(base, 'src/unrecorded.mjs'), 'export const x = 1;\n');
  await assert.rejects(verifyDistribution(base), /Runtime or verification file inventory changed/);
}));
test('historical 0.5.1: release rejects path escape and duplicate entries', async () => fixture(async (base, manifest, verifyDistribution) => {
  manifest.files.push({path:'../outside', bytes:0, sha256:'0'.repeat(64)});
  await writeFile(path.join(base, manifestPath), JSON.stringify(manifest));
  await assert.rejects(verifyDistribution(base), /Unsafe manifest path/);
  manifest.files.pop(); manifest.files.push(manifest.files[0]);
  await writeFile(path.join(base, manifestPath), JSON.stringify(manifest));
  await assert.rejects(verifyDistribution(base), /Duplicate manifest path/);
}));
test('historical 0.5.1: even rehashed metadata must keep the release version aligned', async () => fixture(async (base, manifest, verifyDistribution) => {
  const target = path.join(base, 'package.json'), pkg = JSON.parse(await readFile(target, 'utf8'));
  pkg.version = '0.5.9'; const data = Buffer.from(JSON.stringify(pkg)); await writeFile(target, data);
  const entry = manifest.files.find(item => item.path === 'package.json');
  entry.bytes = data.length; entry.sha256 = createHash('sha256').update(data).digest('hex');
  await writeFile(path.join(base, manifestPath), JSON.stringify(manifest));
  await assert.rejects(verifyDistribution(base), /Distribution versions differ/);
}));
test('historical 0.5.1: release rejects changing tested behavior even when the file hash is re-recorded', async () => fixture(async (base, manifest, verifyDistribution) => {
  const target = path.join(base, 'src/intent-guards.mjs');
  const data = Buffer.from((await readFile(target, 'utf8')) + '\n// untested change\n'); await writeFile(target, data);
  const entry = manifest.files.find(item => item.path === 'src/intent-guards.mjs'); entry.bytes=data.length; entry.sha256=createHash('sha256').update(data).digest('hex');
  await writeFile(path.join(base, manifestPath), JSON.stringify(manifest));
  await assert.rejects(verifyDistribution(base), /Behavior differs from tested fix/);
}));
test('historical 0.5.1: release rejects a fabricated GUI acceptance claim', async () => fixture(async (base, manifest, verifyDistribution) => {
  manifest.authenticatedGui='PASS'; await writeFile(path.join(base, manifestPath), JSON.stringify(manifest));
  await assert.rejects(verifyDistribution(base), /Unexpected release evidence claim/);
}));
