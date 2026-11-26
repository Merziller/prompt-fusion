// Optional independent regression fixture; no product runtime dependencies.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import path from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--deps-root')throw Error('Usage: node scripts/undo-react-lexical-smoke.mjs --deps-root OPTIONAL_TEST_DEPENDENCIES_DIRECTORY');
const depsRoot=path.resolve(args[1]);
const require=createRequire(path.join(depsRoot,'package.json')), React=require('react'), Renderer=require('react-test-renderer');
if(require('react/package.json').version!=='18.2.0'||require('react-test-renderer/package.json').version!=='18.2.0')throw Error('This reproducible fixture requires React/react-test-renderer 18.2.0');
const {act}=Renderer;
const {createHeadlessEditor}=require('@lexical/headless');
const {$getRoot,$createParagraphNode,$createTextNode,$createRangeSelection,$setSelection,$isTextNode}=require('lexical');
const {registerPlainText}=require('@lexical/plain-text');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const labels=JSON.parse(await readFile(path.join(root,'locale/zh.json'),'utf8')).ui;
const oldSource=await readFile(path.join(root,'evals/ui-history/v0.2.0-client-source.js'),'utf8');
const currentSource=await readFile(path.join(root,'adapters/dsh/client.js'),'utf8');
const historicalManifest=JSON.parse(await readFile(path.join(root,'evals/ui-history/manifest.json'),'utf8'));
assert.equal(createHash('sha256').update(oldSource).digest('hex'),historicalManifest.sha256);
assert.equal(JSON.parse(await readFile(path.join(depsRoot,'node_modules/lexical/package.json'),'utf8')).version,'0.49.0');
const original='请整理这个任务';
const enriched=original+'\n保留待确认的条件。';
// Uses real React 18.2 lifecycles and real Lexical 0.49 text replacement.
// The Session/slot projection is a contract fixture, not a running DSH GUI.
async function fixture(source,{deferred=false,hold=false,reference=false}={}){
  const listeners=new Set(), requests=[], pending=[], referenceText='@notes.md';
  let state={draft:original,draftRev:1,phase:'plain',occurrences:[]}, component, tree, key=0, queued=null;
  const editor=createHeadlessEditor({namespace:'undo-contract',onError:e=>{throw e;}});
  const unregister=registerPlainText(editor);
  editor.update(()=>{
    const p=$createParagraphNode();p.append($createTextNode(reference?'Review ':original));
    if(reference)p.append($createTextNode('\uFFFC').setMode('token'),$createTextNode(' now'));
    $getRoot().append(p);
  },{discrete:true});
  const projection=()=>editor.getEditorState().read(()=>{
    let detect='',clipboard='',occurrences=[];
    const visit=node=>{if($isTextNode(node)){const text=node.getTextContent();detect+=text;if(node.getMode()==='token'&&text==='\uFFFC'){occurrences.push({occurrenceId:node.getKey(),offset:clipboard.length,length:referenceText.length,clipboardText:referenceText});clipboard+=referenceText;}else clipboard+=text;}else for(const child of node.getChildren?.()??[])visit(child);};
    const children=$getRoot().getChildren();children.forEach((node,index)=>{if(index){detect+='\n\n';clipboard+='\n\n';}visit(node);});
    return {detect,clipboard,occurrences};
  });
  const emit=()=>{for(const fn of [...listeners])fn();};
  const publishEditor=()=>{const p=projection();state={...state,draft:p.clipboard,occurrences:p.occurrences,draftRev:state.draftRev+1};emit();};
  if(reference){const p=projection();state={...state,draft:p.clipboard,occurrences:p.occurrences};}
  const points=()=>editor.getEditorState().read(()=>{
    const leaves=[];const visit=node=>{if($isTextNode(node))leaves.push({key:node.getKey(),length:node.getTextContent().length});else for(const child of node.getChildren?.()??[])visit(child);};visit($getRoot());return leaves;
  });
  const actions={insertText(text,span){
    const projected=projection();
    if(span.draftRev!==state.draftRev||span.start<0||span.end<span.start||span.end>projected.detect.length)return false;
    const leaves=points(),point=offset=>{for(let i=0;i<leaves.length;i++){if(offset<=leaves[i].length||i===leaves.length-1)return [leaves[i].key,offset];offset-=leaves[i].length;}throw Error('No text leaf');};
    const a=point(span.start),b=point(span.end);
    editor.update(()=>{const selection=$createRangeSelection();selection.anchor.set(a[0],a[1],'text');selection.focus.set(b[0],b[1],'text');$setSelection(selection);selection.insertText(text.replace(/[\uE100-\uE11D\uFFFC]/gu,''));},{discrete:true});
    if(deferred)queued=publishEditor;else publishEditor();return true;
  }};
  const sandbox={window:{__ModuleLoader__:{load:({factory})=>{const plugin=factory(name=>{assert.equal(name,'react');return React;});plugin.apply({effect:f=>f(),locale:{register:()=>()=>{},bind:()=>name=>labels[name]},slots:{inject:(_n,f)=>f(),register:(_m,c)=>{component=c;}}});}}},AbortController,console,setTimeout,clearTimeout,fetch:async(_url,options)=>{const input=JSON.parse(options.body).input;requests.push(input);if(hold)await new Promise(resolve=>pending.push(resolve));return{ok:true,json:async()=>({original:input,enhanced:input+'\n保留待确认的条件。',engine:'model-rewrite'})};}};
  vm.runInNewContext(source,sandbox);
  function useInput(select){const snapshot=React.useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn);},()=>state,()=>state);return select(snapshot);}
  const mount=()=>React.createElement(component,{key,useInput,inputActions:actions});
  await act(async()=>{tree=Renderer.create(mount());});
  const button=()=>tree.root.findByType('button');
  const label=()=>button().children.filter(x=>typeof x==='string').join('');
  return {requests,label,projection,get state(){return state;},async click(){await act(async()=>{await button().props.onClick();});},async start(){let promise;await act(async()=>{promise=button().props.onClick();});return {promise};},async release(){await act(async()=>{pending.splice(0).forEach(f=>f());await Promise.resolve();});},async remount(){await act(async()=>{key++;tree.update(mount());});},async phase(phase){await act(async()=>{state={...state,phase};emit();});},async flush(){await act(async()=>{queued?.();queued=null;});},async dispose(){await act(async()=>{tree.unmount();});unregister();}};
}
const observations=[];
for(const [version,source] of [['v0.2.0',oldSource],['fixed',currentSource]]){
  const f=await fixture(source);const before=f.state.draft;await f.click();assert.equal(f.state.draft,enriched);assert.equal(f.label(),labels.undo);
  await f.remount();const afterRemount=f.label();
  if(version==='v0.2.0')assert.equal(afterRemount,labels.enhance);else{assert.equal(afterRemount,labels.undo);await f.click();assert.equal(f.state.draft,before);}
  observations.push({case:'remount-after-application',version,draftPreserved:true,button:afterRemount,expectedUndo:version==='fixed'});await f.dispose();
  const p=await fixture(source);await p.click();await p.phase('adjudicating');await p.phase('plain');
  if(version==='v0.2.0')assert.equal(p.label(),labels.enhance);else assert.equal(p.label(),labels.undo);
  observations.push({case:'cancel-temporary-host-state',version,button:p.label(),expectedUndo:version==='fixed'});await p.dispose();
  const r=await fixture(source,{reference:true});const rBefore=r.state.draft;await r.click();
  if(version==='v0.2.0'){assert.equal(r.state.draft,rBefore);assert.equal(r.label(),labels.enhance);}else{assert.equal(r.state.draft,rBefore+'\n保留待确认的条件。');assert.equal(r.label(),labels.undo);await r.click();assert.equal(r.state.draft,rBefore);assert.equal(r.state.occurrences.length,1);}
  observations.push({case:'native-reference-detect-coordinates',version,button:r.label(),roundTrip:version==='fixed'});await r.dispose();
}
{
  const f=await fixture(currentSource,{deferred:true});const before=f.state.draft;await f.click();assert.equal(f.state.draft,before);assert.equal(f.label(),labels.applying);await f.flush();assert.equal(f.label(),labels.undo);await f.click();await f.flush();assert.equal(f.state.draft,before);observations.push({case:'deferred-editor-projection',version:'fixed',roundTrip:true});await f.dispose();
}
{
  const f=await fixture(currentSource,{hold:true});const before=f.state.draft;const {promise}=await f.start();assert.equal(f.label(),labels.cancel);await f.click();await f.release();await promise;assert.equal(f.state.draft,before);assert.equal(f.label(),labels.enhance);observations.push({case:'stop-before-application',version:'fixed',unchanged:true,noUndoCorrect:true});await f.dispose();
}
const report={at:new Date().toISOString(),status:'PASS',react:require('react/package.json').version,lexical:JSON.parse(await readFile(path.join(depsRoot,'node_modules/lexical/package.json'),'utf8')).version,hostGuiTested:false,scope:'Real React lifecycle and Lexical text replacement with explicit DSH public Session/slot contract fixture; not authenticated GUI evidence.',currentClientSha256:createHash('sha256').update(currentSource).digest('hex'),historicalClient:{commit:'0fdf97f78b58e46643bc856d3529e7cc144c8de4',sha256:createHash('sha256').update(oldSource).digest('hex')},observations};
await writeFile(path.join(root,'output/undo-react-lexical-verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
