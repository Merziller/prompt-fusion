// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
// Offline installation smoke test for the actual archive, not a workspace symlink.
import { mkdtemp, mkdir, readFile, readdir, lstat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { verifyRelease } from './verify-release.mjs';
const sha = data => createHash('sha256').update(data).digest('hex');
const ensure = (value, message) => { if (!value) throw new Error(message); };

export function parseOptions(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const name = args[i], value = args[i + 1];
    ensure(['--archive', '--round', '--npm-cli', '--sdk-root'].includes(name) && value && !value.startsWith('--'), 'Expected --archive FILE --round semantic-round-NN --npm-cli FILE [--sdk-root DIR]');
    ensure(!Object.hasOwn(options, name), 'Duplicate option: ' + name);
    options[name] = value;
  }
  ensure(options['--archive'] && options['--npm-cli'], 'An archive and explicit npm CLI path are required.');
  ensure(/^semantic-round-\d{2}$/.test(options['--round'] ?? ''), 'Provide the accepted semantic-round-NN.');
  return { archive: path.resolve(options['--archive']), round: options['--round'], npmCli: path.resolve(options['--npm-cli']), ...(options['--sdk-root'] ? { sdkRoot: path.resolve(options['--sdk-root']) } : {}) };
}

export async function compareInstalledTree(projectRoot, installedRoot) {
  const records = [];
  async function walk(relative = '') {
    for (const entry of await readdir(path.join(installedRoot, relative), { withFileTypes: true })) {
      const name = path.join(relative, entry.name);
      ensure(!entry.isSymbolicLink(), 'Archive contains a symlink: ' + name);
      if (entry.isDirectory()) { await walk(name); continue; }
      ensure(entry.isFile(), 'Archive contains a non-regular file: ' + name);
      const source = path.join(projectRoot, name);
      const originalInfo = await lstat(source);
      ensure(originalInfo.isFile() && !originalInfo.isSymbolicLink(), 'Source is not a regular file: ' + name);
      const bytes = await readFile(path.join(installedRoot, name));
      ensure(sha(bytes) === sha(await readFile(source)), 'Installed bytes differ from source: ' + name);
      records.push({ path: name.split(path.sep).join('/'), bytes: bytes.length, sha256: sha(bytes) });
    }
  }
  await walk();
  const names = new Set(records.map(record => record.path));
  for (const required of ['package.json', 'LICENSE', 'NOTICE', 'src/core.mjs', 'src/rewrite.mjs', 'bin/prompt-fusion.mjs', 'adapters/dsh/index.mjs', 'adapters/dsh/client.js', '.claude-plugin/plugin.json', '.mcp.json', 'skills/prompt-fusion/SKILL.md']) {
    ensure(names.has(required), 'Required archive file missing: ' + required);
  }
  return records.sort((a, b) => a.path.localeCompare(b.path));
}

async function run(script, args, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { cwd, windowsHide: true, stdio: 'inherit', env: { ...process.env, npm_config_update_notifier: 'false' } });
    child.once('error', reject);
    child.once('close', code => code === 0 ? resolve() : reject(new Error('Smoke child failed: ' + path.basename(script) + ' exit=' + code)));
  });
}

export async function smokePackage({ archive, round, npmCli, sdkRoot }, projectRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)))) {
  // Fail before any install unless the current runtime has complete accepted evidence.
  await verifyRelease({ projectDir: projectRoot, evidenceDir: path.join(projectRoot, 'evals/semantic-rounds', round) });
  ensure((await lstat(archive)).isFile() && (await lstat(npmCli)).isFile(), 'Archive and npm CLI must be regular files.');
  const archiveBytes = await readFile(archive);
  const directory = await mkdtemp(path.join(tmpdir(), 'prompt-fusion-package-'));
  await writeFile(path.join(directory, 'package.json'), JSON.stringify({ private: true }), { flag: 'wx' });
  // The package has no runtime dependencies. No network, lifecycle hooks or profile mutations.
  await run(npmCli, ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', archive], directory);
  const installed = path.join(directory, 'node_modules/@merziller/prompt-fusion');
  const files = await compareInstalledTree(projectRoot, installed);
  await run(path.join(installed, 'scripts/test-report.mjs'), [], installed);
  await run(path.join(installed, 'scripts/check.mjs'), [], installed);
  const release = await verifyRelease({ projectDir: installed, evidenceDir: path.join(installed, 'evals/semantic-rounds', round) });
  if (sdkRoot) await run(path.join(installed, 'scripts/sdk-smoke.mjs'), ['--sdk-root', sdkRoot], installed);
  ensure(sha(await readFile(archive)) === sha(archiveBytes), 'Archive changed during installation.');
  const tests = JSON.parse(await readFile(path.join(installed, 'output/test-results.json'), 'utf8'));
  ensure(tests.status === 'PASS' && tests.tests > 0 && tests.fail === 0 && tests.cancelled === 0 && tests.skipped === 0, 'Installed tests did not fully pass.');
  const sdk = sdkRoot ? JSON.parse(await readFile(path.join(installed, 'output/universal-sdk-verification.json'), 'utf8')) : { status: 'NOT_RUN', reason: 'No independent SDK supplied.' };
  const report = { at: new Date().toISOString(), status: 'PASS', node: process.version, platform: process.platform, version: release.version, archive: { name: path.basename(archive), bytes: archiveBytes.length, sha256: sha(archiveBytes) }, installation: directory, files, tests, release, sdk, scope: 'Fresh offline npm archive installation, exact source bytes, tests and release evidence; not native vendor application verification.' };
  await mkdir(path.join(projectRoot, 'output'), { recursive: true });
  const receipt = path.join(projectRoot, 'output', `package-smoke-${release.version}-${Date.now()}.json`);
  await writeFile(receipt, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  return { report, receipt };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { report, receipt } = await smokePackage(parseOptions(process.argv.slice(2)));
  console.log(JSON.stringify({ status: report.status, version: report.version, archive: report.archive, tests: report.tests, sdk: report.sdk.status, receipt, installation: report.installation }, null, 2));
}
