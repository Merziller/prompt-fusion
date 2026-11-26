// Synthetic release-gate fixtures; these are not model-quality measurements.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { verifyRelease } from '../scripts/verify-release.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');

async function fixture(run) {
  const root = await mkdtemp(path.join(tmpdir(), 'fusion-release-flow-'));
  const projectDir = path.join(root, 'project'), evidenceDir = path.join(root, 'evidence');
  const put = async (base, file, text) => { await mkdir(path.dirname(path.join(base, file)), { recursive: true }); await writeFile(path.join(base, file), text); };
  const putJson = (base, file, value) => put(base, file, JSON.stringify(value));
  const products = { A: 'feiwell', B: 'chosenxu', C: 'fishsb', D: 'fusion' };
  const cases = Array.from({ length: 24 }, (_, index) => ({ id: `synthetic-${index}`, set: index < 12 ? 'fixed' : 'transfer', input: `Synthetic protocol fixture ${index}`, sha256: sha(`Synthetic protocol fixture ${index}`) }));
  const mapping = cases.map(c => ({ caseId: c.id, set: c.set, products }));
  const generations = cases.flatMap(c => Object.values(products).map(product => ({ id: `${c.id}--${product}`, ok: true, result: { text: `${c.input}: ${product}` } })));
  const items = cases.flatMap(c => [0, 1].map(order => ({ id: `${c.id}--order-${order}`, system: 'Synthetic fixed protocol; not an actual evaluation.', input: JSON.stringify({ original: c.input, candidates: (order ? ['D','C','B','A'] : ['A','B','C','D']).map(id => ({ id, prompt: `${c.input}: ${products[id]}` })) }) })));
  const judgeRequest = { selection: { provider: 'synthetic', model: 'no-model-called' }, items };
  const results = items.map(item => ({ id: item.id, ok: true, result: { text: JSON.stringify({ scores: Object.keys(products).map(id => ({ id, fidelity: 30, clarity: 25, relevantCompletion: 20, economy: 15, boundary: 10, criticalIssues: [], reason: 'Synthetic gate control only.' })) }) } }));
  const data = { round: 'synthetic-gate', cases, mapping, generations, judgeRequest, batches: [{ id: 'base', request: judgeRequest, results }] };
  const protocol = 'Frozen synthetic release protocol.\n';
  const css = '`synthetic-css`', icon = "'synthetic-icon'";
  const core = "export const VERSION = '0.4.0-dev';\nexport const unchanged = true;\n";
  const rewrite = "export const prompt = 'synthetic frozen source';\n";
  const artifacts = {
    'evaluation.json': JSON.stringify(data),
    'runtime-manifest.json': JSON.stringify({ protocol: sha(protocol), css: sha(css) }),
    'runtime/core.mjs': core,
    'runtime/rewrite.mjs': rewrite
  };
  for (const [file, content] of Object.entries(artifacts)) await put(evidenceDir, file, content);
  await putJson(evidenceDir, 'integrity.json', { round: data.round, artifacts: Object.fromEntries(Object.entries(artifacts).map(([file, content]) => [file, { bytes: Buffer.byteLength(content), sha256: sha(content) }])) });
  await put(projectDir, 'src/core.mjs', core.replace('0.4.0-dev', '0.4.0'));
  await put(projectDir, 'src/rewrite.mjs', rewrite);
  await put(projectDir, 'docs/evaluation/OPTIMIZATION_PROTOCOL.md', protocol);
  await put(projectDir, 'adapters/dsh/client-source.js', `  const css = ${css};\n  const icon = ${icon};\n  const slot = {name:'conversation.input.right'};\n`);
  await putJson(projectDir, 'evals/ui-contract.json', { cssSha256: sha(css), iconSha256: sha(icon), slot: 'conversation.input.right', visibleControls: 1 });
  await putJson(projectDir, 'package.json', { version: '0.4.0' });
  await putJson(projectDir, '.claude-plugin/plugin.json', { version: '0.4.0' });
  try { await run({ projectDir, evidenceDir, put, putJson }); } finally { await rm(root, { recursive: true, force: true }); }
}

test('complete synthetic gate checks version, hashes, source parity and UI together', async () => fixture(async ({ projectDir, evidenceDir }) => {
  const report = await verifyRelease({ projectDir, evidenceDir });
  assert.equal(report.status, 'PASS');
  assert.equal(report.version, '0.4.0');
  assert.equal(report.round, 'synthetic-gate');
  assert.equal(report.runtime.length, 2);
  assert.equal(report.runtime.find(file => file.path === 'src/core.mjs').versionOnlyChange, true);
  assert.equal(report.ui.slot, 'conversation.input.right');
}));
for (const [name, file, content, expected] of [
  ['metadata mismatch', '.claude-plugin/plugin.json', '{"version":"0.3.1"}', /versions are not aligned/],
  ['protocol replacement', 'docs/evaluation/OPTIMIZATION_PROTOCOL.md', 'Different protocol.', /protocol changed/],
  ['style replacement', 'adapters/dsh/client-source.js', "  const css = 'different';\n  const icon = 'synthetic-icon';\n  const slot = {name:'conversation.input.right'};\n", /appearance changed/],
  ['untested code', 'src/rewrite.mjs', 'export const changed = true;\n', /Runtime changed/]
]) test('synthetic gate rejects ' + name, async () => fixture(async ({ projectDir, evidenceDir, put }) => {
  await put(projectDir, file, content);
  await assert.rejects(verifyRelease({ projectDir, evidenceDir }), expected);
}));
test('synthetic gate rejects altered frozen source even when current source matches the altered file', async () => fixture(async ({ projectDir, evidenceDir, put }) => {
  const changed = 'export const changed = true;\n';
  await put(projectDir, 'src/rewrite.mjs', changed);
  await put(evidenceDir, 'runtime/rewrite.mjs', changed);
  await assert.rejects(verifyRelease({ projectDir, evidenceDir }), /Integrity mismatch/);
}));
