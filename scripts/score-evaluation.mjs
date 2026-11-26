// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
// Offline verifier for published, anonymous evaluation records. Never calls a model.
import { createHash } from 'node:crypto';
import { readFile, writeFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DIMENSIONS = Object.freeze({ fidelity: 30, clarity: 25, relevantCompletion: 20, economy: 15, boundary: 10 });
const PRODUCTS = ['feiwell', 'chosenxu', 'fishsb', 'fusion'];
const digest = value => createHash('sha256').update(value).digest('hex');
function requireThat(value, message) { if (!value) throw new Error(message); }
export function decodeJudgment(row, mapping) {
  requireThat(row.ok === true && typeof row.result?.text === 'string', 'Judge transport failed');
  const text = row.result.text.trim().replace(/^```(?:json)?\s*\n/i, '').replace(/\n```$/, '');
  const data = JSON.parse(text);
  requireThat(Array.isArray(data.scores) && data.scores.length === 4 && new Set(data.scores.map(s => s.id)).size === 4, 'Missing or duplicate scores');
  const match = /^(.*)--order-([01])$/.exec(row.id);
  requireThat(match, 'Invalid judge item ID');
  const entry = mapping.find(m => m.caseId === match[1]);
  requireThat(entry, 'Unknown judge case');
  for (const score of data.scores) {
    requireThat(Object.hasOwn(entry.products, score.id), 'Unknown anonymous candidate');
    for (const [name, maximum] of Object.entries(DIMENSIONS)) requireThat(Number.isInteger(score[name]) && score[name] >= 0 && score[name] <= maximum, `Invalid ${name}`);
    requireThat(Array.isArray(score.criticalIssues) && score.criticalIssues.every(x => typeof x === 'string') && typeof score.reason === 'string', 'Invalid judge rationale');
  }
  return { data, caseId: match[1], order: Number(match[2]), entry };
}
export function scoreEvaluation({ cases, generations, judgeRequest, mapping, batches }) {
  requireThat(cases.length === 24 && cases.filter(c => c.set === 'fixed').length === 12 && cases.filter(c => c.set === 'transfer').length === 12, 'Expected frozen 12+12 case set');
  requireThat(new Set(cases.map(c => c.id)).size === 24, 'Duplicate cases');
  for (const c of cases) requireThat(digest(c.input) === c.sha256, `Case digest mismatch: ${c.id}`);
  requireThat(mapping.length === 24 && new Set(mapping.map(m => m.caseId)).size === 24, 'Invalid anonymous mapping');
  for (const m of mapping) requireThat(cases.some(c => c.id === m.caseId && c.set === m.set) && Object.keys(m.products).sort().join() === 'A,B,C,D' && Object.values(m.products).sort().join() === [...PRODUCTS].sort().join(), 'Invalid product mapping');
  requireThat(generations.length === 96 && new Set(generations.map(r => r.id)).size === 96, 'Incomplete or duplicate generation records');
  const generation = new Map(generations.map(r => [r.id, r]));
  for (const c of cases) for (const p of PRODUCTS) {
    const row = generation.get(`${c.id}--${p}`); requireThat(row && typeof row.ok === 'boolean', 'Missing generation');
    if (row.ok) requireThat(typeof (row.result?.enhanced ?? row.result?.text) === 'string' && (row.result.enhanced ?? row.result.text).trim(), 'Empty successful generation');
    if (row.sha256 && row.ok) requireThat(digest(JSON.stringify(row.result)) === row.sha256, 'Generation result digest mismatch');
  }
  requireThat(judgeRequest.items.length === 48 && new Set(judgeRequest.items.map(x => x.id)).size === 48, 'Expected both judge orders');
  for (const c of cases) for (const order of [0, 1]) {
    const item = judgeRequest.items.find(x => x.id === `${c.id}--order-${order}`);
    requireThat(item && typeof item.system === 'string', 'Missing scheduled order');
    const input = JSON.parse(item.input), map = mapping.find(m => m.caseId === c.id);
    const ids = order ? ['D', 'C', 'B', 'A'] : ['A', 'B', 'C', 'D'];
    requireThat(input.original === c.input && Array.isArray(input.candidates) && input.candidates.length === 4, 'Judge input differs from the frozen case');
    for (const [index, id] of ids.entries()) {
      const row = generation.get(`${c.id}--${map.products[id]}`), candidate = input.candidates[index];
      requireThat(candidate.id === id && candidate.prompt === (row.ok ? row.result.enhanced ?? row.result.text : '[GENERATION FAILED: no usable output]'), 'Judge candidate differs from the generated output');
    }
  }
  requireThat(judgeRequest.items.every(item => item.system === judgeRequest.items[0].system), 'Judge rubric changed within the run');
  const originals = new Map(judgeRequest.items.map(item => [item.id, item]));
  const resolved = new Map(), attempts = [];
  for (const batch of batches) {
    const scheduled = new Set(batch.request.items.map(x => x.id));
    for (const item of batch.request.items) requireThat(JSON.stringify(originals.get(item.id)) === JSON.stringify(item), 'Retry changed the scheduled request');
    const encountered = new Set();
    for (const row of batch.results) {
      requireThat(scheduled.has(row.id) && !encountered.has(row.id), 'Unscheduled or duplicate attempt in a batch'); encountered.add(row.id);
      let decoded;
      try { decoded = decodeJudgment(row, mapping); }
      catch (error) { attempts.push({ id: row.id, batch: batch.id, valid: false, error: String(error.message) }); continue; }
      requireThat(!resolved.has(row.id), 'Duplicate valid judgment: cherry-picking prohibited');
      resolved.set(row.id, { row, decoded, batch: batch.id }); attempts.push({ id: row.id, batch: batch.id, valid: true });
    }
  }
  const missing = judgeRequest.items.filter(item => !resolved.has(item.id)).map(item => item.id);
  const observations = [];
  for (const { decoded, batch } of resolved.values()) for (const score of decoded.data.scores) {
    const product = decoded.entry.products[score.id], row = generation.get(`${decoded.caseId}--${product}`);
    // Failed generations stay in the denominator with zero points, regardless of judge generosity.
    const rawTotal = Object.keys(DIMENSIONS).reduce((sum, key) => sum + score[key], 0);
    observations.push({ ...score, caseId: decoded.caseId, set: decoded.entry.set, order: decoded.order, product, source: batch, rawTotal, total: row.ok ? rawTotal : 0, generationFailed: !row.ok, criticalIssues: [...score.criticalIssues, ...(!row.ok ? ['Generation failed: no usable output.'] : [])] });
  }
  const perCase = [];
  for (const c of cases) for (const product of PRODUCTS) {
    const orders = observations.filter(o => o.caseId === c.id && o.product === product);
    if (orders.length !== 2) continue;
    perCase.push({ caseId: c.id, set: c.set, product, total: orders.reduce((sum, o) => sum + o.total, 0) / 2, criticalIssues: [...new Set(orders.flatMap(o => o.criticalIssues))], orders });
  }
  const aggregate = PRODUCTS.flatMap(product => ['fixed', 'transfer', 'all'].map(set => {
    const rows = perCase.filter(o => o.product === product && (set === 'all' || o.set === set));
    return { product, set, n: rows.length, mean: rows.length ? Number((rows.reduce((sum, o) => sum + o.total, 0) / rows.length).toFixed(2)) : null, minimum: rows.length ? Math.min(...rows.map(o => o.total)) : null, criticalCases: rows.filter(o => o.criticalIssues.length).map(o => o.caseId) };
  }));
  const target = aggregate.filter(o => o.product === 'fusion' && o.set !== 'all');
  const passed = missing.length === 0 && target.every(o => o.n === 12 && o.mean >= 95 && o.minimum >= 90 && o.criticalCases.length === 0);
  return { complete: missing.length === 0, missing, passed, generationFailures: generations.filter(o => !o.ok).map(o => o.id), judge: { ...judgeRequest.selection, orders: 2, humanIndependent: false }, attempts, aggregate, perCase };
}
export async function verifyIntegrity(directory) {
  const root = path.resolve(directory);
  const manifest = JSON.parse(await readFile(path.join(root, 'integrity.json'), 'utf8'));
  requireThat(manifest && typeof manifest.artifacts === 'object' && !Array.isArray(manifest.artifacts), 'Missing integrity manifest');
  const entries = Object.entries(manifest.artifacts);
  requireThat(entries.length > 0 && entries.length <= 64 && Object.hasOwn(manifest.artifacts, 'evaluation.json'), 'Invalid integrity inventory');
  let bytes = 0;
  for (const [name, expected] of entries) {
    requireThat(typeof name === 'string' && !name.includes('\\') && !name.includes(':') && !name.startsWith('/') && name.split('/').every(part => part && part !== '.' && part !== '..'), 'Invalid integrity path');
    requireThat(expected && Number.isSafeInteger(expected.bytes) && expected.bytes >= 0 && expected.bytes <= 33554432 && /^[a-f0-9]{64}$/.test(expected.sha256), 'Invalid integrity metadata');
    let target = root;
    for (const part of name.split('/')) { target = path.join(target, part); requireThat(!(await lstat(target)).isSymbolicLink(), 'Integrity artifacts must not be symbolic links'); }
    requireThat((await lstat(target)).isFile(), 'Integrity artifact is not a regular file');
    const content = await readFile(target); bytes += content.length;
    requireThat(bytes <= 67108864 && content.length === expected.bytes && digest(content) === expected.sha256, 'Integrity mismatch: ' + name);
  }
  return { round: manifest.round, artifacts: entries.length, bytes, verified: true };
}
export async function loadEvaluation(directory) {
  const integrity = await verifyIntegrity(directory);
  const data = JSON.parse(await readFile(path.join(directory, 'evaluation.json'), 'utf8'));
  requireThat(data.round === integrity.round, 'Round identity mismatch');
  return { data, result: scoreEvaluation(data), integrity };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const directory = path.resolve(process.argv[2] ?? '');
  const { result } = await loadEvaluation(directory);
  const summary = { complete: result.complete, passed: result.passed, generationFailures: result.generationFailures, missing: result.missing, aggregate: result.aggregate };
  if (process.argv[3] === '--out' && process.argv[4]) await writeFile(path.resolve(process.argv[4]), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(summary, null, 2));
  if (!result.complete) process.exitCode = 2;
}
