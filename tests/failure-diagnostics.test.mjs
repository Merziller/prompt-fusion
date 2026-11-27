import test from 'node:test';
import assert from 'node:assert/strict';
import { enhance, FusionError } from '../src/core.mjs';
import { classifyFailure } from '../src/failures.mjs';
import { collectDshText } from '../src/providers.mjs';
import { createRouteHandler, makeOperation } from '../adapters/dsh/index.mjs';

for (const [code, category] of Object.entries({ ABORTED:'cancelled', REGISTRATION_DISPOSED:'cancelled', EMPTY_RESPONSE:'format', INVALID_RESPONSE:'format', TRANSPORT:'connection', STREAM_CLOSED:'connection', INVALID_CONFIG:'configuration', QUOTA:'authentication', MISSING_CREDENTIAL:'authentication', RATE_LIMIT:'rate-limit' })) {
  test('classifies structured host failure ' + code, () => assert.equal(classifyFailure({ code }).category, category));
}
for (const status of [408,504]) test('HTTP timeout wins over generic provider failure '+status, () => {
  assert.deepEqual(classifyFailure({code:'PROVIDER_ERROR', status}), {category:'timeout',retryable:true,status});
  assert.equal(classifyFailure({code:'HTTP_'+status}).category,'timeout');
});
test('failure metadata is allowlisted and drops provider body and invalid status', () => {
  assert.deepEqual(classifyFailure({failure:{category:'fidelity',retryable:false,status:2000,private:'secret'}}), {category:'fidelity',retryable:false});
  assert.equal(classifyFailure({failure:{category:'<script>secret</script>'}}).category,'model');
});
test('failure diagnostics carry bounded stage, count and elapsed time without provider text', async () => {
  const r = await enhance({input:'请整理需求。'}, {providers:[async()=>{throw Object.assign(new Error('PRIVATE_body_secret'), {code:'SECRET_TOKEN_provider_error'});} ]});
  assert.equal(r.failure.category,'model'); assert.equal(r.audit.modelCalls,1);
  assert.equal(r.audit.lastStage,'rewrite'); assert.ok(r.audit.elapsedMs>=0);
  assert.deepEqual(r.audit.categories,['model']);
  assert.ok(!JSON.stringify(r).includes('SECRET_TOKEN')); assert.ok(!JSON.stringify(r).includes('PRIVATE_body'));
});
test('failure diagnostics identify fidelity failure after review and verification', async () => {
  const r = await enhance({input:'保留数字 20。'}, {providers:[async({stage})=>JSON.stringify(stage==='rewrite'?{prompt:'保留数字 21。'}:{verdict:'pass',prompt:null,issues:[]})]});
  assert.equal(r.enhanced,r.original); assert.equal(r.failure.category,'fidelity');
  assert.equal(r.audit.modelCalls,3); assert.equal(r.audit.lastStage,'verify');
  assert.deepEqual(r.audit.categories,['fidelity']);
});
test('route fallback false keeps bounded failure detail', async () => {
  const operation = makeOperation({selection:()=>({provider:'p',model:'m'}),llm:{stream:async function*(){yield {type:'finish',reason:{kind:'error',failure:{code:'TRANSPORT',message:'PRIVATE_body_secret'}}};}}});
  const handler = createRouteHandler('enhance',{operation});
  const response = await handler(new Request('http://127.0.0.1/test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({input:'请整理需求。',fallback:false})}));
  const data = await response.json(); assert.equal(data.error.failure.category,'connection');
  assert.equal(data.error.audit.modelCalls,1); assert.ok(!JSON.stringify(data).includes('PRIVATE_body'));
});
test('DSH aborted stream stays cancelled and retains no partial text', async () => {
  await assert.rejects(collectDshText((async function*(){yield {type:'text-delta',text:'partial'};yield {type:'finish',reason:{kind:'aborted'}};})()),e=>e.code==='ABORTED');
});
test('valid explicit prohibition remains protected after feedback fix', async () => {
  const r=await enhance({input:'配音不好听，请优化。不重启。'}, {providers:[async({stage})=>JSON.stringify(stage==='rewrite'?{prompt:'请改善配音音色并重启。'}:{verdict:'pass',prompt:null,issues:[]})]});
  assert.equal(r.enhanced,r.original); assert.equal(r.failure.category,'fidelity');
});
