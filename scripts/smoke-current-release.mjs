// Copyright 2026 绍兴市柯桥区禾杨智绘软件开发工作室 (禾杨智绘) & Merziller (子墨)
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compareInstalledTree } from './smoke-package.mjs';
import { parseCandidateOptions } from './smoke-candidate.mjs';
import { CURRENT_RELEASE, CURRENT_RELEASE_KIND, verifyCurrentRelease } from './verify-current-release.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
const root = fileURLToPath(new URL('../', import.meta.url));
async function run(script, args, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { cwd, windowsHide: true, stdio: 'inherit', env: { ...process.env, npm_config_update_notifier: 'false', npm_config_audit: 'false', npm_config_fund: 'false' } });
    const deadline = setTimeout(() => child.kill(), 180000);
    child.once('error', error => { clearTimeout(deadline); reject(error); });
    child.once('close', (code, signal) => { clearTimeout(deadline); code === 0 ? resolve() : reject(new Error(`Release check ${path.basename(script)} failed: exit=${code}, signal=${signal ?? 'none'}`)); });
  });
}
export async function smokeCurrentRelease(options, sourceRoot = root) {
  const sourceIntegrity = await verifyCurrentRelease(sourceRoot);
  for (const flag of ['--archive', '--npm-cli']) assert((await lstat(options[flag])).isFile(), flag + ' must be a regular file.');
  const bytes = await readFile(options['--archive']);
  const installation = await mkdtemp(path.join(tmpdir(), 'prompt-fusion-release-'));
  await writeFile(path.join(installation, 'package.json'), '{"private":true}\n', { flag: 'wx' });
  await run(options['--npm-cli'], ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', options['--archive']], installation);
  const installed = path.join(installation, 'node_modules', '@merziller', 'prompt-fusion');
  const files = await compareInstalledTree(sourceRoot, installed);
  const installedIntegrity = await verifyCurrentRelease(installed);
  assert.equal(files.length, installedIntegrity.files, 'Packed inventory differs');
  await run(path.join(installed, 'scripts/build-client.mjs'), ['--check'], installed);
  await run(path.join(installed, 'scripts/test-report.mjs'), [], installed);
  await run(path.join(installed, 'scripts/check.mjs'), [], installed);
  await run(path.join(installed, 'scripts/sdk-smoke.mjs'), ['--sdk-root', options['--sdk-root']], installed);
  await run(path.join(installed, 'scripts/undo-react-lexical-smoke.mjs'), ['--deps-root', options['--deps-root']], installed);
  const output = async name => JSON.parse(await readFile(path.join(installed, 'output', name), 'utf8'));
  const tests = await output('test-results.json'), sdk = await output('universal-sdk-verification.json'), undo = await output('undo-react-lexical-verification.json');
  assert.equal(tests.status, 'PASS'); assert(tests.tests > 0);
  for (const key of ['fail', 'cancelled', 'skipped']) assert.equal(tests[key], 0);
  assert.equal(sdk.status, 'PASS'); assert.equal(sdk.tests.length, 6);
  assert.equal(undo.status, 'PASS'); assert.equal(undo.hostGuiTested, false);
  assert.equal(sha(await readFile(options['--archive'])), sha(bytes));
  const report = {
    at: new Date().toISOString(), status: 'PASS', version: CURRENT_RELEASE, releaseKind: CURRENT_RELEASE_KIND, node: process.version, platform: process.platform,
    archive: { name: path.basename(options['--archive']), bytes: bytes.length, sha256: sha(bytes) },
    sourceIntegrity, installedIntegrity, installation, files, tests, sdk, undo,
    nativeEvidence: 'Seven actual checks of 0.5.2-dev.0; runtime parity with candidate and published 0.5.2-rc.1 except VERSION; stable build not reexecuted in the desktop.',
    realModelQuality: 'NOT_RUN_FOR_STABLE', nativeHostGui: 'NOT_RUN_FOR_STABLE',
    limitations: ['Narrow-window test interrupted by a desktop renderer crash with unknown cause.', 'Light/dark theme coverage not completed.', 'Protocol and React/Lexical fixtures are not native-vendor compatibility claims.']
  };
  await mkdir(path.join(sourceRoot, 'output'), { recursive: true });
  const receipt = path.join(sourceRoot, 'output', `release-smoke-${CURRENT_RELEASE}-${Date.now()}.json`);
  await writeFile(receipt, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  return { report, receipt };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { report, receipt } = await smokeCurrentRelease(parseCandidateOptions(process.argv.slice(2)));
  console.log(JSON.stringify({ version: report.version, status: report.status, archive: report.archive, files: report.files.length, tests: report.tests, sdk: report.sdk.status, undo: report.undo.status, receipt }, null, 2));
}
