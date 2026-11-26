import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyIntegrity, loadEvaluation } from '../scripts/score-evaluation.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
async function fixture(run) {
  const root = await mkdtemp(path.join(tmpdir(), 'fusion-evidence-'));
  try {
    const content = JSON.stringify({ round: 'synthetic' });
    await writeFile(path.join(root, 'evaluation.json'), content);
    const manifest = { round: 'synthetic', artifacts: { 'evaluation.json': { bytes: Buffer.byteLength(content), sha256: sha(content) } } };
    await writeFile(path.join(root, 'integrity.json'), JSON.stringify(manifest));
    await run(root, manifest);
  } finally { await rm(root, { recursive: true, force: true }); }
}
test('integrity verifies exact recorded bytes and lengths', async () => fixture(async root => {
  const result = await verifyIntegrity(root);
  assert.equal(result.verified, true); assert.equal(result.artifacts, 1); assert.equal(result.round, 'synthetic');
}));
test('integrity rejects content tampering before scoring', async () => fixture(async root => {
  await writeFile(path.join(root, 'evaluation.json'), '{"round":"modified"}');
  await assert.rejects(loadEvaluation(root), /Integrity mismatch/);
}));
test('integrity rejects traversal, absolute, alternate-stream and empty path components', async () => {
  for (const name of ['../outside', '/outside', 'C:/outside', 'runtime\\file', 'runtime//file', './evaluation.json']) {
    await fixture(async (root, manifest) => {
      manifest.artifacts[name] = { bytes: 0, sha256: sha('') };
      await writeFile(path.join(root, 'integrity.json'), JSON.stringify(manifest));
      await assert.rejects(verifyIntegrity(root), /Invalid integrity path/);
    });
  }
});
test('integrity requires primary evidence and valid bounded metadata', async () => {
  for (const change of [m => { delete m.artifacts['evaluation.json']; }, m => { m.artifacts['evaluation.json'].bytes = -1; }, m => { m.artifacts['evaluation.json'].sha256 = 'unknown'; }]) {
    await fixture(async (root, manifest) => {
      change(manifest); await writeFile(path.join(root, 'integrity.json'), JSON.stringify(manifest));
      await assert.rejects(verifyIntegrity(root), /Invalid integrity/);
    });
  }
});
test('integrity rejects a directory claimed as a file', async () => fixture(async (root, manifest) => {
  await mkdir(path.join(root, 'runtime'));
  manifest.artifacts.runtime = { bytes: 0, sha256: sha('') };
  await writeFile(path.join(root, 'integrity.json'), JSON.stringify(manifest));
  await assert.rejects(verifyIntegrity(root), /not a regular file/);
}));
const published = fileURLToPath(new URL('../evals/semantic-rounds/', import.meta.url));
test('accepted round 10 preserves complete evidence and meets every frozen gate', async () => {
  const { result, integrity, data } = await loadEvaluation(path.join(published, 'semantic-round-10'));
  assert.equal(integrity.verified, true); assert.equal(result.complete, true); assert.equal(result.passed, true);
  assert.equal(data.generations.length, 96); assert.equal(result.perCase.length, 96);
  assert.deepEqual(result.generationFailures, []);
  const rows = result.aggregate.filter(row => row.product === 'fusion');
  assert.equal(rows.find(row => row.set === 'fixed').mean, 99.79);
  assert.equal(rows.find(row => row.set === 'transfer').mean, 99.13);
  assert.equal(rows.find(row => row.set === 'all').mean, 99.46);
  assert.ok(rows.every(row => row.minimum >= 95 && row.criticalCases.length === 0));
});
for (const round of ['semantic-round-01', 'semantic-round-02', 'semantic-round-03', 'semantic-round-04', 'semantic-round-05', 'semantic-round-06', 'semantic-round-07', 'semantic-round-08', 'semantic-round-09']) {
  test('retained ' + round + ' is intact, complete and remains below its original acceptance gate', async () => {
    const { result, integrity, data } = await loadEvaluation(path.join(published, round));
    assert.equal(integrity.verified, true); assert.equal(result.complete, true); assert.equal(result.passed, false);
    assert.equal(data.generations.length, 96); assert.equal(result.perCase.length, 96);
    const saved = JSON.parse(await readFile(path.join(published, round, 'scores.json'), 'utf8'));
    assert.deepEqual(result.aggregate, saved.aggregate);
    assert.equal(data.round, round);
  });
}
