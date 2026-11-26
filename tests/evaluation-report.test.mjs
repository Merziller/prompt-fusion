// Cross-round reporting tests. Recorded failures stay failures; synthetic mutations are local fixtures.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEvaluationReport, renderEvaluationMarkdown } from '../scripts/evaluation-report.mjs';
const source = fileURLToPath(new URL('../evals/semantic-rounds/', import.meta.url));
const sha = value => createHash('sha256').update(value).digest('hex');

test('cross-round report preserves original failures, counts and disclosure', async () => {
  const report = await buildEvaluationReport(source);
  assert.ok(report.rounds.length >= 7);
  const first = report.rounds.find(row => row.round === 'semantic-round-01');
  const seventh = report.rounds.find(row => row.round === 'semantic-round-07');
  assert.equal(first.passed, false);
  assert.equal(first.fusion.all.mean, 96.27);
  assert.equal(seventh.passed, false);
  assert.equal(seventh.generationFailures.filter(id => id.endsWith('--fusion')).length, 3);
  const markdown = renderEvaluationMarkdown(report);
  assert.ok(markdown.includes('8192 tokens'));
  assert.ok(markdown.includes('semantic-round-07'));
  assert.ok(markdown.includes('不是独立人工评审'));
});

for (const change of ['control', 'judge', 'case']) {
  test('cross-round report rejects a different ' + change + ' contract even with rehashed fixture', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'fusion-report-test-'));
    try {
      await cp(path.join(source, 'semantic-round-01'), path.join(root, 'semantic-round-01'), { recursive: true });
      await cp(path.join(source, 'semantic-round-02'), path.join(root, 'semantic-round-02'), { recursive: true });
      const directory = path.join(root, 'semantic-round-02');
      const file = change === 'control' ? 'generation-request.json' : 'evaluation.json';
      const value = JSON.parse(await readFile(path.join(directory, file), 'utf8'));
      if (change === 'control') value.temperature = 0.9;
      if (change === 'judge') value.judgeRequest.selection.model = 'different-model';
      if (change === 'case') {
        // A changed source hash is caught by the per-round validator before aggregation.
        value.cases[0].sha256 = '0'.repeat(64);
      }
      const content = JSON.stringify(value);
      await writeFile(path.join(directory, file), content);
      const manifestFile = path.join(directory, 'integrity.json');
      const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
      manifest.artifacts[file] = { bytes: Buffer.byteLength(content), sha256: sha(content) };
      await writeFile(manifestFile, JSON.stringify(manifest));
      await assert.rejects(buildEvaluationReport(root), /Cross-round|digest mismatch/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
}
