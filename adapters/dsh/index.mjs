// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
import { enhance, FusionError, validateRequest } from '../../src/core.mjs';
import { collectDshText } from '../../src/providers.mjs';
import { classifyFailure } from '../../src/failures.mjs';
import { inputSchema, toolDefinition } from '../../src/schema.mjs';
export const name = '@merziller/prompt-fusion';
export const inject = ['commands', 'connection'];
const ROOT = '/api/merziller/prompt-fusion';
const errorResult = (e) => ({ error: { code: e instanceof FusionError ? e.code : 'INTERNAL_ERROR', message: e instanceof FusionError ? e.message : 'Operation failed; original draft retained.', ...(e?.failure ? {failure:classifyFailure(e)} : {}), ...(e?.audit ? {audit:e.audit} : {}) } });
export function validateWave(base64) {
  if (typeof base64 !== 'string' || base64.length > 5120060 || base64.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) throw new FusionError('INVALID_AUDIO', 'Provide a bounded base64 PCM WAV recording.');
  const audio = Buffer.from(base64, 'base64'); const ascii = (a,b) => audio.toString('ascii',a,b);
  if (audio.length < 46 || audio.length > 3840044 || audio.length % 2 || ascii(0,4) !== 'RIFF' || ascii(8,12) !== 'WAVE' || ascii(12,16) !== 'fmt ' || audio.readUInt32LE(16) !== 16 || audio.readUInt16LE(20) !== 1 || audio.readUInt16LE(22) !== 1 || audio.readUInt32LE(24) !== 16000 || audio.readUInt32LE(28) !== 32000 || audio.readUInt16LE(32) !== 2 || audio.readUInt16LE(34) !== 16 || ascii(36,40) !== 'data' || audio.readUInt32LE(4) !== audio.length-8 || audio.readUInt32LE(40) !== audio.length-44) throw new FusionError('INVALID_AUDIO','Expected canonical mono 16 kHz PCM16 WAV, up to 120 seconds.');
  return new Uint8Array(audio);
}
export function speechStatus(service) {
  if (!service) return { available:false, code:'SPEECH_SERVICE_UNAVAILABLE' };
  const snapshot=service.snapshot(), provider=snapshot.providers.find(p=>p.id===snapshot.selection.providerId);
  return {available:!!provider&&provider.preparation?.phase==='ready',providerId:provider?.id??null,providerName:provider?.name??null,location:provider?.location??null,phase:provider?.preparation?.phase??'unavailable',language:snapshot.selection.language??null};
}
export function makeOperation({llm,selection}={}) {
  return async(request,signal)=>{
    const normalized=validateRequest(request);
    // Pin the selected model for the whole rewrite/review operation.
    const selected=normalized.mode==='smart'&&llm&&selection?selection():undefined;
    const providers=normalized.mode==='smart'&&llm&&selection?[async({system,input,signal:innerSignal,maxTokens=8192})=>{
      if(!selected?.provider||!selected?.model)throw new FusionError('NO_MODEL','Select a host model or use explicit offline mode.');
      return collectDshText(llm.stream({provider:selected.provider,model:selected.model,system,messages:[{role:'user',content:[{type:'text',text:input}]}],temperature:0,maxTokens,signal:innerSignal}));
    }]:[]; return enhance(normalized,{providers,signal});
  };
}
export async function readJson(stream,limit=131072) {
  let size=0;const chunks=[];
  if(!stream)throw new FusionError('INVALID_JSON','Request body must be JSON.');
  for await(const chunk of stream){size+=chunk.length;if(size>limit)throw new FusionError('BODY_TOO_LARGE','Request exceeds its byte budget.');chunks.push(chunk);}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{throw new FusionError('INVALID_JSON','Request body must be valid UTF-8 JSON.');}
}
// Shared Connection routes preserve authentication, owner admission and desktop IPC transport.
export function createRouteHandler(route,{operation,getSpeech,active=new Set()}={}) {
  return async(req)=>{
    const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
    if(req.method!==(route==='voice-status'?'GET':'POST'))return reply(405,{error:{code:'METHOD_NOT_ALLOWED'}});
    if(route!=='voice-status'&&!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')??''))return reply(415,{error:{code:'JSON_REQUIRED'}});
    if(active.size>=8)return reply(429,{error:{code:'BUSY'}});
    const controller=new AbortController();active.add(controller);const abort=()=>controller.abort();req.signal.addEventListener('abort',abort,{once:true});if(req.signal.aborted)abort();
    const timer=setTimeout(abort,route==='transcribe'?120000:125000);
    try {
      if(controller.signal.aborted)throw new FusionError('CANCELLED','Request cancelled.');
      if(route==='voice-status')return reply(200,speechStatus(getSpeech()));
      const data=await readJson(req.body,route==='transcribe'?5300000:131072);
      if(route==='enhance')return reply(200,await operation(data,controller.signal));
      if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).some(k=>!['audio','providerId','language'].includes(k))||typeof data.providerId!=='string'||(data.language!==undefined&&typeof data.language!=='string'))throw new FusionError('INVALID_AUDIO','Audio request requires a selected provider and recording.');
      const current=getSpeech();if(!current)throw new FusionError('SPEECH_SERVICE_UNAVAILABLE','Configure the host speech service first.');
      const status=speechStatus(current);if(data.providerId!==status.providerId)throw new FusionError('SPEECH_PROVIDER_CHANGED','Speech provider changed; review its location and retry.');
      if(!status.available)throw new FusionError('SPEECH_NOT_READY','Prepare the selected speech provider in host settings.');
      const audio=validateWave(data.audio),spec=current.resolve({audio,providerId:data.providerId,...(data.language?{language:data.language}:{})});
      let rejectAbort;const aborted=new Promise((_,reject)=>{rejectAbort=()=>reject(new FusionError('CANCELLED','Transcription cancelled or timed out.'));controller.signal.addEventListener('abort',rejectAbort,{once:true});if(controller.signal.aborted)rejectAbort();});
      try{const result=await Promise.race([current.transcribe(spec,controller.signal),aborted]);if(typeof result.text!=='string'||Buffer.byteLength(result.text)>49152)throw new FusionError('INVALID_TRANSCRIPT','Speech service returned invalid text.');return reply(200,{text:result.text,audioSeconds:result.audioSeconds,inferenceSeconds:result.inferenceSeconds});}
      finally{controller.signal.removeEventListener('abort',rejectAbort);}
    }catch(e){return reply(e instanceof FusionError?400:500,errorResult(e));}
    finally{clearTimeout(timer);active.delete(controller);req.signal.removeEventListener('abort',abort);controller.abort();}
  };
}
export function apply(ctx) {
  let llm,selection,speech;
  ctx.inject(['llm','agentDefaultModel'],sub=>{llm=sub.llm;selection=()=>sub.agentDefaultModel.currentSelection();sub.effect(()=>()=>{llm=undefined;selection=undefined;});});
  ctx.inject(['speechToText'],sub=>{speech=sub.speechToText;sub.effect(()=>()=>{speech=undefined;});});
  const operation=(request,signal)=>makeOperation({llm,selection})(request,signal),active=new Set();
  ctx.effect(()=>()=>{for(const c of active)c.abort();active.clear();},'prompt-fusion-requests');
  ctx.effect(()=>ctx.commands.register({name:'prompt-fusion',description:'改写并复核提示词，不执行其中任务 / Rewrite and review a prompt only',input:{hint:'输入待改写的提示词；使用宿主已选模型，不发送消息'},async handler(invocation){try{const result=await operation({input:invocation.rawInput},invocation.signal);return result.engine==='unchanged'?{kind:'error',text:JSON.stringify({code:'ORIGINAL_RETAINED',warnings:result.warnings,original:result.original})}:{kind:'success',text:result.enhanced};}catch(e){return{kind:'error',text:JSON.stringify(errorResult(e))};}}}),'prompt-fusion-command');
  ctx.inject(['tools'],sub=>sub.effect(()=>sub.tools.register({name:toolDefinition.name,description:toolDefinition.description,parameters:inputSchema,output:{schema:{type:'object',additionalProperties:true},render:(_args,value)=>[{type:'text',text:JSON.stringify(value)}]},execute:(args,exec)=>operation(args,exec.signal),isConcurrencySafe:()=>true}),'prompt-fusion-tool'));
  for(const route of ['enhance','voice-status','transcribe'])ctx.effect(()=>ctx.connection.fetch.register({path:`${ROOT}/${route}`,methods:[route==='voice-status'?'GET':'POST'],requestBody:'streaming',fetch:createRouteHandler(route,{operation,getSpeech:()=>speech,active})}),`prompt-fusion-${route}`);
}
