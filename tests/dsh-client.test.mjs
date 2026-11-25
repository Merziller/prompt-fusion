import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {enhance} from '../src/core.mjs';
// A hook/slot contract fixture, not an assertion of React or native GUI execution.
async function fixture(){
  const slots=[],hooks=[],effects=[];let cursor=0,tree,component,rendering=false,dirty=false;
  let state={draft:'请整理这个开发任务，不指定新技术栈',draftRev:1,phase:'plain'},caret=state.draft.length;
  const h=(type,props,...children)=>({type,props:{...props,children:children.flat(Infinity).filter(x=>x!==false&&x!==null&&x!==undefined)}});
  const expand=n=>{if(!n||typeof n!=='object')return n;if(typeof n.type==='function')return expand(n.type(n.props));return{...n,props:{...n.props,children:n.props.children.map(expand)}};};
  const render=()=>{if(rendering){dirty=true;return;}rendering=true;do{dirty=false;cursor=0;tree=expand(component({useInput:f=>f(state),inputActions:actions}));for(const f of effects.splice(0))f();}while(dirty);rendering=false;};
  const React={createElement:h,useRef:value=>{const i=cursor++;return hooks[i]??(hooks[i]={current:value});},useState:initial=>{const i=cursor++;if(!(i in hooks))hooks[i]=initial;return[hooks[i],value=>{const next=typeof value==='function'?value(hooks[i]):value;if(!Object.is(hooks[i],next)){hooks[i]=next;render();}}];},useEffect:(fn,deps)=>{const i=cursor++,old=hooks[i];if(!old||deps.some((d,j)=>!Object.is(d,old.deps[j]))){hooks[i]={deps};effects.push(()=>{old?.cleanup?.();hooks[i].cleanup=fn();});}}};
  const actions={captureInsertion:()=>({start:caret,end:caret,draftRev:state.draftRev}),insertText:(text,span)=>{if(!span||span.draftRev!==state.draftRev)return false;state={...state,draft:state.draft.slice(0,span.start)+text+state.draft.slice(span.end),draftRev:state.draftRev+1};caret=span.start+text.length;render();return true;}};
  let plugin;const dictionaries={};const sandbox={window:{__ModuleLoader__:{load:({id,factory})=>{assert.equal(id,'@merziller/prompt-fusion');plugin=factory(name=>{assert.equal(name,'react');return React;});}},addEventListener(){},removeEventListener(){}},navigator:{clipboard:{writeText:async()=>{}}},AbortController,console,TextEncoder,TextDecoder,setTimeout,clearTimeout,fetch:async(url,options)=>{if(url.endsWith('voice-status'))return{ok:true,json:async()=>({available:false})};return{ok:true,json:()=>enhance(JSON.parse(options.body))};}};
  vm.runInNewContext(await readFile(new URL('../adapters/dsh/client.js',import.meta.url),'utf8'),sandbox);
  const ctx={effect:fn=>fn(),locale:{register:(key,value)=>{dictionaries[key]=value;return()=>{};},bind:key=>name=>dictionaries[key].zh[name]},slots:{inject:(_name,fn)=>fn(),register:(_meta,value)=>{component=value;slots.push(_meta);return()=>{};}}};plugin.apply(ctx);render();await Promise.resolve();
  const nodes=(n=tree)=>n&&typeof n==='object'?[n,...n.props.children.flatMap(x=>nodes(x))]:[];
  const text=n=>typeof n==='string'?n:n?.props?.children.map(text).join('')??'';
  const button=label=>{const n=nodes().find(n=>n.type==='button'&&text(n).includes(label));assert.ok(n,'button '+label);return n;};
  return{slots,button,nodes,get state(){return state;},edit(text){state={...state,draft:text,draftRev:state.draftRev+1};caret=text.length;render();},caret(value){caret=value;},async click(label){const b=button(label);assert.ok(!b.props.disabled,'enabled '+label);await b.props.onClick();},dispose(){for(const x of hooks)x?.cleanup?.();}};
}
test('DSH client slot, preview, native append and guarded undo',async()=>{const f=await fixture();try{assert.equal(f.slots[0].name,'conversation.composer.dock');const before=f.state.draft;await f.click('增强预览');assert.equal(f.state.draft,before);assert.ok(f.nodes().some(n=>n.type==='textarea'&&n.props.readOnly));await f.click('确认加入草稿');assert.ok(f.state.draft.startsWith(before));assert.notEqual(f.state.draft,before);await f.click('撤销');assert.equal(f.state.draft,before);}finally{f.dispose();}});
test('DSH client stale draft and caret mismatch do not overwrite',async()=>{const f=await fixture();try{await f.click('增强预览');f.edit('新的手工编辑');await f.click('确认加入草稿');assert.equal(f.state.draft,'新的手工编辑');await f.click('增强预览');f.caret(0);await f.click('确认加入草稿');assert.equal(f.state.draft,'新的手工编辑');}finally{f.dispose();}});
