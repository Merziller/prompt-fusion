// Copyright 2026 绍兴市柯桥区禾杨智绘软件开发工作室 (禾杨智绘) & Merziller (子墨)
// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdtemp, mkdir, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURRENT_MANIFEST, CURRENT_RELEASE, packageFileInventory, verifyCurrentRelease } from '../scripts/verify-current-release.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const hash = b => createHash('sha256').update(b).digest('hex');
async function fixture(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), 'pf-current-release-'));
  try {
    for (const name of await packageFileInventory(root)) { const target = path.join(dir, name); await mkdir(path.dirname(target), { recursive: true }); await copyFile(path.join(root, name), target); }
    await fn(dir);
  } finally { await rm(dir, { recursive: true, force: true }); }
}
async function modifyManifest(dir, fn) {
  const file = path.join(dir, CURRENT_MANIFEST), manifest = JSON.parse(await readFile(file, 'utf8'));
  await fn(manifest); await writeFile(file, JSON.stringify(manifest, null, 2) + '\n');
}
async function rehash(dir, name) {
  const b = await readFile(path.join(dir, name));
  await modifyManifest(dir, m => { const item = m.files.find(f => f.path === name); assert(item); item.bytes = b.length; item.sha256 = hash(b); });
}
test('RC integrity verifies the exact current package and distinguishes candidate observations', async () => {
  const result = await verifyCurrentRelease(root); assert.equal(result.version, CURRENT_RELEASE); assert.equal(result.status, 'PASS'); assert.equal(result.releaseKind, 'prerelease'); assert.equal(result.runtimeModules, 18); assert.equal(result.qualityAcceptance, 'NOT_CLAIMED'); assert.match(result.nativeObservations, /RC_NOT_REEXECUTED/);
});
test('RC integrity detects tampered packaged source', () => fixture(async dir => {
  await writeFile(path.join(dir, 'src/failures.mjs'), '// altered\n'); await assert.rejects(verifyCurrentRelease(dir), /Release (length|bytes) changed/);
}));
test('RC integrity detects an additional unrecorded packaged module', () => fixture(async dir => {
  await writeFile(path.join(dir, 'src/unrecorded.mjs'), 'export default true;'); await assert.rejects(verifyCurrentRelease(dir), /Release inventory changed/);
}));
test('RC integrity detects an omitted package file even if removed from the manifest', () => fixture(async dir => {
  await modifyManifest(dir, m => { m.files = m.files.filter(f => f.path !== 'README.md'); }); await assert.rejects(verifyCurrentRelease(dir), /Release inventory changed/);
}));
test('RC integrity rejects duplicate and escaping manifest paths', () => fixture(async dir => {
  const original = await readFile(path.join(dir, CURRENT_MANIFEST));
  await modifyManifest(dir, m => { m.files.push(m.files[0]); }); await assert.rejects(verifyCurrentRelease(dir), /Duplicate manifest entry/);
  await writeFile(path.join(dir, CURRENT_MANIFEST), original);
  await modifyManifest(dir, m => { m.files[0].path = '../escape'; }); await assert.rejects(verifyCurrentRelease(dir), /Unsafe manifest entry/);
}));
test('RC runtime parity cannot be bypassed by rehashing changed code in the manifest', () => fixture(async dir => {
  const name = 'src/failures.mjs'; await writeFile(path.join(dir, name), (await readFile(path.join(dir, name))) + '\n// behavior drift\n'); await rehash(dir, name); await assert.rejects(verifyCurrentRelease(dir), /Runtime differs from tested candidate/);
}));
test('RC metadata stays a prerelease with aligned public identifiers', () => fixture(async dir => {
  const name = 'package.json', pkg = JSON.parse(await readFile(path.join(dir, name), 'utf8')); pkg.version = '0.5.2'; await writeFile(path.join(dir, name), JSON.stringify(pkg)); await rehash(dir, name); await assert.rejects(verifyCurrentRelease(dir), /0\.5\.2-rc\.1/);
}));
test('RC integrity rejects fabricated native observations even after manifest rehash', () => fixture(async dir => {
  const name = 'evals/releases/0.5.2-rc.1/native-observations.json', data = JSON.parse(await readFile(path.join(dir, name), 'utf8')); data.themeCoverage = 'PASS'; await writeFile(path.join(dir, name), JSON.stringify(data)); await rehash(dir, name); await assert.rejects(verifyCurrentRelease(dir), /Native observation projection changed/);
}));
test('RC integrity rejects a fabricated release-wide quality score', () => fixture(async dir => {
  await modifyManifest(dir, m => { m.qualityAcceptance = 'PASS'; }); await assert.rejects(verifyCurrentRelease(dir), /Unexpected quality claim/);
}));
