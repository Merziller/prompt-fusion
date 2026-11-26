import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installSkill, uninstallSkill, makeConfig } from '../src/install.mjs';
import { makeOperation } from '../adapters/dsh/index.mjs';
const cli = fileURLToPath(new URL('../bin/prompt-fusion.mjs', import.meta.url));
const draft = 'Help arrange my task.';
const rewritten = 'Organize my task into a clear goal and relevant next steps.';

// Local deterministic model protocol fixture, not a real-model quality benchmark.
async function modelFixture(t) {
  const calls = [];
  const server = createServer(async (req, res) => {
    try {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const payload = JSON.parse(body.messages.find(m => m.role === 'user').content);
      calls.push({ url: req.url, body, payload });
      const content = JSON.stringify(Object.hasOwn(payload, 'candidate')
        ? { verdict: 'pass', prompt: null, issues: [] }
        : { prompt: rewritten });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content }, finish_reason: 'stop' }] }));
    } catch { res.writeHead(400); res.end('{}'); }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  return { calls, env: { ...process.env, FUSION_BASE_URL: `http://127.0.0.1:${server.address().port}/v1`, FUSION_MODEL: 'local-protocol-fixture', FUSION_API_KEY: 'fixture-only' } };
}
function childProcess(t, args, env) {
  const child = spawn(process.execPath, args, { env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '', stderr = ''; const messages = [], waiters = [];
  const lineMessages = args.includes('mcp') || args.includes('serve');
  child.stdout.on('data', chunk => { stdout += chunk; if (lineMessages) flush(); });
  child.stderr.on('data', chunk => { stderr += chunk; });
  let consumed = 0;
  function flush() {
    let end;
    while ((end = stdout.indexOf('\n', consumed)) >= 0) {
      const line = stdout.slice(consumed, end); consumed = end + 1;
      if (line.trim()) messages.push(JSON.parse(line));
    }
    for (const waiter of [...waiters]) {
      const value = messages.find(waiter.predicate);
      if (value !== undefined) { clearTimeout(waiter.timer); waiters.splice(waiters.indexOf(waiter), 1); waiter.resolve(value); }
    }
  }
  let closed = false;
  const finished = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', code => { closed = true; for (const waiter of waiters.splice(0)) { clearTimeout(waiter.timer); waiter.reject(new Error(`Child exited ${code}: ${stderr}`)); } resolve({ code, stdout, stderr }); });
  });
  t.after(async () => { if (!closed) child.kill(); await finished; });
  return { child, finished, message(predicate) { const value = messages.find(predicate); if (value !== undefined) return Promise.resolve(value); return new Promise((resolve, reject) => { const waiter = { predicate, resolve, reject, timer: setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error('Child response timeout')); }, 5000) }; waiters.push(waiter); }); } };
}
function assertRewrite(value, calls) {
  assert.equal(value.engine, 'model-rewrite'); assert.equal(value.original, draft);
  assert.equal(value.enhanced, rewritten); assert.equal(value.audit.stages, 2);
  assert.equal(value.audit.modelCalls, 2); assert.equal(calls.length, 2);
  assert.equal(calls[0].payload.draft, draft); assert.equal(calls[1].payload.candidate, rewritten);
  for (const call of calls) { assert.equal(call.body.max_tokens, 8192); assert.equal(call.body.tools, undefined); }
}

test('actual CLI opt-in runs rewrite and fidelity review through HTTP provider', { timeout: 10000 }, async t => {
  const model = await modelFixture(t); const p = childProcess(t, [cli, 'enhance', '--json', '--model'], model.env);
  p.child.stdin.end(JSON.stringify({ input: draft }));
  const result = await p.finished; assert.equal(result.code, 0, result.stderr);
  assertRewrite(JSON.parse(result.stdout), model.calls);
});
test('actual MCP child opt-in shares semantic pipeline, not old rule selection', { timeout: 10000 }, async t => {
  const model = await modelFixture(t); const p = childProcess(t, [cli, 'mcp', '--model'], model.env);
  const send = value => p.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', ...value }) + '\n');
  send({ id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'semantic-fixture', version: '1' } } });
  assert.ok((await p.message(x => x.id === 1)).result);
  send({ method: 'notifications/initialized' });
  send({ id: 2, method: 'tools/call', params: { name: 'prompt_fusion_enhance', arguments: { input: draft } } });
  const result = (await p.message(x => x.id === 2)).result;
  assert.ok(!result.isError); assertRewrite(JSON.parse(result.content[0].text), model.calls);
  p.child.stdin.end(); assert.equal((await p.finished).code, 0);
});
test('actual HTTP service opt-in shares semantic pipeline for REST clients', { timeout: 10000 }, async t => {
  const model = await modelFixture(t); const p = childProcess(t, [cli, 'serve', '--port', '0', '--model'], model.env);
  const descriptor = await p.message(x => typeof x.url === 'string');
  const response = await fetch(descriptor.url + '/v1/enhance', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input: draft }) });
  assert.equal(response.status, 200); assertRewrite(await response.json(), model.calls);
});
test('installed portable Skill includes model adapter and performs actual opt-in calls', { timeout: 10000 }, async t => {
  const model = await modelFixture(t); const temp = await mkdtemp(path.join(os.tmpdir(), 'pf-semantic-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const install = await installSkill({ target: 'generic', skillsDir: temp });
  assert.ok(install.files.includes('scripts/providers.mjs'));
  const p = childProcess(t, [path.join(install.destination, 'scripts/enhance.mjs'), '--json', '--model'], model.env);
  p.child.stdin.end(JSON.stringify({ input: draft }));
  const result = await p.finished; assert.equal(result.code, 0, result.stderr); assertRewrite(JSON.parse(result.stdout), model.calls);
  const receipt = JSON.parse(await readFile(path.join(install.destination, '.prompt-fusion-install.json'), 'utf8'));
  assert.equal(Object.keys(receipt.files).length, 10); await uninstallSkill({ skillDir: install.destination });
});
test('configured model env alone never opts a standalone client into network calls', { timeout: 10000 }, async t => {
  const model = await modelFixture(t); const p = childProcess(t, [cli, 'enhance', '--json'], model.env);
  p.child.stdin.end(JSON.stringify({ input: draft }));
  const result = await p.finished; assert.equal(result.code, 0); const value = JSON.parse(result.stdout);
  assert.equal(value.enhanced, draft); assert.equal(value.engine, 'unchanged');
  assert.ok(value.warnings.some(x => x.code === 'MODEL_REQUIRED')); assert.equal(model.calls.length, 0);
});
test('DSH pins the selected provider and model for the complete two-stage operation', async () => {
  let selections = 0; const calls = [];
  const operation = makeOperation({ selection: () => ({ provider: `p${++selections}`, model: `m${selections}` }), llm: { async *stream(args) {
    calls.push(args); const payload = JSON.parse(args.messages[0].content[0].text);
    yield { type: 'text-delta', text: JSON.stringify(Object.hasOwn(payload, 'candidate') ? { verdict: 'pass', prompt: null, issues: [] } : { prompt: rewritten }) };
    yield { type: 'finish', reason: { kind: 'stop' } };
  } } });
  const result = await operation({ input: draft }); assert.equal(result.enhanced, rewritten);
  assert.equal(selections, 1); assert.equal(calls.length, 2); assert.ok(calls.every(x => x.provider === 'p1' && x.model === 'm1'));
});
test('model opt-in propagates to generated MCP configs without embedding credentials', () => {
  for (const target of ['generic', 'claude', 'kimi', 'workbuddy']) {
    const config = makeConfig(target, { model: true }); const entry = config.mcpServers?.prompt_fusion ?? config;
    assert.equal(entry.args.at(-1), '--model'); assert.equal(entry.env, undefined);
  }
  assert.throws(() => makeConfig('generic', { model: 'yes' }), error => error.code === 'INVALID_OPTION');
});
