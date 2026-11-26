import test from 'node:test';
import assert from 'node:assert/strict';
import { enhance } from '../src/core.mjs';
import { checkCandidate } from '../src/rewrite.mjs';

for (const [original,candidate] of [
  ['请整理活动宣传需求。','我目前还没有确定活动的具体安排，请整理宣传需求。'],
  ['Help clarify the publishing brief.','I have not yet decided on a publishing platform. Help clarify the brief.'],
  ['梳理访谈问题。','我们尚未了解受访者背景，请梳理访谈问题。']
]) test('unreported detail does not become a personal fact: '+original,()=>{
  assert.ok(checkCandidate(original,candidate).some(x=>x.kind==='invention'));
});

test('explicit uncertainty, conditional instructions and quoted data remain usable',()=>{
  const explicit='我还没有确定宣传平台，请整理需求。';
  assert.deepEqual(checkCandidate(explicit,explicit),[]);
  assert.deepEqual(checkCandidate('整理宣传需求。','整理宣传需求。如果我还没有确定平台，列为待确认事项。'),[]);
  const quoted='分析“我还没有确定”的含义。';
  assert.deepEqual(checkCandidate(quoted,quoted),[]);
});

test('verification repairs invented personal facts before applying',async()=>{
  const stages=[];
  const result=await enhance({input:'请整理调研需求。',mode:'smart',fallback:false},{providers:[async({stage,input})=>{
    stages.push(stage);
    if(stage==='rewrite')return JSON.stringify({prompt:'我目前还没有确定研究方向，请整理调研需求。'});
    if(stage==='review')return JSON.stringify({verdict:'pass',prompt:null,issues:[]});
    assert.ok(JSON.parse(input).literalIssues.some(x=>x.kind==='invention'));
    return JSON.stringify({verdict:'revised',prompt:'请整理调研需求，列出与目标有关的待确认事项。',issues:[{kind:'invention',detail:'Removed an unsupported claim about the user.'}]});
  }]});
  assert.deepEqual(stages,['rewrite','review','verify']);
  assert.equal(result.audit.stages,3);
  assert.equal(result.enhanced,'请整理调研需求，列出与目标有关的待确认事项。');
});

test('a surviving invented personal fact keeps the original draft',async()=>{
  const original='梳理宣传需求。';
  const result=await enhance({input:original,mode:'smart'},{providers:[async({stage})=>JSON.stringify(stage==='rewrite'?{prompt:'我目前还没有确定宣传方案，请梳理需求。'}:{verdict:'pass',prompt:null,issues:[]})]});
  assert.equal(result.engine,'unchanged');
  assert.equal(result.enhanced,original);
});
