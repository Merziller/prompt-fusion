// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
// The generated client.js prepends src/browser-voice.mjs inside this factory.
window.__ModuleLoader__.load({ id: '@merziller/prompt-fusion', factory(require) {
  const React = require('react'), h = React.createElement;
  /*__VOICE_SOURCE__*/
  const dictionary = /*__TRANSLATIONS__*/ {};
  const root = '/api/merziller/prompt-fusion';
  const css = '.pf-root{font:inherit;font-size:12px;color:var(--dsw-alias-fg-primary);padding:6px 0;width:100%;min-width:0}.pf-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.pf-root button,.pf-root select,.pf-root textarea,.pf-root input{font:inherit;color:inherit;background:var(--dsw-alias-bg-secondary,transparent);border:1px solid var(--dsw-alias-border-default,currentColor);border-radius:6px;padding:5px 8px;box-sizing:border-box}.pf-root button{cursor:pointer;display:inline-flex;align-items:center;gap:4px}.pf-root button:disabled{opacity:.45;cursor:default}.pf-root button:focus-visible,.pf-root select:focus-visible,.pf-root textarea:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,currentColor);outline-offset:2px}.pf-root label{display:inline-flex;gap:4px;align-items:center}.pf-root details{width:100%;margin-top:6px}.pf-root summary{cursor:pointer}.pf-box{border:1px solid var(--dsw-alias-border-default,currentColor);border-radius:8px;padding:10px;margin-top:8px}.pf-root textarea{width:100%;resize:vertical;min-height:64px;margin:6px 0;line-height:1.5}.pf-root textarea.pf-preview{min-height:150px;max-height:300px}.pf-note{color:var(--dsw-alias-fg-secondary);line-height:1.5;margin:6px 0;overflow-wrap:anywhere}.pf-status{white-space:pre-wrap;overflow-wrap:anywhere}.pf-root input[type=checkbox]{margin:0}.pf-title{font-weight:600}.pf-spacer{flex:1}';
  const icon = (kind) => h('svg', { width: 15, height: 15, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true }, h('path', { d: kind === 'mic' ? 'M7 4a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0V4zM4 9v1a6 6 0 0 0 12 0V9M10 16v3M7 19h6' : 'M4 16l2-5L15 2l3 3-9 9-5 2zM12 5l3 3M2 3h4M4 1v4' }));
  async function request(path, body, signal) {
    const response = await fetch(root + '/' + path, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', headers: body === undefined ? {} : { 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal });
    const data = await response.json(); if (!response.ok) throw new Error(data?.error?.code ?? 'REQUEST_FAILED'); return data;
  }
  function Factory({ useInput, inputActions }, t) {
    if (typeof useInput !== 'function' || !inputActions?.captureInsertion || !inputActions?.insertText) return h('div', { className: 'pf-note', role: 'status' }, t('hostUnsupported'));
    return h(Panel, { useInput, inputActions, t });
  }
  function Panel({ useInput, inputActions, t }) {
    const state = useInput((s) => s), live = React.useRef(state); live.current = state;
    const [mode, setMode] = React.useState('standard'), [domain, setDomain] = React.useState('auto'), [intensity, setIntensity] = React.useState('standard');
    const [phase, setPhase] = React.useState('idle'), [preview, setPreview] = React.useState(null), [status, setStatus] = React.useState(''), [backup, setBackup] = React.useState(null);
    const [useContext, setUseContext] = React.useState(false), [context, setContext] = React.useState(''), [useMemory, setUseMemory] = React.useState(false), [voice, setVoice] = React.useState(false), [words, setWords] = React.useState('{}');
    const [speech, setSpeech] = React.useState(null), [transcript, setTranscript] = React.useState(null), [silenceMs, setSilenceMs] = React.useState(2000), [hotkeys, setHotkeys] = React.useState(false);
    const controller = React.useRef(null), recorder = React.useRef(null), previous = React.useRef(''), generation = React.useRef(0), voiceSpan = React.useRef(null);
    const frozen = state.phase !== 'plain', busy = phase !== 'idle';
    const cancel = () => { generation.current++; controller.current?.abort(); recorder.current?.cancel(); recorder.current = null; controller.current = null; setPhase('idle'); };
    React.useEffect(() => { setPreview(null); setBackup(null); setTranscript(null); previous.current = ''; return () => { generation.current++; controller.current?.abort(); recorder.current?.cancel(); previous.current = ''; }; }, [inputActions]);
    React.useEffect(() => { if (state.phase === 'sending' || state.phase === 'submitting' || !state.draft) { previous.current = ''; setBackup(null); setPreview(null); if (state.phase !== 'plain') cancel(); } }, [state.phase, !!state.draft]);
    React.useEffect(() => { const abort = new AbortController(); request('voice-status', undefined, abort.signal).then(setSpeech, () => setSpeech({ available: false })); return () => abort.abort(); }, [inputActions]);
    const run = async () => {
      if (live.current.phase !== 'plain' || !live.current.draft.trim() || busy) return;
      const before = live.current.draft, revision = live.current.draftRev;
      let dict; try { dict = JSON.parse(words); } catch { setStatus(t('dictionaryInvalid')); return; }
      cancel(); const id = ++generation.current, c = new AbortController(); controller.current = c; setPhase('enhancing'); setStatus(''); setPreview(null);
      try {
        const data = await request('enhance', { input: before, mode, domain, intensity, voice, dictionary: dict, useContext, ...(useContext && context ? { context: [{ label: 'User reference', text: context }] } : {}), useMemory, ...(useMemory && previous.current ? { previousDraft: previous.current } : {}) }, c.signal);
        if (id !== generation.current) return;
        setPreview({ ...data, draftRev: revision }); setStatus(data.warnings.map((w) => w.code).join(', '));
      } catch (e) { if (id === generation.current) setStatus(e.name === 'AbortError' ? t('cancelled') : e.message); }
      finally { if (id === generation.current) { setPhase('idle'); controller.current = null; } }
    };
    const apply = () => {
      if (!preview || live.current.phase !== 'plain' || live.current.draft !== preview.original || live.current.draftRev !== preview.draftRev) { setStatus(t('stale')); return; }
      const span = inputActions.captureInsertion();
      if (span.start !== preview.original.length || span.end !== span.start || span.draftRev !== preview.draftRev) { setStatus(t('caretEnd')); return; }
      const suffix = preview.enhanced.slice(preview.original.length);
      if (!suffix) { setStatus(t('unchanged')); return; }
      if (!inputActions.insertText(suffix, span)) { setStatus(t('stale')); return; }
      previous.current = useMemory ? preview.original : '';
      setBackup({ before: preview.original, after: preview.enhanced, offset: span.start }); setPreview(null); setStatus(t('applied'));
    };
    const undo = () => {
      if (!backup || live.current.phase !== 'plain' || live.current.draft !== backup.after) { setStatus(t('stale')); return; }
      if (!inputActions.insertText('', { start: backup.offset, end: backup.after.length, draftRev: live.current.draftRev })) { setStatus(t('stale')); return; }
      setBackup(null); setStatus(t('restored'));
    };
    const startVoice = async () => {
      if (busy || live.current.phase !== 'plain') return;
      cancel(); const id = ++generation.current, c = new AbortController(); controller.current = c; voiceSpan.current = inputActions.captureInsertion(); setStatus(''); setTranscript(null); setPhase('recording');
      try {
        const info = await request('voice-status', undefined, c.signal); if (id !== generation.current) return; setSpeech(info);
        if (!info.available) throw new Error(info.code ?? 'SPEECH_NOT_READY');
        // Bind to the provider whose locality was shown before the microphone action.
        if (!speech || info.providerId !== speech.providerId || info.location !== speech.location) throw new Error('SPEECH_PROVIDER_CHANGED');
        const capture = await startVoiceCapture({ signal: c.signal, silenceMs }); if (id !== generation.current) { capture.cancel(); return; } recorder.current = capture;
        const audio = await capture.done; recorder.current = null; if (id !== generation.current) return; setPhase('transcribing');
        let binary = ''; for (let at = 0; at < audio.length; at += 16384) binary += String.fromCharCode(...audio.subarray(at, at + 16384));
        const data = await request('transcribe', { audio: btoa(binary), providerId: info.providerId, ...(info.language ? { language: info.language } : {}) }, c.signal);
        if (id === generation.current) { setTranscript(data.text); setStatus(t('transcriptReview')); }
      } catch (e) { if (id === generation.current) setStatus(e.name === 'AbortError' ? t('cancelled') : e.message); }
      finally { if (id === generation.current) { setPhase('idle'); controller.current = null; } }
    };
    React.useEffect(() => { if (!hotkeys) return; const listener = (e) => { if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.repeat && ['KeyP', 'KeyV'].includes(e.code)) { e.preventDefault(); if (e.code === 'KeyP') void run(); else if (phase === 'recording') recorder.current?.stop(); else void startVoice(); } }; window.addEventListener('keydown', listener); return () => window.removeEventListener('keydown', listener); }, [hotkeys, mode, domain, intensity, useContext, context, useMemory, voice, words, phase, speech, silenceMs]);
    const select = (id, value, setValue, values) => h('label', { key: id }, t(id), h('select', { value, disabled: busy, 'aria-label': t(id), onChange: (e) => setValue(e.target.value) }, values.map((v) => h('option', { key: v, value: v }, t(v)))));
    const check = (id, value, setValue) => h('label', { key: id }, h('input', { type: 'checkbox', checked: value, disabled: busy, onChange: (e) => { setValue(e.target.checked); if (id === 'memory' && !e.target.checked) previous.current = ''; } }), t(id));
    return h('section', { className: 'pf-root', 'aria-label': t('title') }, h('style', null, css),
      h('div', { className: 'pf-row' }, h('span', { className: 'pf-title' }, 'Prompt Fusion'), select('mode', mode, setMode, ['base', 'lite', 'standard', 'smart', 'publish']), select('domain', domain, setDomain, ['auto', 'general', 'code', 'design', 'office', 'collaboration', 'research', 'writing']), select('intensity', intensity, setIntensity, ['light', 'standard', 'deep']),
        h('button', { type: 'button', disabled: frozen || busy || !state.draft.trim(), onMouseDown: (e) => e.preventDefault(), onClick: run }, icon('enhance'), t('preview')),
        h('button', { type: 'button', disabled: frozen || (busy && phase !== 'recording'), onMouseDown: (e) => e.preventDefault(), onClick: () => phase === 'recording' ? recorder.current?.stop() : startVoice() }, icon('mic'), t(phase === 'recording' ? 'stopVoice' : 'voice')),
        busy && h('button', { type: 'button', onClick: cancel }, t('cancel')), backup && h('button', { type: 'button', disabled: frozen || busy || state.draft !== backup.after, onMouseDown: (e) => e.preventDefault(), onClick: undo }, t('undo'))),
      h('div', { className: 'pf-note' }, t('privacy'), speech?.providerId ? ` ${t('speechProvider')}: ${speech.providerName} (${speech.location}, ${speech.phase})` : ` ${t('speechSetup')}`),
      phase !== 'idle' && h('div', { role: 'status' }, t(phase)),
      h('details', null, h('summary', null, t('options')), h('div', { className: 'pf-row' }, check('context', useContext, setUseContext), check('memory', useMemory, setUseMemory), check('voiceCleanup', voice, setVoice), check('hotkeys', hotkeys, setHotkeys)), useContext && h('textarea', { 'aria-label': t('context'), placeholder: t('contextHint'), value: context, maxLength: 8192, disabled: busy, onChange: (e) => setContext(e.target.value) }), h('p', { className: 'pf-note' }, t('memoryHint')), h('label', null, t('silence'), h('select', { value: silenceMs, disabled: busy, onChange: (e) => setSilenceMs(Number(e.target.value)) }, [1000,2000,3000,4000,5000].map((v) => h('option', { key: v, value: v }, `${v / 1000}s`)))), h('label', null, t('dictionary')), h('textarea', { 'aria-label': t('dictionary'), value: words, maxLength: 4096, disabled: busy, onChange: (e) => setWords(e.target.value) }), h('p', { className: 'pf-note' }, t('hotkeyHint'))),
      status && h('div', { role: 'status', className: 'pf-status' }, status),
      transcript !== null && h('div', { className: 'pf-box' }, h('strong', null, t('transcript')), h('textarea', { value: transcript, 'aria-label': t('transcript'), onChange: (e) => setTranscript(e.target.value) }), h('button', { type: 'button', disabled: frozen || busy || !transcript.trim(), onMouseDown: (e) => e.preventDefault(), onClick: () => { if (inputActions.insertText(transcript, voiceSpan.current)) { setTranscript(null); setStatus(t('transcriptInserted')); } else setStatus(t('stale')); } }, t('insertTranscript')), h('button', { type: 'button', onClick: () => setTranscript(null) }, t('discard'))),
      preview && h('div', { className: 'pf-box' }, h('strong', null, t('previewTitle')), h('p', { className: 'pf-note' }, t('previewHint')), h('textarea', { className: 'pf-preview', readOnly: true, value: preview.enhanced, 'aria-label': t('previewTitle') }), h('div', { className: 'pf-row' }, h('button', { type: 'button', disabled: frozen || busy, onMouseDown: (e) => e.preventDefault(), onClick: apply }, t('apply')), h('button', { type: 'button', onClick: async () => { try { await navigator.clipboard.writeText(preview.enhanced); setStatus(t('copied')); } catch { setStatus(t('copyManual')); } } }, t('copy')), h('button', { type: 'button', onClick: () => setPreview(null) }, t('discard'))), h('p', { className: 'pf-note' }, `${preview.engine} · ${preview.ruleIds.join(', ')} · +${preview.changes.appendedCharacters}`), preview.voiceSuggestion !== undefined && h('details', null, h('summary', null, t('voiceSuggestion')), h('textarea', { readOnly: true, value: preview.voiceSuggestion, 'aria-label': t('voiceSuggestion') }))));
  }
  return { inject: ['slots', 'locale'], apply(ctx) { ctx.effect(() => ctx.locale.register('promptFusion', dictionary), 'prompt-fusion-locales'); const t = ctx.locale.bind('promptFusion'); ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({ name: 'conversation.composer.dock', id: 'merziller-prompt-fusion', order: 15 }, (props) => Factory(props, t))); } };
} });
