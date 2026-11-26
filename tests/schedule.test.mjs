import test from 'node:test';
import assert from 'node:assert/strict';
import { enhance } from '../src/core.mjs';
import { checkCandidate } from '../src/rewrite.mjs';

for (const [original,candidate] of [
  ['请拟一个每周复盘框架。','请拟一个每周复盘框架，周末复盘。'],
  ['Help plan my week.','Help plan my week and review every Friday.'],
  ['请安排周末复盘。','请安排周六复盘。'],
  ['Organize a monthly review.','Organize a monthly review on Mondays.']
]) test('planning horizon does not authorize a fixed day: '+original,()=>{
  assert.ok(checkCandidate(original,candidate).some(issue=>issue.kind==='meaning'&&issue.detail.includes('schedule')));
});

test('equivalent weekday words preserve an explicit commitment',()=>{
  assert.deepEqual(checkCandidate('周一复盘。','星期一复盘。'),[]);
  assert.deepEqual(checkCandidate('Review on Saturday.','Review on Saturdays.'),[]);
});

test('optional examples and quoted data are not fixed appointments',()=>{
  assert.deepEqual(checkCandidate('请拟一个复盘框架。','请拟一个复盘框架，可选周末复盘。'),[]);
  assert.deepEqual(checkCandidate('Organize a review.','Organize a review; for example, on Fridays if available.'),[]);
  const quoted='分析“周一复盘”的表达。';
  assert.deepEqual(checkCandidate(quoted,quoted),[]);
  assert.ok(checkCandidate('可选周末复盘。','固定周末复盘。').some(issue=>issue.kind==='meaning'));
});

test('an explicit fixed day must not disappear or become optional',()=>{
  assert.ok(checkCandidate('周一复盘。','按需复盘。').some(issue=>issue.kind==='omission'));
  assert.ok(checkCandidate('Review on Fridays.','Review on a day that fits.').some(issue=>issue.kind==='omission'));
});

test('weekly frequency is not a weekday',()=>{
  assert.deepEqual(checkCandidate('每周一次复盘。','安排每周一次复盘。'),[]);
  assert.deepEqual(checkCandidate('安排复盘。','安排每周一次复盘。'),[]);
});

test('verification can remove an invented fixed day before returning the prompt',async()=>{
  const stages=[];
  const result=await enhance({input:'请拟每周复盘框架。',fallback:false},{providers:[async({stage,input})=>{
    stages.push(stage);
    if(stage==='rewrite')return JSON.stringify({prompt:'请拟每周复盘框架，周末复盘。'});
    if(stage==='review')return JSON.stringify({verdict:'pass',prompt:null,issues:[]});
    assert.ok(JSON.parse(input).literalIssues.some(issue=>issue.detail.includes('schedule')));
    return JSON.stringify({verdict:'revised',prompt:'请拟每周复盘框架，并按实际可用时间安排。',issues:[{kind:'meaning',detail:'Removed a day not specified by the user.'}]});
  }]});
  assert.deepEqual(stages,['rewrite','review','verify']);
  assert.equal(result.enhanced,'请拟每周复盘框架，并按实际可用时间安排。');
});

test('a fixed-day error surviving final verification keeps the original',async()=>{
  const original='Help plan my week.';
  const result=await enhance({input:original},{providers:[async({stage})=>JSON.stringify(stage==='rewrite'?{prompt:'Help plan my week with reviews on Fridays.'}:{verdict:'pass',prompt:null,issues:[]})]});
  assert.equal(result.engine,'unchanged');
  assert.equal(result.enhanced,original);
});
