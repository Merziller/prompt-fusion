import test from 'node:test';
import assert from 'node:assert/strict';
import { undoSessionFor, stageUndo, reconcileUndoSession, undoMatches } from '../adapters/dsh/undo-state.mjs';
const before = { draft:'Original', draftRev:7, phase:'plain', occurrences:[] };
test('an unconfirmed editor transaction expires at its bounded deadline', () => {
  const session=undoSessionFor({});
  stageUndo(session,before,'Enhanced',false,1000);
  assert.equal(reconcileUndoSession(session,before,5999),false);
  assert.ok(session.backup);
  assert.equal(reconcileUndoSession(session,before,6000),true);
  assert.equal(session.backup,null);
  assert.equal(session.message,'applyUnconfirmed');
});
test('a confirmed editor transaction does not expire with its pending timer', () => {
  const session=undoSessionFor({});
  stageUndo(session,before,'Enhanced',false,1000);
  const after={...before,draft:'Enhanced',draftRev:8};
  reconcileUndoSession(session,after,1500);
  assert.equal(undoMatches(session,after),true);
  reconcileUndoSession(session,after,8000);
  assert.equal(undoMatches(session,after),true);
});
