// Copyright 2026 绍兴市柯桥区禾杨智绘软件开发工作室 (禾杨智绘) & Merziller (子墨)
// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdtemp, writeFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { parseCandidateOptions, smokeCandidate } from '../scripts/smoke-candidate.mjs';

const args = ['--archive', 'candidate.tgz', '--npm-cli', 'npm-cli.js', '--sdk-root', 'sdk', '--deps-root', 'deps'];
test('candidate smoke requires explicit paths and resolves relative inputs', () => {
  const result = parseCandidateOptions(args);
  for (let i = 0; i < args.length; i += 2) assert.equal(result[args[i]], path.resolve(args[i + 1]));
});
test('candidate smoke rejects missing, unknown and duplicate path flags', () => {
  assert.throws(() => parseCandidateOptions([]), /Required flag/);
  assert.throws(() => parseCandidateOptions(['--archive']), /Expected named/);
  assert.throws(() => parseCandidateOptions([...args, '--network', 'yes']), /Expected named/);
  assert.throws(() => parseCandidateOptions([...args, '--archive', 'different.tgz']), /Duplicate flag/);
  assert.throws(() => parseCandidateOptions(['--archive', '--npm-cli']), /Expected named/);
});

for (const [label, patch, message] of [
  ['stable release', { version: '0.5.1' }, /unpublished development/],
  ['runtime dependencies', { dependencies: { unexpected: '*' } }, /zero runtime dependencies/],
  ['install hooks', { scripts: { postinstall: 'echo forbidden' } }, /Install hooks are excluded/],
  ['other package', { name: 'some-other-package' }, /@merziller\/prompt-fusion/],
]) test(`candidate preflight rejects ${label} before spawning an installer`, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'pf-candidate-preflight-'));
  try {
    const metadata = { name: '@merziller/prompt-fusion', version: '0.5.2-dev.0', ...patch };
    const stub = path.join(directory, 'never-executed.js');
    await writeFile(stub, 'throw new Error("installer must not execute");');
    await writeFile(path.join(directory, 'package.json'), JSON.stringify(metadata));
    const options = { '--archive': stub, '--npm-cli': stub, '--sdk-root': directory, '--deps-root': directory };
    await assert.rejects(smokeCandidate(options, directory), message);
    assert.deepEqual((await readdir(directory)).sort(), ['never-executed.js', 'package.json']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
