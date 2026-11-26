import test from 'node:test';
import assert from 'node:assert/strict';
import { enhance } from '../src/core.mjs';
import { negativeDirectives, checkCandidate } from '../src/rewrite.mjs';

for (const [original, candidate] of [
  ['请先比较方案，不要画稿。', '请先比较方案，不要直接下结论，不要产出任何视觉方案。'],
  ['检查日志，不重启。', '检查日志，不重启服务。'],
  ['رتّب المتطلبات. لا تختَر التقنية.', 'رتّب المتطلبات. لا تختَر التقنية بنفسك.'],
  ['Inspect the logs. Do not restart.', 'Inspect the logs. Do not restart the service.'],
  ['客户资料别上传云端。', '客户资料不要上传第三方云端。'],
  ['Do not send email.', 'You may send email after approval.']
]) test('preserve the scope of a negative clause: '+original, () => {
  assert.ok(checkCandidate(original,candidate).some(issue => issue.kind === 'meaning'));
  assert.deepEqual(checkCandidate(original,original), []);
});

test('negative markers, politeness and Arabic diacritics may normalize, not objects',()=>{
  assert.deepEqual(checkCandidate('不要重启。','请勿重启。').filter(x=>x.kind==='meaning'), []);
  assert.deepEqual(checkCandidate('لا تختَر التقنية.','لا تختر التقنية.'), []);
  assert.deepEqual(checkCandidate('Do not restart.','Please don’t restart.'), []);
});

test('quoted instructions and code remain data, while a prohibited quoted object is protected',()=>{
  assert.deepEqual(negativeDirectives('分析“不要直接下结论”。\n```js\n// Do not run\n```'), []);
  const clauses=negativeDirectives('不要只说“更现代”。');
  assert.equal(clauses.length,1); assert.equal(clauses[0].text,'不要只说“更现代”');
  assert.ok(checkCandidate('不要只说“更现代”。','不要使用“更现代”。').some(x=>x.kind==='meaning'));
});

test('negated factual statements are not invented imperative clauses',()=>{
  assert.deepEqual(negativeDirectives('我不知道这个事实。我不能确定当前的计划。这个页面不同。'), []);
});

test('protected negative clauses are provided to the editor and an erroneous pass gets checked',async()=>{
  const original='请先比较方案，不要画稿。',good='请比较备选方案的利弊，不要画稿。';
  const stages=[];
  const result=await enhance({input:original,fallback:false},{providers:[async({stage,input})=>{
    const payload=JSON.parse(input);stages.push(stage);
    assert.deepEqual(payload.protectedNegativeClauses,['不要画稿']);
    if(stage==='rewrite')return JSON.stringify({prompt:'请比较备选方案，不要直接下结论，不要画稿。'});
    if(stage==='review')return JSON.stringify({verdict:'pass',prompt:null,issues:[]});
    assert.ok(payload.literalIssues.some(x=>x.kind==='meaning'));
    return JSON.stringify({verdict:'revised',prompt:good,issues:[{kind:'meaning',detail:'Removed a new prohibition on conclusions.'}]});
  }]});
  assert.equal(result.enhanced,good);assert.deepEqual(stages,['rewrite','review','verify']);
});

test('positive role wording and ordinary 别 compounds are not prohibitions',()=>{
  for (const text of ['各 AI 分别负责什么。','请比较两种分类之间的区别。','请识别类别并说明特别之处。','角色分工：两个助手分别找遗漏和矛盾。']) {
    assert.deepEqual(negativeDirectives(text), [], text);
  }
});

test('ordinary 别 compounds inside a real prohibition are not rewritten',()=>{
  const clauses=negativeDirectives('不要分别设置权限。');
  assert.equal(clauses[0].normalized,'不分别设置权限');
  assert.deepEqual(checkCandidate('不要分别设置权限。','请勿分别设置权限。'),[]);
  assert.ok(checkCandidate('不要分别设置权限。','不要统一设置权限。').some(issue=>issue.kind==='meaning'));
});

test('a neutral requirement label is not part of the prohibited action',()=>{
  assert.deepEqual(checkCandidate('不再加角色。','要求：不再加角色。'), []);
  assert.deepEqual(checkCandidate('Do not restart.','Constraints: Do not restart.'), []);
  assert.ok(checkCandidate('不重启。','要求：不重启服务。').some(issue=>issue.kind==='meaning'));
});

test('Arabic coordinated prohibitions retain both actions inside a longer instruction',()=>{
  const original='ابدأ بالأسئلة المهمة ولا تختَر التقنية أو تضف الدفع الإلكتروني الآن.';
  const equivalent='ابدأ بطرح الأسئلة المهمة، ولا تختر التقنية ولا تضف الدفع الإلكتروني الآن.';
  assert.equal(negativeDirectives(original).length,1);
  assert.deepEqual(checkCandidate(original,equivalent),[]);
  assert.ok(checkCandidate(original,'ابدأ بالأسئلة المهمة ولا تختر التقنية بنفسك ولا تضف الدفع الإلكتروني الآن.').some(issue=>issue.kind==='meaning'));
  assert.ok(checkCandidate(original,'ابدأ بالأسئلة المهمة ولا تختر التقنية.').some(issue=>issue.kind==='meaning'));
});

test('a prohibited action still narrowed after verification keeps the original',async()=>{
  const original='检查日志，不重启。';
  const result=await enhance({input:original},{providers:[async({stage})=>JSON.stringify(stage==='rewrite'?{prompt:'检查日志，不重启服务。'}:{verdict:'pass',prompt:null,issues:[]})]});
  assert.equal(result.engine,'unchanged');assert.equal(result.enhanced,original);
});
