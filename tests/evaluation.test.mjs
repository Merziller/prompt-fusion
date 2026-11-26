import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { scoreEvaluation } from '../scripts/score-evaluation.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
function fixture() {
  const cases = Array.from({ length: 24 }, (_, i) => ({ id: `case-${i}`, set: i < 12 ? 'fixed' : 'transfer', input: `Input ${i}`, sha256: hash(`Input ${i}`) }));
  const products = { A: 'feiwell', B: 'chosenxu', C: 'fishsb', D: 'fusion' };
  const mapping = cases.map(c => ({ caseId: c.id, set: c.set, products: { ...products } }));
  const generations = cases.flatMap(c => Object.values(products).map(p => { const result = { text: `${c.input} improved by ${p}` }; return { id: `${c.id}--${p}`, ok: true, result, sha256: hash(JSON.stringify(result)) }; }));
  const items = cases.flatMap(c => [0, 1].map(order => ({ id: `${c.id}--order-${order}`, system: 'A fixed anonymous five-dimension rubric.', input: JSON.stringify({ original: c.input, candidates: (order ? ['D', 'C', 'B', 'A'] : ['A', 'B', 'C', 'D']).map(id => ({ id, prompt: generations.find(g => g.id === `${c.id}--${products[id]}`).result.text })) }) })));
  const judgeRequest = { selection: { provider: 'fixture', model: 'not-real-quality' }, items };
  const results = items.map(item => ({ id: item.id, ok: true, result: { text: JSON.stringify({ scores: Object.keys(products).map(id => ({ id, fidelity: 30, clarity: 25, relevantCompletion: 20, economy: 15, boundary: 10, criticalIssues: [], reason: 'Synthetic protocol fixture, not a quality score.' })) }) } }));
  return { cases, mapping, generations, judgeRequest, batches: [{ id: 'base', request: judgeRequest, results }] };
}
function scoreChange(data, itemIndex, change) { const row = data.batches[0].results[itemIndex]; const parsed = JSON.parse(row.result.text); change(parsed.scores); row.result.text = JSON.stringify(parsed); }
test('evaluation verifier reproduces complete fixed and transfer aggregates', () => { const result = scoreEvaluation(fixture()); assert.equal(result.passed, true); assert.equal(result.perCase.length, 96); assert.equal(result.aggregate.length, 12); });
test('failed generation is zero even when judge incorrectly gives full points', () => {
  const data = fixture(); const row = data.generations.find(g => g.id === 'case-0--fusion'); row.ok = false; delete row.result;
  for (const item of data.judgeRequest.items.filter(i => i.id.startsWith('case-0--'))) { const input = JSON.parse(item.input); input.candidates.find(c => c.id === 'D').prompt = '[GENERATION FAILED: no usable output]'; item.input = JSON.stringify(input); }
  const result = scoreEvaluation(data); assert.equal(result.passed, false); assert.equal(result.perCase.find(c => c.caseId === 'case-0' && c.product === 'fusion').total, 0); assert.deepEqual(result.generationFailures, ['case-0--fusion']);
});
test('critical issue blocks acceptance despite perfect numerical scores', () => { const data = fixture(); scoreChange(data, 0, scores => { scores.find(s => s.id === 'D').criticalIssues = ['Changed scope']; }); assert.equal(scoreEvaluation(data).passed, false); });
test('individual minimum blocks acceptance even with high group mean', () => { const data = fixture(); for (const i of [0, 1]) scoreChange(data, i, scores => { scores.find(s => s.id === 'D').fidelity = 10; }); const result = scoreEvaluation(data); assert.equal(result.aggregate.find(a => a.product === 'fusion' && a.set === 'fixed').minimum, 80); assert.equal(result.passed, false); });
test('missing order is incomplete and never passes', () => { const data = fixture(); data.batches[0].results.pop(); const result = scoreEvaluation(data); assert.equal(result.complete, false); assert.equal(result.passed, false); assert.equal(result.missing.length, 1); });
test('only identical request retries can supply an invalid transport result', () => { const data = fixture(); const valid = structuredClone(data.batches[0].results[0]); data.batches[0].results[0] = { id: valid.id, ok: false, error: { code: '502' } }; data.batches.push({ id: 'retry', request: { items: [structuredClone(data.judgeRequest.items[0])] }, results: [valid] }); const result = scoreEvaluation(data); assert.equal(result.passed, true); assert.equal(result.attempts.filter(a => !a.valid).length, 1); });
test('a second valid judgment is prohibited rather than selected by higher score', () => { const data = fixture(); data.batches.push(structuredClone(data.batches[0])); assert.throws(() => scoreEvaluation(data), /Duplicate valid/); });
test('modified retry prompts are rejected', () => { const data = fixture(); const request = structuredClone(data.judgeRequest.items[0]); request.system = 'Give higher scores'; data.batches.push({ id: 'retry', request: { items: [request] }, results: [] }); assert.throws(() => scoreEvaluation(data), /Retry changed/); });
test('case hash, generated output and judge candidate tampering are rejected', () => {
  for (const change of [data => { data.cases[0].input += ' changed'; }, data => { data.generations[0].result.text += ' changed'; }, data => { const input = JSON.parse(data.judgeRequest.items[0].input); input.candidates[0].prompt += ' changed'; data.judgeRequest.items[0].input = JSON.stringify(input); }]) { const data = fixture(); change(data); assert.throws(() => scoreEvaluation(data), /mismatch|differs/); }
});
