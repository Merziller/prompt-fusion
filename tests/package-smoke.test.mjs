// Package verification tests use local synthetic files, not a published release.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseOptions, compareInstalledTree, smokePackage } from '../scripts/smoke-package.mjs';
const required = ['package.json', 'LICENSE', 'NOTICE', 'src/core.mjs', 'src/rewrite.mjs', 'bin/prompt-fusion.mjs', 'adapters/dsh/index.mjs', 'adapters/dsh/client.js', '.claude-plugin/plugin.json', '.mcp.json', 'skills/prompt-fusion/SKILL.md'];
async function fixture(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pf-archive-check-'));
  const source = path.join(root, 'source'), installed = path.join(root, 'installed');
  for (const base of [source, installed]) for (const file of required) {
    const target = path.join(base, file); await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file === 'package.json' ? '{"name":"synthetic"}\n' : 'synthetic ' + file + '\n');
  }
  try { await run({ root, source, installed }); } finally { await rm(root, { recursive: true, force: true }); }
}
test('package options require an archive, exact round and explicit npm CLI', () => {
  const options = parseOptions(['--archive', 'a.tgz', '--round', 'semantic-round-10', '--npm-cli', 'npm-cli.js', '--sdk-root', 'sdk']);
  assert.ok(path.isAbsolute(options.archive)); assert.ok(path.isAbsolute(options.npmCli));
  assert.equal(options.round, 'semantic-round-10'); assert.ok(path.isAbsolute(options.sdkRoot));
  for (const args of [[], ['--archive', 'a'], ['--archive', 'a', '--npm-cli', 'npm', '--round', '../x'], ['--archive', 'a', '--npm-cli', 'npm', '--round', 'semantic-round-10', '--round', 'semantic-round-11'], ['--archive', 'a', '--round', 'semantic-round-10', '--npm-cli', 'npm', '--unknown', 'x']]) assert.throws(() => parseOptions(args));
});
test('installed archive compares every packaged byte including hidden manifests', async () => fixture(async ({ source, installed }) => {
  const files = await compareInstalledTree(source, installed);
  assert.equal(files.length, required.length);
  assert.ok(files.some(file => file.path === '.mcp.json'));
  assert.ok(files.every(file => /^[0-9a-f]{64}$/.test(file.sha256) && file.bytes > 0));
}));
test('installed archive rejects a changed source byte', async () => fixture(async ({ source, installed }) => {
  await writeFile(path.join(installed, 'src/rewrite.mjs'), 'different');
  await assert.rejects(compareInstalledTree(source, installed), /Installed bytes differ/);
}));
test('installed archive rejects missing required runtime files', async () => fixture(async ({ source, installed }) => {
  await rm(path.join(installed, 'src/rewrite.mjs'));
  await assert.rejects(compareInstalledTree(source, installed), /Required archive file missing/);
}));
test('installed archive rejects an added untracked file', async () => fixture(async ({ source, installed }) => {
  await writeFile(path.join(installed, 'unexpected.mjs'), 'unexpected');
  await assert.rejects(compareInstalledTree(source, installed), /ENOENT/);
}));
test('installed archive rejects a directory junction before following it', async () => fixture(async ({ source, installed }) => {
  await symlink(source, path.join(installed, 'linked-source'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(compareInstalledTree(source, installed), /Archive contains a symlink/);
}));
test('package smoke fails before executing npm when no accepted evidence exists', async () => fixture(async ({ source }) => {
  await assert.rejects(smokePackage({ archive: 'not-read.tgz', round: 'semantic-round-10', npmCli: 'never-executed.mjs' }, source), /ENOENT/);
}));
