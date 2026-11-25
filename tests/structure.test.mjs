import test from 'node:test';
import assert from 'node:assert/strict';
import { enhance } from '../src/core.mjs';
import { taskRefinements } from '../src/structure.mjs';
for (const input of [
  '开发一个插件，不指定框架，支持 Windows 和 Linux，预算 500 元。',
  '请设计网站首页，保持原有 LOGO，不增加新按钮。',
  '帮一人公司整理报表，保留全部金额，不猜数据。',
  '研究最新 AI 产品并列出来源，最多 3 页。',
  'Coordinate multi-agent API work; do not change public interfaces or use new dependencies.',
  'Write an article using these facts, under 500 words, without invented quotes.'
]) test('structured task retains exact request: ' + input.slice(0, 25), async () => {
  const result = await enhance({ input, layout:'structured', intensity:'deep', mode:'smart' });
  assert.ok(result.enhanced.includes(input));
  assert.equal(result.changes.originalPreserved, true);
  assert.equal(result.changes.reorganized, true);
  assert.ok(result.ruleIds.includes('deliver'));
  assert.ok(result.ruleIds.includes('exceptions'));
  assert.ok(result.enhanced.indexOf(input) < result.enhanced.indexOf('## ' + (result.language === 'zh' ? '执行要求' : 'Execution guidance')));
  const again = await enhance({ input:result.enhanced, layout:'structured', intensity:'deep' });
  assert.equal(again.enhanced, result.enhanced);
});
test('model cannot silently reduce deep structured output to scope only', async () => {
  const result = await enhance({ input:'请开发插件接口', layout:'structured', intensity:'deep', mode:'smart' }, { providers:[async () => '{"ruleIds":["scope"]}'] });
  assert.equal(result.engine, 'model-assisted');
  assert.ok(result.ruleIds.includes('code'));
  assert.ok(result.ruleIds.includes('evidence'));
});
test('task refinements are relevant, bounded and do not choose unsupported frameworks', () => {
  const result = taskRefinements('插件 API 网站界面 研究报表 一人公司 团队文章', 'zh');
  assert.equal(result.length, 5);
  assert.ok(result.some(s => s.includes('公开扩展接口')));
  assert.ok(!result.join('').includes('Next.js'));
  assert.deepEqual(taskRefinements('hello', 'en'), []);
});
test('unsupported script is preserved without adding a foreign-language structure', async () => {
  const input = '日本語で資料を整理してください。';
  assert.equal((await enhance({ input, layout:'structured', intensity:'deep' })).enhanced, input);
});
test('invalid layout is rejected rather than changing behavior silently', async () => {
  await assert.rejects(enhance({ input:'hello', layout:'anything' }), { code:'INVALID_OPTION' });
});
