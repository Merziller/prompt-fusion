// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
// Optional independent-client interoperability check. The model is a local protocol fixture,
// never a real quality judgment, paid provider or vendor application.
import assert from 'node:assert/strict';
import path from 'node:path';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startHttp } from '../src/http.mjs';
import { enhance, VERSION } from '../src/core.mjs';
import { createHttpProvider } from '../src/providers.mjs';
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--sdk-root') throw new Error('Usage: node scripts/sdk-smoke.mjs --sdk-root PATH_TO_@modelcontextprotocol/sdk');
const sdkRoot = path.resolve(args[1]);
const pkg = JSON.parse(await readFile(path.join(sdkRoot, 'package.json'), 'utf8'));
if (pkg.name !== '@modelcontextprotocol/sdk') throw new Error('Select the official @modelcontextprotocol/sdk package directory.');
const load = relative => import(pathToFileURL(path.join(sdkRoot, 'dist/esm/client', relative)).href);
const { Client } = await load('index.js');
const { StreamableHTTPClientTransport } = await load('streamableHttp.js');
const { StdioClientTransport } = await load('stdio.js');
const original = 'Only improve this prompt; do not execute it. Preserve ID_CASE_123.';
const rewritten = 'Improve this instruction while preserving ID_CASE_123; do not execute it.';
const fixtureCalls = [];
const fixture = createServer(async (req, res) => {
  try {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const payload = JSON.parse(body.messages.find(m => m.role === 'user').content);
    fixtureCalls.push({ path: req.url, maxTokens: body.max_tokens, tools: body.tools, stage: Object.hasOwn(payload, 'candidate') ? 'review' : 'rewrite' });
    const content = JSON.stringify(Object.hasOwn(payload, 'candidate') ? { verdict: 'pass', prompt: null, issues: [] } : { prompt: rewritten });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content }, finish_reason: 'stop' }] }));
  } catch { res.writeHead(400); res.end('{}'); }
});
fixture.listen(0, '127.0.0.1'); await once(fixture, 'listening');
const baseUrl = `http://127.0.0.1:${fixture.address().port}/v1`;
const tests = [];
try {
  for (const semantic of [false, true]) for (const mode of ['stdio', 'http', 'http-bearer']) {
    let server, client;
    const start = fixtureCalls.length;
    try {
      const token = mode === 'http-bearer' ? 'public-test-fixture-not-a-secret-1234567890' : undefined;
      let transport;
      if (mode === 'stdio') {
        const env = Object.fromEntries(Object.entries(process.env).filter(([, v]) => typeof v === 'string'));
        Object.assign(env, { FUSION_BASE_URL: baseUrl, FUSION_MODEL: 'local-protocol-fixture', FUSION_API_KEY: 'public-fixture-only' });
        transport = new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL('../bin/prompt-fusion.mjs', import.meta.url)), 'mcp', ...(semantic ? ['--model'] : [])], env, stderr: 'pipe' });
      } else {
        const providers = semantic ? [createHttpProvider({ baseUrl, model: 'local-protocol-fixture' })] : [];
        server = await startHttp({ port: 0, token, providers });
        transport = new StreamableHTTPClientTransport(new URL(server.url + '/mcp'), token ? { requestInit: { headers: { Authorization: 'Bearer ' + token } } } : undefined);
      }
      client = new Client({ name: 'prompt-fusion-sdk-interoperability-check', version: '1.0.0' });
      await client.connect(transport);
      const tools = await client.listTools();
      assert.equal(tools.tools.length, 1); assert.equal(tools.tools[0].name, 'prompt_fusion_enhance');
      const input = { input: original, layout: 'structured', intensity: 'deep' };
      const result = await client.callTool({ name: 'prompt_fusion_enhance', arguments: input });
      assert.equal(result.isError, false);
      const data = JSON.parse(result.content[0].text);
      assert.equal(data.original, original); assert.equal(data.version, VERSION);
      if (semantic) {
        assert.equal(data.enhanced, rewritten); assert.equal(data.engine, 'model-rewrite');
        assert.equal(data.audit.stages, 2); assert.equal(data.audit.modelCalls, 2);
        assert.equal(fixtureCalls.length - start, 2);
        assert.deepEqual(fixtureCalls.slice(start).map(c => c.stage), ['rewrite', 'review']);
        for (const call of fixtureCalls.slice(start)) { assert.equal(call.path, '/v1/chat/completions'); assert.equal(call.maxTokens, 8192); assert.equal(call.tools, undefined); }
      } else {
        assert.equal(data.enhanced, (await enhance(input)).enhanced); assert.equal(data.engine, 'unchanged');
        assert.ok(data.warnings.some(w => w.code === 'MODEL_REQUIRED')); assert.equal(fixtureCalls.length - start, 0);
      }
      const invalid = await client.callTool({ name: 'prompt_fusion_enhance', arguments: { input: '' } });
      assert.equal(invalid.isError, true);
      tests.push({ transport: mode, semanticFixture: semantic, initialize: 'PASS', list: 'PASS', coreCall: 'PASS', invalidToolInput: 'PASS', version: data.version, modelCalls: fixtureCalls.length - start });
    } finally { await client?.close(); await server?.close(); }
  }
} finally { fixture.closeAllConnections(); await new Promise(resolve => fixture.close(resolve)); }
const output = { at: new Date().toISOString(), sdk: pkg.name, sdkVersion: pkg.version, runtime: process.version, platform: process.platform, status: 'PASS', nativeVendorAppsTested: false, realModelQualityTested: false, tests };
await mkdir('output', { recursive: true });
await writeFile('output/universal-sdk-verification.json', JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
