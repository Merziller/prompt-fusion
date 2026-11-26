import test from 'node:test';
import assert from 'node:assert/strict';
import { enhance } from '../src/core.mjs';
import { textLengthConstraints, checkCandidate } from '../src/rewrite.mjs';

for (const [original, candidate] of [
  ['写一封邮件，150字以内，只给主题和正文。', '写邮件，正文150字以内，只给主题和正文。'],
  ['Write an email in no more than 150 words; provide its subject and body.', 'Provide the email subject and body, with the body under 150 words.'],
  ['正文最多100字。', '整封邮件最多100字。'],
  ['邮件最多150字。', '邮件最多150 words.']
]) test('length unit and measured subject remain bound: '+original, () => {
  assert.ok(checkCandidate(original, candidate).some(issue => /limit|unit/.test(issue.detail)));
  assert.deepEqual(checkCandidate(original, original), []);
});
test('a combined subject/body limit is a whole document, not the body alone', () => {
  assert.equal(textLengthConstraints('邮件的主题与正文合计150字以内。')[0].scope, 'document');
  assert.deepEqual(checkCandidate('写邮件，150字以内。', '邮件的主题与正文合计150字以内。'), []);
});
for (const text of [
  '全文（含主题和正文）150字以内。',
  '整封邮件（包括主题与正文）控制在150字以内。',
  'Write the entire email (including subject and body) in no more than 150 words.',
  'Keep the whole message (including its title and body) under 150 words.'
]) test('an inclusive parenthetical does not narrow a whole-document limit: '+text, () => {
  const limit = textLengthConstraints(text)[0];
  assert.equal(limit.scope, 'document');
  assert.deepEqual(checkCandidate(text, text), []);
});
test('whole-document inclusion passes the model pipeline without a spurious verification', async () => {
  const original = '请写邮件，150字以内，只给主题和正文。';
  const candidate = '请写邮件，只给主题和正文，全文（含主题和正文）150字以内。';
  const stages=[];
  const result=await enhance({input:original,mode:'smart',fallback:false},{providers:[async ({stage,input})=>{
    stages.push(stage);
    if(stage==='rewrite')return JSON.stringify({prompt:candidate});
    assert.deepEqual(JSON.parse(input).literalIssues,[]);
    return JSON.stringify({verdict:'pass',prompt:null,issues:[]});
  }]});
  assert.deepEqual(stages,['rewrite','review']);
  assert.equal(result.enhanced,candidate);
});
for (const text of [
  '整封邮件（仅正文）150字以内。',
  'Write the email (body only) under 150 words.'
]) test('an exclusive body parenthetical remains a narrowed scope: '+text, () => {
  assert.equal(textLengthConstraints(text)[0].scope,'body');
  const original=text.startsWith('Write')?'Write the email under 150 words.':'写邮件，150字以内。';
  assert.ok(checkCandidate(original,text).some(issue=>/limit applies/.test(issue.detail)));
});
test('a later explicit body limit is not erased by an earlier whole-document inclusion', () => {
  const text='整封邮件（含主题和正文），其中正文最多150字。';
  assert.equal(textLengthConstraints(text)[0].scope,'body');
});
test('text length in quoted reference data is not a new constraint', () => {
  assert.deepEqual(textLengthConstraints('分析“正文20字”的说法。'), []);
  assert.deepEqual(textLengthConstraints('Review `body: 20 words`.'), []);
});
test('unknown text length antecedents remain explicitly unknown', () => {
  assert.equal(textLengthConstraints('Use no more than 20 words.')[0].scope, 'unknown');
  assert.deepEqual(checkCandidate('Use no more than 20 words.', 'Keep the response within 20 words.'), []);
});
for (const candidate of [
  '两个助手并行审阅，一个专门找遗漏，另一个找矛盾。',
  'Two assistants review in parallel; one is solely responsible for omissions and the other checks contradictions.'
]) test('non-exclusive review focuses do not become exclusive: '+candidate, () => {
  const original = candidate.startsWith('Two') ? 'Two assistants review in parallel; one checks omissions and the other checks contradictions.' : '两个助手并行审阅，一个找遗漏，一个找矛盾。';
  assert.ok(checkCandidate(original,candidate).some(issue => /exclusive responsibilities/.test(issue.detail)));
});
test('explicitly exclusive roles may remain exclusive', () => {
  const original = '两个助手审阅，一个专门找遗漏，另一个专门找矛盾。';
  assert.deepEqual(checkCandidate(original,original), []);
});
test('a passing review with changed length scope gets a verification correction', async () => {
  const original = '写一封邮件，150字以内，只给主题和正文。';
  const corrected = '请写一封邮件，只给主题和正文，两部分合计不超过150字。';
  const stages=[];
  const result=await enhance({input:original,mode:'smart',fallback:false},{providers:[async ({stage,input})=>{
    stages.push(stage);const payload=JSON.parse(input);
    assert.equal(payload.protectedLengthConstraints[0].scope,'document');
    if(stage==='rewrite')return JSON.stringify({prompt:'请写邮件，只给主题和正文，正文150字以内。'});
    if(stage==='review')return JSON.stringify({verdict:'pass',prompt:null,issues:[]});
    assert.ok(payload.literalIssues.some(issue=>/limit applies/.test(issue.detail)));
    return JSON.stringify({verdict:'revised',prompt:corrected,issues:[{kind:'meaning',detail:'Restored the whole correspondence length limit.'}]});
  }]});
  assert.deepEqual(stages,['rewrite','review','verify']);assert.equal(result.enhanced,corrected);
});
test('a length scope error surviving verification retains the original', async () => {
  const original='写邮件，150字以内。';
  const result=await enhance({input:original,mode:'smart'},{providers:[async ({stage})=>JSON.stringify(stage==='rewrite'?{prompt:'写邮件，正文150字以内。'}:{verdict:'pass',prompt:null,issues:[]})]});
  assert.equal(result.enhanced,original);assert.equal(result.engine,'unchanged');
});
