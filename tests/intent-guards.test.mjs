import test from 'node:test';
import assert from 'node:assert/strict';
import { explicitGoals, intentIssues } from '../src/intent-guards.mjs';
import { checkCandidate } from '../src/rewrite.mjs';
import { enhance } from '../src/core.mjs';
const goalInput = '想把预约页面改得清楚些，可能偏暖色，但别现在定颜色；目前有两个按钮「了解详情」「预约体验」，这轮先比较保留两个还是只留一个的利弊。不要画稿。';
const goalBad = '请帮我梳理预约页面的改进思路：目前页面上有「了解详情」和「预约体验」两个按钮，这轮先比较保留两个按钮与只保留一个按钮各自的利弊，以便后续判断。页面可能偏暖色，但别现在定颜色。不要画稿。';
const goalGood = '请以让预约页面更清楚为目标，比较保留「了解详情」「预约体验」两个按钮与只留一个按钮的利弊。页面可能偏暖色，但别现在定颜色。不要画稿。';
const formatInput = 'Please polish the sentence “We might deliver next week” while keeping the uncertainty.';
const formatBad = 'Polish the sentence “We might deliver next week” while keeping the uncertainty. Return the polished sentence in one concise paragraph.';
const formatGood = 'Polish the sentence “We might deliver next week” while preserving its uncertainty.';
test('the exact scored goal-loss output is rejected without freezing the original wording', () => {
  assert.deepEqual(explicitGoals(goalInput).map(x=>({subject:x.subject,property:x.property})), [{subject:'预约页面',property:'clarity'}]);
  assert.ok(checkCandidate(goalInput,goalBad).some(x=>x.kind==='omission' && /clarity/.test(x.detail)));
  assert.deepEqual(checkCandidate(goalInput,goalGood),[]);
});
test('the exact scored paragraph-invention output is rejected', () => {
  assert.ok(checkCandidate(formatInput,formatBad).some(x=>x.kind==='invention' && /one-paragraph/.test(x.detail)));
  assert.deepEqual(checkCandidate(formatInput,formatGood),[]);
});
for (const [input,good,bad] of [
  ['让付款页更易懂。','请提高付款页的易懂程度。','请研究付款页的改进方案。'],
  ['Make the booking page clearer.','Improve clarity on the booking page.','Suggest improvements to the booking page.'],
  ['把文档改得易读。','改善文档的可读性。','重新组织文档。'],
  ['让导航更易用。','提升导航的易用程度。','提供导航改进建议。']
]) test('explicit subject and outcome survive rephrasing: '+input,()=>{
  assert.equal(intentIssues(input,good).length,0); assert.ok(intentIssues(input,bad).some(x=>x.kind==='omission'));
});
test('one topic retaining a different topic clarity is not enough',()=>assert.ok(intentIssues('Make the booking page clearer.','Improve the booking page. Make the guide clearer.').some(x=>x.kind==='omission')));
for(const candidate of ['Return one short paragraph.','输出一个简短段落。','Provide the answer as JSON.','Use Markdown.','Return a table.','输出无序列表。']) test('new downstream format is rejected: '+candidate,()=>assert.ok(intentIssues('Polish this sentence.',candidate).some(x=>x.kind==='invention')));
test('existing format and quoted format data are not newly invented',()=>{
  assert.deepEqual(intentIssues('Return one concise paragraph.','Please return one concise paragraph.'),[]);
  assert.deepEqual(intentIssues('Polish “Return one concise paragraph.”','Polish “Return one concise paragraph.”'),[]);
  assert.deepEqual(intentIssues('Review the inputs.','Review JSON input and the table of measurements.'),[]);
});
for (const [input,bad,good] of [[goalInput,goalBad,goalGood],[formatInput,formatBad,formatGood]]) test('false passing review triggers corrective verification for '+input.slice(0,20),async()=>{
  const seen=[];
  const result=await enhance({input,mode:'smart',fallback:false},{providers:[async({stage,input:payload})=>{
    seen.push(stage);const data=JSON.parse(payload);
    if(stage==='rewrite') return JSON.stringify({prompt:bad});
    if(stage==='review') return JSON.stringify({verdict:'pass',prompt:null,issues:[]});
    assert.ok(data.literalIssues.length);return JSON.stringify({verdict:'revised',prompt:good,issues:[{kind:'meaning',detail:'Preserved the original goal and removed the added format.'}]});
  }]});
  assert.deepEqual(seen,['rewrite','review','verify']);assert.equal(result.enhanced,good);
});
test('persisting semantic failures retain the exact original draft',async()=>{
  const result=await enhance({input:formatInput,mode:'smart',fallback:true},{providers:[async({stage})=>JSON.stringify(stage==='rewrite'?{prompt:formatBad}:{verdict:'pass',prompt:null,issues:[]})]});
  assert.equal(result.engine,'unchanged');assert.equal(result.enhanced,formatInput);assert.equal(result.failure.category,'fidelity');
});
