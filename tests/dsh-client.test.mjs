import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { enhance } from '../src/core.mjs';
// Minimal hook/slot contract fixture. This is not a native GUI execution claim.
async function fixture({ hold = false, chips = [] } = {}) {
  const slots = [], hooks = [], effects = [], requests = [], pending = [];
  let cursor = 0, tree, component, rendering = false, dirty = false;
  let state = { draft:'请整理这个开发任务，不指定新技术栈', draftRev:1, phase:'plain', occurrences:chips };
  const h = (type, props, ...children) => ({ type, props:{ ...props, children:children.flat(Infinity).filter(x => x !== false && x !== null && x !== undefined) } });
  const expand = n => {
    if (!n || typeof n !== 'object') return n;
    if (typeof n.type === 'function') return expand(n.type(n.props));
    return { ...n, props:{ ...n.props, children:n.props.children.map(expand) } };
  };
  const render = () => {
    if (rendering) { dirty = true; return; }
    rendering = true;
    do { dirty = false; cursor = 0; tree = expand(component({ useInput:f => f(state), inputActions:actions })); for (const f of effects.splice(0)) f(); } while (dirty);
    rendering = false;
  };
  const React = {
    createElement:h,
    useRef:value => { const i = cursor++; return hooks[i] ?? (hooks[i] = { current:value }); },
    useState:initial => { const i = cursor++; if (!(i in hooks)) hooks[i] = initial; return [hooks[i], value => { const next = typeof value === 'function' ? value(hooks[i]) : value; if (!Object.is(hooks[i], next)) { hooks[i] = next; render(); } }]; },
    useEffect:(fn, deps) => { const i = cursor++, old = hooks[i]; if (!old || deps.some((d, j) => !Object.is(d, old.deps[j]))) { hooks[i] = { deps }; effects.push(() => { old?.cleanup?.(); hooks[i].cleanup = fn(); }); } }
  };
  let actions = { insertText:(text, span) => {
    if (!span || span.draftRev !== state.draftRev) return false;
    state = { ...state, draft:state.draft.slice(0, span.start) + text + state.draft.slice(span.end), draftRev:state.draftRev + 1 };
    render(); return true;
  } };
  let plugin; const dictionaries = {};
  const sandbox = {
    window:{ __ModuleLoader__:{ load:({ id, factory }) => { assert.equal(id, '@merziller/prompt-fusion'); plugin = factory(name => { assert.equal(name, 'react'); return React; }); } } },
    AbortController, console,
    fetch:async (url, options) => {
      requests.push({ url, request:JSON.parse(options.body) });
      if (hold) await new Promise(resolve => pending.push(resolve));
      return { ok:true, json:() => enhance(JSON.parse(options.body)) };
    }
  };
  vm.runInNewContext(await readFile(new URL('../adapters/dsh/client.js', import.meta.url), 'utf8'), sandbox);
  const ctx = {
    effect:fn => fn(), locale:{ register:(key, value) => { dictionaries[key] = value; return () => {}; }, bind:key => name => dictionaries[key].zh[name] },
    slots:{ inject:(_name, fn) => fn(), register:(meta, value) => { component = value; slots.push(meta); return () => {}; } }
  };
  plugin.apply(ctx); render();
  const nodes = (n = tree) => n && typeof n === 'object' ? [n, ...n.props.children.flatMap(x => nodes(x))] : [];
  const text = n => typeof n === 'string' ? n : n?.props?.children.map(text).join('') ?? '';
  const button = label => { const found = nodes().find(n => n.type === 'button' && text(n) === label); assert.ok(found, 'button ' + label); return found; };
  return {
    slots, requests, nodes, button, get state() { return state; },
    edit(draft) { state = { ...state, draft, draftRev:state.draftRev + 1 }; render(); },
    switchSession(draft) { state = { ...state, draft, draftRev:1 }; actions = { ...actions }; render(); },
    release() { for (const resolve of pending.splice(0)) resolve(); },
    async click(label) { const b = button(label); assert.ok(!b.props.disabled); await b.props.onClick(); },
    dispose() { for (const hook of hooks) hook?.cleanup?.(); }
  };
}
test('DSH exposes exactly one inline button and no settings or voice UI', async () => {
  const f = await fixture();
  try { assert.equal(f.slots[0].name, 'conversation.input.right'); assert.equal(f.nodes().filter(n => n.type === 'button').length, 1); assert.equal(f.nodes().filter(n => ['section','select','textarea','input','details'].includes(n.type)).length, 0); assert.equal(f.requests.length, 0); }
  finally { f.dispose(); }
});
test('single click automatically applies deep structured enhancement and same button undoes', async () => {
  const f = await fixture();
  try { const before = f.state.draft; await f.click('增强'); assert.ok(f.state.draft.startsWith('## 任务需求\n')); assert.ok(f.state.draft.includes(before)); assert.deepEqual(f.requests[0].request, { input:before, mode:'smart', domain:'auto', intensity:'deep', layout:'structured', useContext:false, useMemory:false, fallback:true }); assert.equal(f.nodes().filter(n => n.type === 'button').length, 1); await f.click('撤销增强'); assert.equal(f.state.draft, before); }
  finally { f.dispose(); }
});
test('typing during enhancement retains new edits', async () => {
  const f = await fixture({ hold:true });
  try { const done = f.click('增强'); f.edit('新的手工编辑'); f.release(); await done; assert.equal(f.state.draft, '新的手工编辑'); }
  finally { f.dispose(); }
});
test('stop button cancels application even when provider ignores abort', async () => {
  const f = await fixture({ hold:true });
  try { const before = f.state.draft, done = f.click('增强'); await f.click('停止'); f.release(); await done; assert.equal(f.state.draft, before); }
  finally { f.dispose(); }
});
test('atomic reference chips use append and undo leaves occurrences intact', async () => {
  const chips = [{ id:'reference-1', start:0, end:2 }], f = await fixture({ chips });
  try { const before = f.state.draft; await f.click('增强'); assert.equal(f.requests[0].request.layout, 'append'); assert.ok(f.state.draft.startsWith(before)); assert.equal(f.state.occurrences, chips); await f.click('撤销增强'); assert.equal(f.state.draft, before); assert.equal(f.state.occurrences, chips); }
  finally { f.dispose(); }
});
test('session switch cancels old result and resets the single button immediately', async () => {
  const f = await fixture({ hold:true });
  try { const done = f.click('增强'); f.switchSession('另一个会话的草稿'); assert.ok(f.button('增强')); f.release(); await done; assert.equal(f.state.draft, '另一个会话的草稿'); assert.ok(f.button('增强')); }
  finally { f.dispose(); }
});
test('manual edit after enhancement resets undo rather than erasing edits', async () => {
  const f = await fixture();
  try { await f.click('增强'); f.edit(f.state.draft + '\n新要求'); assert.ok(f.button('增强')); assert.equal(f.nodes().filter(n => n.type === 'button').length, 1); }
  finally { f.dispose(); }
});
