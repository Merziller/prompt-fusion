// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
// Session-owned, memory-only transaction state. No DOM/private editor access.
const undoSessions = new WeakMap();
export function undoSessionFor(actions) {
  let session = undoSessions.get(actions);
  if (!session) { session = { backup:null, busy:false, message:'', request:null, generation:0, listeners:new Set() }; undoSessions.set(actions, session); }
  return session;
}
export function emitUndoSession(session) { for (const listener of [...session.listeners]) listener(); }
export function cancelUndoRequest(session) {
  session.generation++; session.request?.abort(); session.request = null; session.busy = false;
}
// Match the host's insertAsyncText sanitizer exactly. Lexical 0.49 keeps CR/LF.
export function nativePlainText(text) { return text.replace(/[\uE100-\uE11D\uFFFC]/gu, ''); }
export function detectDocumentEnd(state) {
  if (typeof state.draft !== 'string') return null;
  // Public InputState omits atomic quote ranges. Markdown blockquotes are also
  // conservatively left untouched because their text alone cannot prove node kind.
  if (/^\s*>/mu.test(state.draft)) return null;
  if (state.occurrences !== undefined && !Array.isArray(state.occurrences)) return null;
  const occurrences = [...(state.occurrences ?? [])].sort((a,b)=>a.offset-b.offset);
  let previousEnd = 0, end = state.draft.length;
  for (const item of occurrences) {
    if (!Number.isSafeInteger(item.offset) || !Number.isSafeInteger(item.length) || item.length < 1 || item.offset < previousEnd || item.offset + item.length > state.draft.length || (typeof item.clipboardText === 'string' && state.draft.slice(item.offset,item.offset+item.length)!==item.clipboardText)) return null;
    previousEnd = item.offset + item.length; end -= item.length - 1;
  }
  return end;
}
export function reconcileUndoSession(session, state, now = Date.now()) {
  let changed = false;
  // A completed notice belongs to the draft that produced it, not future edits.
  if (session.observedRev !== undefined && (session.observedRev !== state.draftRev || session.observedDraft !== state.draft) && !session.request && !session.busy && session.message) { session.message = ''; changed = true; }
  session.observedRev = state.draftRev; session.observedDraft = state.draft;
  if (state.phase !== 'plain' && (session.request || session.busy)) { cancelUndoRequest(session); session.message = 'interrupted'; changed = true; }
  // A temporary command claim/adjudication is not a sent message. Keep its
  // still-matching backup so cancelling that state can reveal Undo again.
  if (!state.draft || state.phase === 'sending' || state.phase === 'submitting') {
    changed ||= Boolean(session.backup); session.backup = null; return changed;
  }
  const b = session.backup; if (!b) return changed;
  if (b.pending && state.draftRev === b.beforeRev && state.draft === b.before) {
    if (now >= b.expiresAt) { session.backup = null; session.message = 'applyUnconfirmed'; return true; }
    return changed;
  }
  if (b.pending && state.draftRev === b.afterRev && state.draft === b.after) { b.pending = false; return true; }
  if (state.draftRev !== b.afterRev || state.draft !== b.after) { session.backup = null; return true; }
  return changed;
}
export function stageUndo(session, state, after, appendOnly, now = Date.now()) {
  const end = detectDocumentEnd(state);
  if (end === null || state.phase !== 'plain' || !Number.isSafeInteger(state.draftRev) || typeof after !== 'string') return null;
  if (appendOnly && !after.startsWith(state.draft)) return null;
  // Restoring a pre-existing reserved marker via the plain-text API would lose
  // that marker; don't create a transaction promising a non-exact restoration.
  if (!appendOnly && nativePlainText(state.draft) !== state.draft) return null;
  const inserted = nativePlainText(appendOnly ? after.slice(state.draft.length) : after);
  const expected = appendOnly ? state.draft + inserted : inserted;
  if (expected === state.draft) return null;
  const backup = { before:state.draft, beforeRev:state.draftRev, after:expected, afterRev:state.draftRev + 1, appendOnly, pending:true, expiresAt:now + 5000, start:appendOnly?end:0, end:appendOnly?end+inserted.length:inserted.length };
  session.backup = backup;
  return { inserted, span:{start:appendOnly?end:0,end,draftRev:state.draftRev}, backup };
}
export function undoMatches(session, state) {
  const b = session.backup;
  return Boolean(b && state.phase === 'plain' && state.draft === b.after && state.draftRev === b.afterRev);
}
