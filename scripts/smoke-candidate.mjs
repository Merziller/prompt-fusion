// Copyright 2026 绍兴市柯桥区禾杨智绘软件开发工作室 (禾杨智绘) & Merziller (子墨)
// SPDX-License-Identifier: Apache-2.0
// Verify current candidate bytes independently of immutable historical release scores.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compareInstalledTree } from './smoke-package.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
export function parseCandidateOptions(args) {
  const values = {};
  const allowed = new Set(['--archive', '--npm-cli', '--sdk-root', '--deps-root']);
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i], value = args[i + 1];
    assert(allowed.has(flag) && value && !value.startsWith('--'), 'Expected named candidate verification paths.');
    assert(!Object.hasOwn(values, flag), 'Duplicate flag: ' + flag);
    values[flag] = path.resolve(value);
  }
  for (const flag of allowed) assert(values[flag], 'Required flag: ' + flag);
  return values;
}
async function run(script, args, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd, windowsHide: true, stdio: 'inherit',
      env: { ...process.env, npm_config_update_notifier: 'false', npm_config_audit: 'false', npm_config_fund: 'false' },
    });
    const deadline = setTimeout(() => child.kill(), 120000);
    child.once('error', error => { clearTimeout(deadline); reject(error); });
    child.once('close', (code, signal) => {
      clearTimeout(deadline);
      if (code === 0) resolve();
      else reject(new Error(`Candidate check ${path.basename(script)} failed: exit=${code}, signal=${signal ?? 'none'}`));
    });
  });
}
export async function smokeCandidate(options, sourceRoot = root) {
  for (const flag of ['--archive', '--npm-cli']) assert((await lstat(options[flag])).isFile(), flag + ' must be a regular file.');
  const sourcePkg = JSON.parse(await readFile(path.join(sourceRoot, 'package.json'), 'utf8'));
  assert.equal(sourcePkg.name, '@merziller/prompt-fusion');
  assert.match(sourcePkg.version, /^\d+\.\d+\.\d+-dev\.\d+$/, 'This command verifies unpublished development candidates only.');
  assert.equal(Object.keys(sourcePkg.dependencies ?? {}).length, 0, 'Offline smoke requires zero runtime dependencies.');
  for (const key of ['preinstall', 'install', 'postinstall', 'prepare']) assert(!sourcePkg.scripts?.[key], 'Install hooks are excluded.');
  const before = await readFile(options['--archive']);
  const installation = await mkdtemp(path.join(tmpdir(), 'prompt-fusion-candidate-'));
  await writeFile(path.join(installation, 'package.json'), JSON.stringify({ private: true }), { flag: 'wx' });
  await run(options['--npm-cli'], ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', options['--archive']], installation);
  const installed = path.join(installation, 'node_modules', '@merziller', 'prompt-fusion');
  const installedPkg = JSON.parse(await readFile(path.join(installed, 'package.json'), 'utf8'));
  assert.equal(installedPkg.version, sourcePkg.version);
  // Enumerate and compare before any test creates output in the retained installation.
  const files = await compareInstalledTree(sourceRoot, installed);
  await run(path.join(installed, 'scripts', 'build-client.mjs'), ['--check'], installed);
  await run(path.join(installed, 'scripts', 'test-report.mjs'), [], installed);
  await run(path.join(installed, 'scripts', 'check.mjs'), [], installed);
  await run(path.join(installed, 'scripts', 'sdk-smoke.mjs'), ['--sdk-root', options['--sdk-root']], installed);
  await run(path.join(installed, 'scripts', 'undo-react-lexical-smoke.mjs'), ['--deps-root', options['--deps-root']], installed);
  const tests = JSON.parse(await readFile(path.join(installed, 'output', 'test-results.json'), 'utf8'));
  const sdk = JSON.parse(await readFile(path.join(installed, 'output', 'universal-sdk-verification.json'), 'utf8'));
  const undo = JSON.parse(await readFile(path.join(installed, 'output', 'undo-react-lexical-verification.json'), 'utf8'));
  assert.equal(tests.status, 'PASS'); assert(tests.tests > 0);
  for (const key of ['fail', 'cancelled', 'skipped']) assert.equal(tests[key], 0);
  assert.equal(sdk.status, 'PASS'); assert.equal(sdk.tests.length, 6);
  assert.equal(undo.status, 'PASS'); assert.equal(undo.hostGuiTested, false);
  assert.equal(sha(await readFile(options['--archive'])), sha(before), 'Archive changed during verification.');
  const report = {
    at: new Date().toISOString(), status: 'PASS', version: sourcePkg.version,
    node: process.version, platform: process.platform,
    archive: { name: path.basename(options['--archive']), bytes: before.length, sha256: sha(before) },
    installation, files, tests, sdk, undo,
    realModelQuality: 'NOT_RUN', nativeHostGui: 'NOT_RUN: current DSH process requires restart (package-moved)',
    historicalReleaseEvidence: 'Verified separately against the exact released 0.5.1 fixture; no quality score inherited.',
    scope: 'Current unpublished archive; fresh offline install; exact shipped bytes; core, protocol and React/Lexical contract tests. Not proof of native vendor applications.',
    retainedInstallation: true,
  };
  await mkdir(path.join(sourceRoot, 'output'), { recursive: true });
  const receipt = path.join(sourceRoot, 'output', `candidate-smoke-${sourcePkg.version}-${Date.now()}.json`);
  await writeFile(receipt, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  return { report, receipt };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { report, receipt } = await smokeCandidate(parseCandidateOptions(process.argv.slice(2)));
  console.log(JSON.stringify({ status: report.status, version: report.version, archive: report.archive, comparedFiles: report.files.length, tests: report.tests, sdk: report.sdk.status, undo: report.undo.status, nativeHostGui: report.nativeHostGui, installation: report.installation, receipt }, null, 2));
}
