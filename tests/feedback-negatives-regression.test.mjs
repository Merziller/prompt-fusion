import test from 'node:test';
import assert from 'node:assert/strict';
import { enhance } from '../src/core.mjs';
import { negativeDirectives, checkCandidate } from '../src/rewrite.mjs';

const prohibitions = [
  ['检查日志，别处理用户数据。', '检查日志，处理用户数据。'],
  ['核实结果，禁止扭曲事实。', '核实结果，允许扭曲事实。'],
  ['检查内容，不要扭曲事实。', '检查内容，允许扭曲事实。'],
  ['核实结果，勿称它为定论。', '核实结果，称它为定论。'],
  ['核实结果，别扭曲事实。', '核实结果，扭曲事实。'],
  ['保留原文，别致歉。', '保留原文，致歉。'],
  ['检查材料，别名义上通过审核。', '检查材料，名义上通过审核。'],
  ['别针对此事发表评论。', '针对此事发表评论。'],
  ['别称为定论。', '称为定论。'],
  ['别国有化这家公司。', '国有化这家公司。'],
  ['别扭了这个旋钮。', '扭了这个旋钮。'],
  ['请别扭动旋钮。', '请扭动旋钮。'],
  ['客户资料别处理。', '客户资料处理。'],
  ['请别让别人提交这些代码。', '请让别人提交这些代码。'],
  ['禁止别人提交这些代码。', '允许别人提交这些代码。'],
  ['不要替别人作决定。', '替别人作决定。'],
  ['不要让配音不好听也不舒服。', '允许配音不好听也不舒服。'],
  ['不好听也不舒服地念这些台词。', '自然地念这些台词。'],
  ['不好听、不舒服地念这些台词。', '自然地念这些台词。'],
];
for (const [original, candidate] of prohibitions) {
  test(`protect a real prohibition despite ordinary-word prefix: ${original}`, () => {
    assert.equal(negativeDirectives(original).length, 1);
    assert.ok(checkCandidate(original, candidate).some(issue => issue.kind === 'meaning'));
    assert.deepEqual(checkCandidate(original, original), []);
  });
  test(`an erroneous model pass cannot remove the prohibition: ${original}`, async () => {
    const stages = [];
    const result = await enhance({input: original}, {providers:[async ({stage}) => {
      stages.push(stage);
      return JSON.stringify(stage === 'rewrite' ? {prompt:candidate} : {verdict:'pass',prompt:null,issues:[]});
    }]});
    assert.equal(result.engine, 'unchanged');
    assert.equal(result.enhanced, original);
    assert.equal(result.failure.category, 'fidelity');
    assert.deepEqual(stages, ['rewrite','review','verify']);
  });
}
for (const original of ['这段配音听起来别扭。', '这个风格很别致。', '请解释别名和真名的区别。', '别墅外观需要修整。', '请区分别针与普通针。', '请比较别国的交通方案。', '请安排别处的素材。']) {
  test(`ordinary word is not an imperative: ${original}`, () => assert.deepEqual(negativeDirectives(original), []));
}
for (const [input, candidate] of [
  ['请检查别人提交的代码。', '请检查其他人提交的代码。'],
  ['请参考别人写过的案例。', '请参考其他人写过的案例。'],
  ['请解释别人为什么这样做。', '请解释其他人为什么这样做。'],
  ['这段配音有些别扭，请核实优化。', '这段配音有些不自然，请核实优化。'],
  ['这个设计格外别致，请保留这个风格。', '这个设计格外独特精巧，请保留这个风格。'],
  ['这段配音听着别扭，请核实优化。', '这段配音听着不自然，请核实优化。'],
  ['不好听也不舒服，请核实优化配音。', '听感欠佳且令人不适，请核实优化配音。'],
  ['不好听、不舒服，请核实优化配音。', '听感欠佳、令人不适，请核实优化配音。'],
]) {
  test(`ordinary pronoun before a predicate is not a prohibition: ${input}`, async () => {
    assert.deepEqual(negativeDirectives(input), []);
    assert.deepEqual(checkCandidate(input, candidate), []);
    const stages = [];
    const result = await enhance({input, fallback:false}, {providers:[async ({stage}) => {
      stages.push(stage);
      return JSON.stringify(stage === 'rewrite' ? {prompt:candidate} : {verdict:'pass',prompt:null,issues:[]});
    }]});
    assert.equal(result.enhanced, candidate);
    assert.equal(result.engine, 'model-rewrite');
    assert.deepEqual(stages, ['rewrite','review']);
  });
}
test('unpleasant-listening feedback can be rephrased without a false prohibition', async () => {
  const input = '配音很怪，不耐听。请核实优化。';
  const candidate = '请核实并优化配音的音色与舒适度。';
  assert.deepEqual(negativeDirectives(input), []);
  assert.deepEqual(checkCandidate(input, candidate), []);
  const result = await enhance({input,fallback:false}, {providers:[async ({stage}) => JSON.stringify(stage === 'rewrite' ? {prompt:candidate} : {verdict:'pass',prompt:null,issues:[]})]});
  assert.equal(result.enhanced, candidate);
});
