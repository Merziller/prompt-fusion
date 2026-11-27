import test from 'node:test';
import assert from 'node:assert/strict';
import { enhance } from '../src/core.mjs';
import { negativeDirectives, checkCandidate } from '../src/rewrite.mjs';

// Synthetic regression text, not the original user's draft.
const original = '演示视频用了虚构界面，为什么没有用真实页面截图或录屏？旁白音色难受，不好听，不舒服，语速和情绪奇怪，还夹着突然抬高音量的片段。请核实原因并优化。';
const faithful = '请检查演示视频为何使用虚构界面，而非真实页面截图或录屏。旁白音色听着难受、听起来别扭，语速与情绪异常，偶尔音量突增。请核实原因并优化。';

test('subjective complaints are not imperative prohibitions', () => {
  for (const text of ['不好听。', '不舒服。', '不太自然。', '不够清晰。', '不怎么流畅。', '这段配音听起来别扭。', '这个风格很别致。', original]) {
    assert.deepEqual(negativeDirectives(text), [], text);
  }
  assert.deepEqual(checkCandidate(original, faithful), []);
});
test('explicit negative directives still bind descriptions and unfamiliar actions', () => {
  for (const text of ['不要让配音不舒服。', '请别把声音调得别扭。', '不重启。', '不再加角色。', '不指定新技术栈。', '不量化这段素材。', '不舒服地念这些台词。']) {
    assert.equal(negativeDirectives(text).length, 1, text);
  }
  assert.ok(checkCandidate('请核实配音，不重启。', '请核实配音并重启。').some(x => x.kind === 'meaning'));
});
test('faithful complaint rewrite completes instead of exhausting verification on adjectives', async () => {
  const stages = [];
  const result = await enhance({ input:original, fallback:false }, { providers:[async ({ stage, input }) => {
    stages.push(stage);
    assert.deepEqual(JSON.parse(input).protectedNegativeClauses, []);
    return JSON.stringify(stage === 'rewrite' ? { prompt:faithful } : { verdict:'pass', prompt:null, issues:[] });
  }] });
  assert.equal(result.engine, 'model-rewrite');
  assert.equal(result.enhanced, faithful);
  assert.deepEqual(stages, ['rewrite', 'review']);
});
