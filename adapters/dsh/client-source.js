// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
window.__ModuleLoader__.load({ id: '@merziller/prompt-fusion', factory(require) {
  const React = require('react'), h = React.createElement;
  const dictionary = /*__TRANSLATIONS__*/ {};
  const css = '.pf-action{display:inline-flex;align-items:center;position:relative;font:inherit}.pf-action button{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 8px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-fg-secondary,inherit);font:inherit;font-size:12px;white-space:nowrap;cursor:pointer;transition:background .15s,color .15s}.pf-action button:hover{background:var(--dsw-alias-bg-secondary,rgba(127,127,127,.1));color:var(--dsw-alias-fg-primary,inherit)}.pf-action button:disabled{opacity:.35;cursor:default}.pf-action button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,currentColor);outline-offset:2px}.pf-action svg{flex:none}.pf-action [aria-busy=true] svg{animation:pf-spin 1.6s linear infinite}.pf-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@keyframes pf-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.pf-action [aria-busy=true] svg{animation:none}}';
  const icon = () => h('svg', { width:15, height:15, viewBox:'0 0 20 20', fill:'none', stroke:'currentColor', strokeWidth:1.5, 'aria-hidden':true }, h('path', { d:'m10 2 1.9 5.8L18 10l-6.1 2.2L10 18l-1.9-5.8L2 10l6.1-2.2L10 2zM16 1v4M14 3h4' }));
  /*__UNDO_STATE__*/
  function Control({ useInput, inputActions, t }) {
    const state = useInput(s => s), live = React.useRef(state); live.current = state;
    const session = undoSessionFor(inputActions), [, redraw] = React.useState(0);
    const publish = () => emitUndoSession(session);
    const setMessage = key => { session.message = key; publish(); };
    React.useEffect(() => {
      const update = () => redraw(value => value + 1); session.listeners.add(update);
      reconcileUndoSession(session, live.current); update();
      return () => { session.listeners.delete(update); if (session.request) { cancelUndoRequest(session); publish(); } };
    }, [session]);
    React.useEffect(() => { if (reconcileUndoSession(session, state)) publish(); }, [session, state.phase, state.draft, state.draftRev]);
    const pendingBackup = session.backup?.pending ? session.backup : null;
    React.useEffect(() => {
      if (!pendingBackup) return;
      const timer = setTimeout(() => {
        if (session.backup === pendingBackup && reconcileUndoSession(session, live.current)) publish();
      }, Math.max(0, pendingBackup.expiresAt - Date.now()));
      return () => clearTimeout(timer);
    }, [session, pendingBackup]);
    const run = async () => {
      const current = live.current;
      if (current.phase !== 'plain' || !current.draft.trim()) return;
      reconcileUndoSession(session, current);
      if (undoMatches(session, current)) {
        const backup = session.backup;
        const span = { start:backup.start, end:backup.end, draftRev:current.draftRev };
        // Clear before the native editor publishes the replacement to subscribers.
        session.backup = null;
        if (inputActions.insertText(backup.appendOnly ? '' : backup.before, span)) setMessage('restored');
        else { session.backup = backup; setMessage('stale'); }
        return;
      }
      if (session.request || session.busy) { cancelUndoRequest(session); setMessage('cancelled'); return; }
      const before = current.draft, revision = current.draftRev;
      // Atomic native reference chips retain their exact positions: append only.
      const appendOnly = Array.isArray(current.occurrences) && current.occurrences.length > 0;
      if (detectDocumentEnd(current) === null) { setMessage('projectionUnavailable'); return; }
      const id = ++session.generation, controller = new AbortController(); session.request = controller;
      session.message = ''; session.busy = true; publish();
      try {
        const response = await fetch('/api/merziller/prompt-fusion/enhance', {
          method:'POST', credentials:'same-origin', cache:'no-store', headers:{'content-type':'application/json'},
          body:JSON.stringify({ input:before, mode:'smart', domain:'auto', intensity:'deep', layout:appendOnly ? 'append' : 'structured', useContext:false, useMemory:false, fallback:true }), signal:controller.signal
        });
        let result;
        try { result = await response.json(); }
        catch { const error = new Error('INVALID_RESPONSE'); error.code = 'INVALID_RESPONSE'; error.status = response.status; throw error; }
        if (!response.ok) { const error = new Error('REQUEST_FAILED'); error.code = typeof result?.error?.code === 'string' ? result.error.code : 'REQUEST_FAILED'; error.status = response.status; throw error; }
        if (id !== session.generation) return;
        if (live.current.phase !== 'plain' || live.current.draft !== before || live.current.draftRev !== revision) { setMessage('stale'); return; }
        if (typeof result.enhanced !== 'string' || !result.enhanced.trim() || result.original !== before || (appendOnly && !result.enhanced.startsWith(before))) throw new Error('INVALID_RESULT');
        if (result.enhanced === before) { setMessage(result.engine === 'unchanged' ? (result.failure?.category === 'connection' || result.warnings?.some(w => w.code === 'NETWORK_SERVICE_ERROR') ? 'networkRetained' : result.failure?.category === 'timeout' ? 'timeoutRetained' : result.failure?.category === 'authentication' ? 'authRetained' : result.failure?.category === 'rate-limit' ? 'rateRetained' : result.warnings?.some(w => w.code === 'MODEL_REQUIRED' || w.code === 'NO_MODEL') ? 'needsModel' : 'retained') : 'unchanged'); return; }
        const staged = stageUndo(session, current, result.enhanced, appendOnly);
        if (!staged) { setMessage('projectionUnavailable'); return; }
        // Register the transaction before a synchronous editor update can re-render us.
        session.request = null; session.busy = false;
        if (!inputActions.insertText(staged.inserted, staged.span)) { session.backup = null; setMessage('stale'); return; }
        reconcileUndoSession(session, live.current);
        setMessage('applied');
      } catch (error) {
        if (id === session.generation) { const code = error?.code; const key = error?.name === 'AbortError' ? 'cancelled' : code === 'PROVIDER_AUTH' ? 'authRetained' : code === 'PROVIDER_RATE_LIMIT' ? 'rateRetained' : code === 'TIMEOUT' || error?.status === 504 || error?.status === 408 ? 'timeoutRetained' : error?.status === 401 || error?.status === 403 ? 'sessionRetained' : code === 'NETWORK_SERVICE_ERROR' || error?.name === 'TypeError' || error?.status >= 500 ? 'networkRetained' : 'failed'; setMessage(key); }
      } finally {
        if (id === session.generation) { session.request = null; session.busy = false; publish(); }
      }
    };
    const undoable = undoMatches(session, state);
    const applying = session.backup?.pending && !undoable;
    const busy = session.busy;
    const message = session.message ? t(session.message) : '';
    const label = undoable ? t('undo') : busy ? t('cancel') : applying ? t('applying') : t('enhance');
    const title = undoable ? t('undoHint') : busy ? t('busyHint') : applying ? t('applyingHint') : message || t('hint');
    return h('span', { className:'pf-action' }, h('style', null, css),
      h('button', { type:'button', title, 'aria-label':label, 'aria-busy':busy, disabled:state.phase !== 'plain' || !state.draft.trim() || applying, onMouseDown:event => event.preventDefault(), onClick:run }, icon(), label),
      h('span', { className:'pf-sr', role:'status', 'aria-live':'polite' }, message));
  }
  return { inject:['slots','locale'], apply(ctx) {
    ctx.effect(() => ctx.locale.register('promptFusion', dictionary), 'prompt-fusion-locales');
    const t = ctx.locale.bind('promptFusion');
    ctx.slots.inject('conversation.input.right', () => ctx.slots.register({ name:'conversation.input.right', id:'merziller-prompt-fusion', order:15 }, props => {
      if (typeof props.useInput !== 'function' || !props.inputActions?.insertText) return null;
      return h(Control, { ...props, t });
    }));
  } };
} });
