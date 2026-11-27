// Copyright 2026 绍兴市柯桥区禾杨智绘软件开发工作室 (禾杨智绘) & Merziller (子墨)
// SPDX-License-Identifier: Apache-2.0
// Current release integrity. Historical verifiers and their fixtures are unchanged.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
export const CURRENT_RELEASE = '0.5.2';
export const CURRENT_RELEASE_KIND = 'stable';
export const CURRENT_MANIFEST = `evals/releases/${CURRENT_RELEASE}/manifest.json`;
const rcVersion = '0.5.2-rc.1';
const rcCommit = '5e42cd78a2265e3de33031384bf7d95994ce47b2';
const rcManifestPath = `evals/releases/${rcVersion}/manifest.json`;
const rcManifestSha256 = '508a84ec5d9c8b3f482328dd9b482a4a5e31e88a8b5e013f07140856ff4d5e71';
const baselinePath = `evals/releases/${rcVersion}/runtime-baseline.json`;
const observationsPath = `evals/releases/${rcVersion}/native-observations.json`;
const hash = data => createHash('sha256').update(data).digest('hex');
const safePath = value => typeof value === 'string' && value.length > 0 && !path.isAbsolute(value) && !/[:\\]/u.test(value) && value.split('/').every(p => p && p !== '.' && p !== '..');
export async function packageFileInventory(root) {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  assert(Array.isArray(pkg.files) && pkg.files.length > 0, 'Missing explicit package files');
  const files = new Set();
  async function visit(name) {
    assert(safePath(name), 'Unsafe inventory path');
    const full = path.join(root, name), stat = await lstat(full);
    assert(!stat.isSymbolicLink(), 'Package inventory contains a symlink');
    if (stat.isDirectory()) {
      for (const item of await readdir(full)) await visit(`${name}/${item}`);
    } else {
      assert(stat.isFile(), 'Package inventory contains a non-file');
      files.add(name);
    }
  }
  for (const name of ['package.json', ...pkg.files]) await visit(name);
  assert(files.size <= 1000, 'Package inventory exceeds file budget');
  return [...files].sort();
}
export async function verifyCurrentRelease(root, manifestFile = CURRENT_MANIFEST) {
  root = path.resolve(root);
  assert(safePath(manifestFile), 'Unsafe manifest path');
  const read = name => readFile(path.join(root, name));
  const manifest = JSON.parse(await read(manifestFile));
  assert.equal(manifest.schema, 'prompt-fusion-release-integrity-v2');
  assert.equal(manifest.version, CURRENT_RELEASE, 'Unexpected release version');
  assert.equal(manifest.releaseKind, CURRENT_RELEASE_KIND, 'Stable release kind changed');
  assert.deepEqual(manifest.promotion, { sourceVersion: rcVersion, sourceCommit: rcCommit, sourceManifest: rcManifestPath, sourceManifestSha256: rcManifestSha256, runtimeChange: 'CORE_VERSION_ONLY' }, 'Stable promotion provenance changed');
  const rcBytes = await read(rcManifestPath);
  assert.equal(hash(rcBytes), rcManifestSha256, 'Historical RC manifest changed');
  const rcManifest = JSON.parse(rcBytes);
  assert.equal(rcManifest.version, rcVersion); assert.equal(rcManifest.releaseKind, 'prerelease');
  assert.equal(manifest.qualityAcceptance, 'NOT_CLAIMED', 'Unexpected quality claim');
  assert.deepEqual(manifest.excludedFiles, [CURRENT_MANIFEST], 'Only the self-referential manifest is excluded');
  assert(Array.isArray(manifest.files) && manifest.files.length > 0 && manifest.files.length <= 1000, 'Invalid release inventory');
  let total = 0;
  const expected = new Set();
  for (const item of manifest.files) {
    assert(safePath(item.path) && item.path !== manifestFile, 'Unsafe manifest entry');
    assert(!expected.has(item.path), 'Duplicate manifest entry'); expected.add(item.path);
    assert(Number.isSafeInteger(item.bytes) && item.bytes >= 0 && item.bytes <= 16 * 1024 * 1024 && /^[a-f0-9]{64}$/.test(item.sha256), 'Invalid file identity');
    total += item.bytes; assert(total <= 128 * 1024 * 1024, 'Release exceeds byte budget');
    let full = root;
    for (const part of item.path.split('/')) { full = path.join(full, part); assert(!(await lstat(full)).isSymbolicLink(), 'Manifest path is a symlink'); }
    const data = await read(item.path);
    assert.equal(data.length, item.bytes, `Release length changed: ${item.path}`);
    assert.equal(hash(data), item.sha256, `Release bytes changed: ${item.path}`);
  }
  const actual = await packageFileInventory(root);
  assert.deepEqual([...expected].sort(), actual.filter(p => p !== manifestFile), 'Release inventory changed');
  const pkg = JSON.parse(await read('package.json')), plugin = JSON.parse(await read('.claude-plugin/plugin.json'));
  const core = (await read('src/core.mjs')).toString('utf8');
  assert.equal(pkg.version, CURRENT_RELEASE); assert.equal(plugin.version, CURRENT_RELEASE);
  assert.equal(core.match(/^export const VERSION = '([^']+)';$/m)?.[1], CURRENT_RELEASE);
  assert.equal(pkg.name, '@merziller/prompt-fusion'); assert.equal(plugin.name, 'prompt-fusion');
  assert.equal(pkg.bin?.['prompt-fusion'], './bin/prompt-fusion.mjs'); assert.equal(pkg.dsh?.bundle?.patch, './cordis.patch.yml');
  assert.equal(pkg.license, 'Apache-2.0'); assert.equal(Object.keys(pkg.dependencies ?? {}).length, 0);
  for (const hook of ['preinstall', 'install', 'postinstall', 'prepare']) assert(!pkg.scripts?.[hook], 'Unexpected install hook');
  const copyright = 'Copyright 2026 绍兴市柯桥区禾杨智绘软件开发工作室 (禾杨智绘) & Merziller (子墨)';
  assert.equal(pkg.copyright, copyright);
  assert.equal((await read('LICENSE')).toString(), (await read('third-party/licenses/Fishsb-Apache-2.0.txt')).toString() + '\n' + copyright + '\n');
  assert.equal(hash(await read('THIRD_PARTY_NOTICES.md')), manifest.thirdPartyNoticesSha256);
  const ui = JSON.parse(await read('evals/ui-contract.json')), client = (await read('adapters/dsh/client-source.js')).toString();
  assert.equal(hash(client.match(/const css = ([\s\S]+?);\n/u)?.[1] ?? ''), ui.cssSha256);
  assert.equal(hash(client.match(/const icon = ([\s\S]+?);\n/u)?.[1] ?? ''), ui.iconSha256);
  assert(client.includes(`'${ui.slot}'`), 'Approved slot changed');
  assert.equal(manifest.runtimeBaseline, baselinePath); assert.equal(manifest.nativeObservations, observationsPath);
  const baselineBytes = await read(baselinePath), nativeBytes = await read(observationsPath);
  assert.equal(hash(baselineBytes), 'faf6cf30468b5e14d7880a2f788b7193167033da1a336f3c9b9eb68907587313', 'Candidate baseline changed');
  assert.equal(hash(nativeBytes), '15a10baf05d8f6132a20218d025209944cf91d213d23fcf438c5181d0aafdbf5', 'Native observation projection changed');
  const baseline = JSON.parse(baselineBytes);
  assert.equal(baseline.schema, 'prompt-fusion-runtime-baseline-v1'); assert.equal(baseline.version, '0.5.2-dev.0');
  const runtime = actual.filter(p => /^(?:src|adapters|bin)\//u.test(p));
  assert.deepEqual(baseline.files.map(p => p.path).sort(), runtime, 'Runtime module inventory changed');
  assert.deepEqual(rcManifest.files.filter(p => /^(?:src|adapters|bin)\//u.test(p.path)).map(p => p.path).sort(), runtime, 'RC runtime module inventory changed');
  for (const item of rcManifest.files.filter(p => runtime.includes(p.path))) {
    let data = await read(item.path);
    if (item.path === 'src/core.mjs') data = Buffer.from(data.toString().replace(/^export const VERSION = '[^']+';$/m, `export const VERSION = '${rcVersion}';`));
    assert.equal(hash(data), item.sha256, `Runtime differs from published RC: ${item.path}`);
  }
  for (const item of baseline.files) {
    assert(safePath(item.path), 'Unsafe baseline path');
    let data = await read(item.path);
    if (item.path === 'src/core.mjs') data = Buffer.from(data.toString().replace(/^export const VERSION = '[^']+';$/m, `export const VERSION = '${baseline.version}';`));
    assert.equal(hash(data), item.sha256, `Runtime differs from tested candidate: ${item.path}`);
  }
  const native = JSON.parse(await read(observationsPath));
  assert.equal(native.observedVersion, baseline.version);
  assert.equal(native.scope, 'candidate-native-observations-not-rc-reexecution');
  assert.equal(native.checks.length, 7); assert(native.checks.every(c => c.status === 'PASS'));
  assert.equal(native.narrowWindow, 'INCOMPLETE'); assert.equal(native.themeCoverage, 'NOT_RUN');
  return { status: 'PASS', version: CURRENT_RELEASE, releaseKind: CURRENT_RELEASE_KIND, files: actual.length, runtimeModules: runtime.length, runtimeParity: 'EXACT_EXCEPT_CORE_VERSION', promotedFrom: rcVersion, publishedRcRuntimeParity: 'EXACT_EXCEPT_CORE_VERSION', nativeObservations: 'SEVEN_CANDIDATE_CHECKS; STABLE_NOT_REEXECUTED', qualityAcceptance: 'NOT_CLAIMED' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await verifyCurrentRelease(fileURLToPath(new URL('../', import.meta.url))), null, 2));
}
