import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyRuntimeParity, verifyRelease } from '../scripts/verify-release.mjs';
async function fixture(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'fusion-release-'));
  const project = path.join(root, 'project'), evidence = path.join(root, 'evidence');
  await mkdir(path.join(project, 'src'), { recursive: true });
  await mkdir(path.join(evidence, 'runtime'), { recursive: true });
  const core = "export const VERSION = '0.4.0-dev';\nexport const behavior = 'unchanged';\n";
  for (const directory of [path.join(project, 'src'), path.join(evidence, 'runtime')]) {
    await writeFile(path.join(directory, 'core.mjs'), core);
    await writeFile(path.join(directory, 'rewrite.mjs'), "export const prompt = 'frozen instruction';\n");
  }
  try { await run(project, evidence); } finally { await rm(root, { recursive: true, force: true }); }
}
test('release parity accepts only a core VERSION literal difference', async () => fixture(async (project, evidence) => {
  await writeFile(path.join(project, 'src/core.mjs'), "export const VERSION = '0.4.0';\nexport const behavior = 'unchanged';\n");
  const result = await verifyRuntimeParity(project, evidence);
  assert.equal(result.length, 2); assert.equal(result[0].versionOnlyChange, true); assert.equal(result[1].versionOnlyChange, false);
}));
test('release parity rejects prompt changes after evaluation', async () => fixture(async (project, evidence) => {
  await writeFile(path.join(project, 'src/rewrite.mjs'), "export const prompt = 'different instruction';\n");
  await assert.rejects(verifyRuntimeParity(project, evidence), /Runtime changed after evaluation/);
}));
test('release parity rejects behavior changes disguised as version update', async () => fixture(async (project, evidence) => {
  await writeFile(path.join(project, 'src/core.mjs'), "export const VERSION = '0.4.0';\nexport const behavior = 'changed';\n");
  await assert.rejects(verifyRuntimeParity(project, evidence), /Runtime changed after evaluation/);
}));
test('release parity rejects an added untested runtime file', async () => fixture(async (project, evidence) => {
  await writeFile(path.join(project, 'src/extra.mjs'), 'export const extra = true;\n');
  await assert.rejects(verifyRuntimeParity(project, evidence), /inventory changed/);
}));
test('release gate blocks a complete but failed historical quality round', async () => {
  const projectDir = fileURLToPath(new URL('../', import.meta.url));
  const evidenceDir = path.join(projectDir, 'evals/semantic-rounds/semantic-round-04');
  await assert.rejects(verifyRelease({ projectDir, evidenceDir }), /Quality gate not satisfied: complete=true, passed=false/);
});
