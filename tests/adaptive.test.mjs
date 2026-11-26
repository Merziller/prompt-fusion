import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptivePlan, compactSurface, surfaceEquivalent, FAST_REWRITE_SYSTEM } from '../src/adaptive.mjs';
import { enhance, FusionError } from '../src/core.mjs';
import { classifyFailure } from '../src/failures.mjs';
import { collectDshText, createHttpProvider } from '../src/providers.mjs';
const request = input => ({input,mode:'smart',layout:'structured',fallback:false});
for (const input of ['帮我概括这段文字。','麻烦你润色这句话。','Could you summarize this paragraph?','Please translate this short note.','Could you polish this sentence?']) test('simple single intent is eligible: '+input,()=>{
  assert.equal(adaptivePlan(request(input)).fastEligible,true);
});
for (const input of ['请润色这段说明，不添加承诺。','Summarize this in 20 words.','Please polish "Hello".','Translate this, then summarize it.','Explain API_request in detail.','Write a design proposal.','帮我整理计划，先询问再开始。']) test('constrained/complex input receives full review: '+input,()=>{
  assert.equal(adaptivePlan(request(input)).fastEligible,false);
});
test('native references and explicit context disable fast route',()=>{
  assert.equal(adaptivePlan({...request('Summarize this paragraph.'),layout:'append'}).fastEligible,false);
  assert.equal(adaptivePlan({...request('Summarize this paragraph.'),useContext:true}).fastEligible,false);
  assert.equal(adaptivePlan({...request('Summarize this paragraph.'),useMemory:true}).fastEligible,false);
});
test('surface normalization never removes content words, numbers or arbitrary case',()=>{
  assert.equal(compactSurface('Could you please summarize this paragraph?'),'summarize this paragraph');
  assert.equal(surfaceEquivalent('请概括这段文字。','概括这段文字'),true);
  assert.equal(surfaceEquivalent('Please summarize this paragraph.','Summarize this paragraph in five bullets.'),false);
  assert.equal(surfaceEquivalent('Translate to US English.','Translate to us English.'),false);
  assert.equal(surfaceEquivalent('Summarize these notes.','Summarize this note.'),false);
});
test('a verified surface edit returns after exactly one model call',async()=>{
  const stages=[]; const r=await enhance(request('Could you summarize this paragraph?'),{providers:[async({stage,system})=>{
    stages.push(stage);assert.equal(system,FAST_REWRITE_SYSTEM);return JSON.stringify({prompt:'Summarize this paragraph.'});
  }]});
  assert.deepEqual(stages,['rewrite']);assert.equal(r.enhanced,'Summarize this paragraph.');assert.equal(r.audit.route,'fast-surface');assert.equal(r.audit.modelCalls,1);assert.equal(r.audit.verification,'deterministic-surface');
});
test('unapproved surface changes escalate to review and verification instead of bypassing them',async()=>{
  const stages=[]; const r=await enhance(request('Please summarize this paragraph.'),{providers:[async({stage})=>{
    stages.push(stage);
    if(stage==='rewrite')return JSON.stringify({prompt:'Summarize this paragraph in five bullets.'});
    if(stage==='review')return JSON.stringify({verdict:'revised',prompt:'Summarize this paragraph.',issues:[{kind:'invention',detail:'Removed an unrequested count.'}]});
    return JSON.stringify({verdict:'pass',prompt:null,issues:[]});
  }]});
  assert.deepEqual(stages,['rewrite','review','verify']);assert.equal(r.audit.route,'fast-escalated');assert.equal(r.enhanced,'Summarize this paragraph.');
});
test('presentation hints affect editorial guidance, not the task constraints',async()=>{
  let payload;await enhance(request('Review the complete project requirements and keep the original decisions.'),{providers:[async({stage,input})=>{
    payload=JSON.parse(input);return JSON.stringify(stage==='rewrite'?{prompt:payload.draft}:{verdict:'pass',prompt:null,issues:[]});
  }]});
  assert.equal(payload.presentation.detail,'concise');assert.match(payload.presentation.guidance,/Do not add/);
  assert.equal(adaptivePlan(request('x'.repeat(1300))).presentation.detail,'structured');
});
for(const [status,category,code]of[[502,'connection','NETWORK_SERVICE_ERROR'],[401,'authentication','PROVIDER_AUTH'],[429,'rate-limit','PROVIDER_RATE_LIMIT']])test('HTTP '+status+' is classified without exposing provider response',async()=>{
  const provider=createHttpProvider({baseUrl:'https://example.test/v1',model:'fixture',fetchImpl:async()=>new Response('secret-provider-body',{status})});
  const r=await enhance({...request('Please summarize the paragraph.'),fallback:true},{providers:[provider]});
  assert.equal(r.enhanced,r.original);assert.equal(r.failure.category,category);assert.equal(r.failure.status,status);assert.ok(r.warnings.some(w=>w.code===code));assert.ok(!JSON.stringify(r).includes('secret-provider-body'));
});
test('socket failure is not reported as a content-validation failure',async()=>{
  const r=await enhance({...request('Please summarize this paragraph.'),fallback:true},{providers:[async()=>{throw new TypeError('fetch failed',{cause:{code:'ECONNRESET'}});} ]});
  assert.equal(r.failure.category,'connection');assert.equal(r.failure.retryable,true);assert.equal(r.enhanced,r.original);
});
test('DSH structured failure retains only bounded code/status',async()=>{
  async function* stream(){yield{type:'finish',reason:{kind:'error',failure:{code:'SERVER',status:503,message:'PRIVATE upstream URL'}}};}
  await assert.rejects(()=>collectDshText(stream()),e=>{assert.equal(classifyFailure(e).category,'connection');assert.equal(e.status,503);assert.ok(!e.message.includes('PRIVATE'));return true;});
});
test('invalid rewrite JSON remains a format failure, not a network failure',async()=>{
  let calls=0;const r=await enhance({...request('Clarify this project scope.'),fallback:true},{providers:[async()=>{calls++;return '{';}]});
  assert.equal(calls,2);assert.equal(r.failure.category,'format');assert.equal(r.enhanced,r.original);
});
test('validation failures retain the original and a fidelity classification',async()=>{
  const r=await enhance({...request('Keep 20 words.'),fallback:true},{providers:[async({stage})=>JSON.stringify(stage==='rewrite'?{prompt:'Use 21 words.'}:{verdict:'pass',prompt:null,issues:[]})]});
  assert.equal(r.failure.category,'fidelity');assert.equal(r.enhanced,r.original);
});
test('cancellation is never converted into an ordinary fallback result',async()=>{
  const control=new AbortController();const pending=enhance({...request('Please summarize this paragraph.'),fallback:true},{signal:control.signal,providers:[()=>new Promise(()=>{})]});control.abort();await assert.rejects(()=>pending,e=>e instanceof FusionError&&e.code==='CANCELLED');
});
