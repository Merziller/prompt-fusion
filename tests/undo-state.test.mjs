import test from 'node:test';
import assert from 'node:assert/strict';
import { undoSessionFor, cancelUndoRequest, nativePlainText, detectDocumentEnd, reconcileUndoSession, stageUndo, undoMatches } from '../adapters/dsh/undo-state.mjs';
const draft = (text='old', draftRev=7, extra={}) => ({draft:text,draftRev,phase:'plain',occurrences:[],...extra});
test('one stable native action handle keeps session-owned undo across component remounts',()=>{
  const actions={},other={}; const a=undoSessionFor(actions);
  stageUndo(a,draft(),'new',false);
  assert.equal(undoSessionFor(actions),a);assert.notEqual(undoSessionFor(other),a);
  assert.equal(undoSessionFor(other).backup,null);
});
test('undo transaction exists before the host publishes its update',()=>{
  const session=undoSessionFor({}),before=draft();const staged=stageUndo(session,before,'new',false);
  assert.ok(staged);assert.equal(session.backup.pending,true);assert.deepEqual(staged.span,{start:0,end:3,draftRev:7});
  assert.equal(reconcileUndoSession(session,before),false);assert.ok(session.backup);
  assert.equal(reconcileUndoSession(session,draft('new',8)),true);assert.equal(session.backup.pending,false);assert.equal(undoMatches(session,draft('new',8)),true);
});
test('the same text after unrelated user edit does not regain old undo authority',()=>{
  const session=undoSessionFor({});stageUndo(session,draft(),'new',false);
  reconcileUndoSession(session,draft('new',8));reconcileUndoSession(session,draft('new',10));
  assert.equal(session.backup,null);assert.equal(undoMatches(session,draft('new',10)),false);
});
test('temporary adjudication and its cancellation preserve a matching completed backup',()=>{
  const session=undoSessionFor({});stageUndo(session,draft(),'new',false);reconcileUndoSession(session,draft('new',8));
  reconcileUndoSession(session,draft('new',8,{phase:'adjudicating'}));assert.ok(session.backup);
  reconcileUndoSession(session,draft('new',8,{phase:'claimed'}));assert.ok(session.backup);
  reconcileUndoSession(session,draft('new',8));assert.equal(undoMatches(session,draft('new',8)),true);
});
for (const phase of ['sending','submitting']) test('message/command submission drops previous undo: '+phase,()=>{
  const session=undoSessionFor({});stageUndo(session,draft(),'new',false);reconcileUndoSession(session,draft('new',8));
  reconcileUndoSession(session,draft('new',8,{phase}));assert.equal(session.backup,null);
});
test('stop before application aborts the request without creating an undo transaction',()=>{
  const session=undoSessionFor({});const controller=new AbortController();session.request=controller;session.busy=true;
  cancelUndoRequest(session);assert.equal(controller.signal.aborted,true);assert.equal(session.backup,null);assert.equal(session.busy,false);
});
test('native placeholder sanitization is exact and CR/LF is preserved',()=>{
  assert.equal(nativePlainText('a\r\nb\rc\n\uFFFC\uE100'),'a\r\nb\rc\n');
  const session=undoSessionFor({});const staged=stageUndo(session,draft(),'new\r\nline',false);
  assert.equal(staged.inserted,'new\r\nline');reconcileUndoSession(session,draft('new\r\nline',8));assert.equal(undoMatches(session,draft('new\r\nline',8)),true);
});
test('atomic references collapse to one detect coordinate, and undo deletes only the suffix',()=>{
  const state=draft('Review @notes.md now',11,{occurrences:[{offset:7,length:9,clipboardText:'@notes.md'}]});
  assert.equal(detectDocumentEnd(state),12);
  const session=undoSessionFor({});const staged=stageUndo(session,state,state.draft+'\nClarify it.',true);
  assert.deepEqual(staged.span,{start:12,end:12,draftRev:11});
  assert.equal(staged.backup.start,12);assert.equal(staged.backup.end,24);
  const after={...state,draft:state.draft+'\nClarify it.',draftRev:12};reconcileUndoSession(session,after);assert.equal(undoMatches(session,after),true);
});
test('unsafe or opaque coordinates leave the draft untouched',()=>{
  assert.equal(detectDocumentEnd(draft('> quoted\ntext')),null);
  assert.equal(detectDocumentEnd(draft('text',1,{occurrences:[{offset:1,length:10}]})),null);
  assert.equal(detectDocumentEnd(draft('text',1,{occurrences:[{offset:1,length:2,clipboardText:'NO'}]})),null);
  assert.equal(stageUndo(undoSessionFor({}),draft('old\uFFFC'),'new',false),null);
  assert.equal(stageUndo(undoSessionFor({}),draft(),'old',false),null);
});
