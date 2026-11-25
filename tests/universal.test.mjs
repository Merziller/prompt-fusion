import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, mkdir, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { request as httpRequest } from 'node:http';
import { installSkill, uninstallSkill, makeConfig, isSystemPathAlias } from '../src/install.mjs';
import { startHttp, openApiDocument } from '../src/http.mjs';
import { enhance } from '../src/core.mjs';
const accept = 'application/json, text/event-stream';
async function setup(t, options = {}) { const s = await startHttp({ port: 0, ...options }); t.after(() => s.close()); return s; }
async function rpc(s, message, headers = {}) { return fetch(s.url + '/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: accept, ...headers }, body: JSON.stringify(message) }); }
const request = (method, params, id = 1) => ({ jsonrpc: '2.0', id, method, ...(params === undefined ? {} : { params }) });
const init = request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test-client', version: '1' } });

test('arbitrary host label installs a self-contained Skill without a brand whitelist', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'pf-any-'));
  try {
    const result = await installSkill({ target: 'An-Unlisted-Future-Agent', skillsDir: path.join(temp, 'custom 中文', 'skills') });
    assert.equal(result.scope, 'custom'); assert.equal(result.changed, true);
    const module = await import(pathToFileURL(path.join(result.destination, 'scripts/core.mjs')));
    assert.equal((await module.enhance({ input: 'A future host prompt' })).original, 'A future host prompt');
    await assert.rejects(() => installSkill({ target: 'AnotherAgent', skillsDir: path.dirname(result.destination) }), e => e.code === 'ALREADY_INSTALLED');
    assert.equal((await uninstallSkill({ skillDir: result.destination, dryRun: true })).changed, false);
    assert.ok(await readFile(path.join(result.destination, 'SKILL.md')));
    assert.equal((await uninstallSkill({ skillDir: result.destination })).changed, true);
    await assert.rejects(() => readFile(path.join(result.destination, 'SKILL.md')));
  } finally { await rm(temp, { recursive: true, force: true }); }
});
test('custom dry-run does not create folders and does not imply native host support', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'pf-dry-any-'));
  try { const r = await installSkill({ skillsDir: path.join(temp, 'not-created'), dryRun: true }); assert.equal(r.target, 'generic'); assert.equal(r.changed, false); await assert.rejects(() => readFile(path.join(r.destination, 'SKILL.md'))); }
  finally { await rm(temp, { recursive: true, force: true }); }
});
test('uninstall retains edited, extra, incomplete and unowned files', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'pf-uninstall-'));
  try {
    await assert.rejects(() => uninstallSkill({ skillDir: temp }), e => e.code === 'NOT_OWNED');
    const r = await installSkill({ skillsDir: temp });
    await writeFile(path.join(r.destination, 'notes.txt'), 'user data');
    await assert.rejects(() => uninstallSkill({ skillDir: r.destination }), e => e.code === 'MODIFIED_INSTALL');
    await rm(path.join(r.destination, 'notes.txt'));
    await writeFile(path.join(r.destination, 'SKILL.md'), 'user edited');
    await assert.rejects(() => uninstallSkill({ skillDir: r.destination }), e => e.code === 'MODIFIED_INSTALL');
    assert.equal(await readFile(path.join(r.destination, 'SKILL.md'), 'utf8'), 'user edited');
    await rm(path.join(r.destination, 'SKILL.md'));
    await assert.rejects(() => uninstallSkill({ skillDir: r.destination }), e => e.code === 'MODIFIED_INSTALL');
  } finally { await rm(temp, { recursive: true, force: true }); }
});
test('only exact macOS root system aliases with verified targets are permitted', () => {
  for (const [alias, target] of Object.entries({ '/var': '/private/var', '/tmp': '/private/tmp', '/etc': '/private/etc' })) {
    assert.equal(isSystemPathAlias('darwin', alias, target), true);
    assert.equal(isSystemPathAlias('linux', alias, target), false);
    assert.equal(isSystemPathAlias('darwin', alias, '/arbitrary/user/path'), false);
    assert.equal(isSystemPathAlias('darwin', alias + '/custom-link', target), false);
  }
  assert.equal(isSystemPathAlias('darwin', '/user/link', '/private/var'), false);
});
test('installer rejects a symlink or junction in a custom destination', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'pf-link-'));
  try { const real = path.join(temp, 'real'); await mkdir(real); const alias = path.join(temp, 'alias'); await symlink(real, alias, process.platform === 'win32' ? 'junction' : 'dir'); await assert.rejects(() => installSkill({ skillsDir: alias }), e => e.code === 'UNSAFE_PATH'); }
  finally { await rm(temp, { recursive: true, force: true }); }
});
test('neutral MCP command and Kimi/WorkBuddy config use shared executable', () => {
  const entry = makeConfig('generic'); assert.equal(entry.command, process.execPath); assert.equal(entry.args[1], 'mcp');
  for (const host of ['kimi', 'workbuddy']) assert.deepEqual(makeConfig(host).mcpServers.prompt_fusion, entry);
});

test('remote MCP config is neutral or a verified wrapper and contains no credentials', () => {
  assert.deepEqual(makeConfig('http'), { type: 'http', url: 'http://127.0.0.1:8765/mcp' });
  const url = 'https://agent.example/mcp';
  for (const host of ['claude', 'kimi', 'workbuddy']) assert.deepEqual(makeConfig(host, { serverUrl: url }).mcpServers.prompt_fusion, { type: host === 'workbuddy' ? 'streamableHttp' : 'http', url });
  for (const url of ['file:///secret', 'https://user:pass@example.com/mcp', 'https://example.com/mcp?token=secret', 'not a URL']) assert.throws(() => makeConfig('http', { serverUrl: url }), e => e.code === 'INVALID_SERVER_URL');
  assert.throws(() => makeConfig('unknown-app', { serverUrl: url }), e => e.code === 'UNSUPPORTED_CONFIG');
});

test('HTTP MCP initialize, notification, tools/list and actual core call across independent requests', async t => {
  const s = await setup(t);
  let r = await rpc(s, init); assert.equal(r.status, 200); assert.equal((await r.json()).result.protocolVersion, '2025-06-18');
  r = await rpc(s, { jsonrpc: '2.0', method: 'notifications/initialized' }); assert.equal(r.status, 202); assert.equal(await r.text(), '');
  r = await rpc(s, request('tools/list')); const list = await r.json(); assert.equal(list.result.tools.length, 1); assert.equal(list.result.tools[0].name, 'prompt_fusion_enhance');
  const args = { input: 'Do not execute this task. Preserve code A_123.', layout: 'structured', intensity: 'deep' };
  r = await rpc(s, request('tools/call', { name: 'prompt_fusion_enhance', arguments: args }));
  const body = await r.json(); assert.equal(body.result.isError, false); const result = JSON.parse(body.result.content[0].text); assert.equal(result.original, args.input); assert.equal(result.enhanced, (await enhance(args)).enhanced);
  assert.equal(r.headers.get('mcp-session-id'), null);
});
test('HTTP stateless transport supports id reuse by separate clients', async t => {
  const s = await setup(t); const replies = await Promise.all([rpc(s, init), rpc(s, init)]); for (const r of replies) assert.equal((await r.json()).result.serverInfo.name, 'prompt-fusion');
});
test('REST and OpenAPI use the same core and schema', async t => {
  const s = await setup(t); const spec = await (await fetch(s.url + '/openapi.json')).json();
  assert.equal(spec.openapi, '3.1.0'); assert.equal(spec.paths['/v1/enhance'].post.operationId, 'prompt_fusion_enhance'); assert.equal(spec.security, undefined);
  assert.equal(openApiDocument().components.securitySchemes.bearerAuth.scheme, 'bearer');
  const args = { input: '请整理任务，不执行。', layout: 'structured' };
  const r = await fetch(s.url + '/v1/enhance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) }); assert.equal(r.status, 200); assert.equal((await r.json()).enhanced, (await enhance(args)).enhanced);
});
test('HTTP bearer protects MCP, REST and OpenAPI; never returned in data', async t => {
  const token = 'test-fixture-token-not-a-real-secret-123456'; const s = await setup(t, { token });
  for (const route of ['/mcp', '/v1/enhance', '/openapi.json']) { const r = await fetch(s.url + route); assert.equal(r.status, 401); assert.ok(!(await r.text()).includes(token)); }
  assert.equal((await rpc(s, init, { Authorization: 'Bearer wrong' })).status, 401);
  const r = await rpc(s, init, { Authorization: 'Bearer ' + token }); assert.equal(r.status, 200); assert.ok(!(await r.text()).includes(token));
});
test('external bind requires explicit token; malformed listener options fail before binding', async () => {
  await assert.rejects(() => startHttp({ host: '0.0.0.0' }), e => e.code === 'AUTH_REQUIRED');
  await assert.rejects(() => startHttp({ token: 'short' }), e => e.code === 'INVALID_TOKEN');
  await assert.rejects(() => startHttp({ port: -1 }), e => e.code === 'INVALID_LISTEN');
  await assert.rejects(() => startHttp({ allowedOrigins: ['https://example.com/'] }), e => e.code === 'INVALID_ORIGIN');
});
test('HTTP rejects hostile origin and DNS-rebinding Host', async t => {
  const s = await setup(t);
  assert.equal((await rpc(s, init, { Origin: 'https://unrelated.example' })).status, 403);
  // Node fetch replaces Host; use a real HTTP client that actually sends the rebinding host.
  const status = await new Promise((resolve, reject) => {
    const r = httpRequest(s.url + '/mcp', { method: 'POST', headers: { Host: 'unrelated.example', 'Content-Type': 'application/json', Accept: accept } }, response => { response.resume(); response.on('end', () => resolve(response.statusCode)); });
    r.on('error', reject); r.end(JSON.stringify(init));
  });
  assert.equal(status, 403);
  assert.equal((await rpc(s, init, { Origin: 'http://localhost:3333' })).status, 200);
});
test('HTTP method, Accept, content type and version boundaries', async t => {
  const s = await setup(t);
  assert.equal((await fetch(s.url + '/mcp')).status, 405);
  assert.equal((await fetch(s.url + '/unknown')).status, 404);
  assert.equal((await rpc(s, init, { Accept: 'application/json' })).status, 406);
  assert.equal((await rpc(s, init, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await rpc(s, init, { 'MCP-Protocol-Version': 'invalid' })).status, 400);
});
test('HTTP JSON-RPC errors and tool validation preserve protocol boundaries', async t => {
  const s = await setup(t);
  assert.equal((await (await rpc(s, [])).json()).error.code, -32600);
  assert.equal((await (await rpc(s, request('unknown'))).json()).error.code, -32601);
  assert.equal((await (await rpc(s, request('tools/call', { name: 'not-a-tool' }))).json()).error.code, -32602);
  assert.equal((await (await rpc(s, request('initialize', {}))).json()).error.code, -32602);
  const r = await (await rpc(s, request('tools/call', { name: 'prompt_fusion_enhance', arguments: { input: '' } }))).json(); assert.equal(r.result.isError, true);
});
test('HTTP rejects malformed UTF-8, JSON and oversized payloads', async t => {
  const s = await setup(t); const headers = { 'Content-Type': 'application/json', Accept: accept };
  for (const body of ['{', Buffer.from([0xff])]) { const r = await fetch(s.url + '/mcp', { method: 'POST', headers, body }); assert.equal(r.status, 400); assert.equal((await r.json()).error.code, 'INVALID_JSON'); }
  const r = await fetch(s.url + '/mcp', { method: 'POST', headers, body: 'x'.repeat(131073) }); assert.equal(r.status, 413);
});
test('HTTP deadline cancels work and frees a slot even when a provided operation ignores abort', async t => {
  const s = await setup(t, { requestTimeoutMs: 100, operation: () => new Promise(() => {}) });
  const r = await fetch(s.url + '/v1/enhance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"input":"test"}' }); assert.equal(r.status, 504); assert.equal((await r.json()).error.code, 'ABORTED');
  assert.equal((await rpc(s, request('ping'))).status, 200);
});
test('HTTP limits concurrent work and recovers when operations finish', async t => {
  let entered = 0, reached, release;
  const ready = new Promise(resolve => reached = resolve), hold = new Promise(resolve => release = resolve);
  const s = await setup(t, { operation: async () => { if (++entered === 8) reached(); await hold; return { original: 'x', enhanced: 'x' }; } });
  const calls = Array.from({ length: 8 }, () => fetch(s.url + '/v1/enhance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"input":"x"}' }));
  await ready; const busy = await rpc(s, request('ping')); assert.equal(busy.status, 429); release();
  for (const r of await Promise.all(calls)) { assert.equal(r.status, 200); await r.text(); }
  assert.equal((await rpc(s, request('ping'))).status, 200);
});
