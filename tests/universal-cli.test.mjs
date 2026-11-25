import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const cli = fileURLToPath(new URL('../bin/prompt-fusion.mjs', import.meta.url));
async function run(args, extraEnv = {}) {
  const child = spawn(process.execPath, [cli, ...args], { env: { ...process.env, ...extraEnv }, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', c => stdout += c); child.stderr.on('data', c => stderr += c);
  const [code] = await once(child, 'close');
  return { code, stdout, stderr };
}
test('CLI neutral and remote configs need no known platform name', async () => {
  let r = await run(['config', '--target', 'generic']); assert.equal(r.code, 0); assert.equal(JSON.parse(r.stdout).args[1], 'mcp');
  r = await run(['config', '--target', 'workbuddy', '--server-url', 'https://agent.example/mcp']); assert.equal(r.code, 0); assert.equal(JSON.parse(r.stdout).mcpServers.prompt_fusion.type, 'streamableHttp');
  r = await run(['config', '--target', 'http', '--server-url', 'https://user:pass@agent.example/mcp']); assert.equal(r.code, 1); assert.equal(JSON.parse(r.stderr).code, 'INVALID_SERVER_URL'); assert.ok(!r.stderr.includes('pass@'));
});
test('CLI installs and uninstalls an arbitrary standard Skills host with an owned receipt', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'pf-cli-any-'));
  try {
    let r = await run(['install', '--target', 'FutureAgent', '--skills-dir', temp]); assert.equal(r.code, 0);
    const installed = JSON.parse(r.stdout); assert.equal(installed.target, 'FutureAgent'); assert.ok(await readFile(path.join(installed.destination, 'scripts/core.mjs')));
    r = await run(['uninstall', '--skill-dir', installed.destination, '--dry-run']); assert.equal(r.code, 0); assert.equal(JSON.parse(r.stdout).changed, false);
    r = await run(['uninstall', '--skill-dir', installed.destination]); assert.equal(r.code, 0); assert.equal(JSON.parse(r.stdout).changed, true);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
test('CLI refuses malformed listeners or empty selected token env before opening a port', async () => {
  let r = await run(['serve', '--port', 'no']); assert.equal(r.code, 1); assert.equal(JSON.parse(r.stderr).code, 'INVALID_LISTEN');
  r = await run(['serve', '--port', '0', '--token-env', 'PF_TEST_EMPTY'], { PF_TEST_EMPTY: '' }); assert.equal(r.code, 1); assert.equal(JSON.parse(r.stderr).code, 'MISSING_TOKEN');
});
test('CLI starts an actual token-protected MCP/REST service without logging its token', { timeout: 15000 }, async t => {
  const token = 'public-fixture-token-not-secret-12345678';
  const child = spawn(process.execPath, [cli, 'serve', '--port', '0', '--token-env', 'PF_TEST_TOKEN'], { env: { ...process.env, PF_TEST_TOKEN: token }, stdio: ['ignore', 'pipe', 'pipe'] });
  let closed = false; const end = once(child, 'close').then(() => closed = true);
  t.after(async () => { if (!closed) child.kill(); await end; });
  const descriptor = await new Promise((resolve, reject) => {
    let output = '';
    child.once('error', reject); child.once('close', () => reject(new Error('Listener exited before announcing its endpoint.')));
    child.stdout.on('data', c => { output += c; if (output.includes('\n')) { try { resolve(JSON.parse(output.trim())); } catch (e) { reject(e); } } });
  });
  assert.equal(descriptor.authentication, true); assert.ok(!JSON.stringify(descriptor).includes(token));
  assert.equal((await fetch(descriptor.openapi)).status, 401);
  const r = await fetch(descriptor.url + '/v1/enhance', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ input: 'Do not execute this prompt.' }) });
  assert.equal(r.status, 200); assert.equal((await r.json()).original, 'Do not execute this prompt.');
});
