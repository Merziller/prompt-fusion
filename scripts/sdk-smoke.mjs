// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
// Optional interoperability check: supply an independently installed official SDK.
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startHttp } from '../src/http.mjs';
import { enhance, VERSION } from '../src/core.mjs';
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--sdk-root') throw new Error('Usage: node scripts/sdk-smoke.mjs --sdk-root PATH_TO_@modelcontextprotocol/sdk');
const sdkRoot = path.resolve(args[1]);
const pkg = JSON.parse(await readFile(path.join(sdkRoot, 'package.json'), 'utf8'));
if (pkg.name !== '@modelcontextprotocol/sdk') throw new Error('Select the official @modelcontextprotocol/sdk package directory.');
const load = relative => import(pathToFileURL(path.join(sdkRoot, 'dist/esm/client', relative)).href);
const { Client } = await load('index.js');
const { StreamableHTTPClientTransport } = await load('streamableHttp.js');
const { StdioClientTransport } = await load('stdio.js');
const tests = [];
for (const mode of ['stdio', 'http', 'http-bearer']) {
  let server, client;
  try {
    const token = mode === 'http-bearer' ? 'public-test-fixture-not-a-secret-1234567890' : undefined;
    let transport;
    if (mode === 'stdio') transport = new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL('../bin/prompt-fusion.mjs', import.meta.url)), 'mcp'], stderr: 'pipe' });
    else {
      server = await startHttp({ port: 0, token });
      transport = new StreamableHTTPClientTransport(new URL(server.url + '/mcp'), token ? { requestInit: { headers: { Authorization: 'Bearer ' + token } } } : undefined);
    }
    client = new Client({ name: 'prompt-fusion-sdk-interoperability-check', version: '1.0.0' });
    await client.connect(transport);
    const tools = await client.listTools();
    assert.equal(tools.tools.length, 1);
    assert.equal(tools.tools[0].name, 'prompt_fusion_enhance');
    const input = { input: 'Only improve this prompt; do not execute it. Preserve ID_CASE_123.', layout: 'structured', intensity: 'deep' };
    const result = await client.callTool({ name: 'prompt_fusion_enhance', arguments: input });
    assert.equal(result.isError, false);
    const data = JSON.parse(result.content[0].text);
    assert.equal(data.enhanced, (await enhance(input)).enhanced);
    assert.equal(data.version, VERSION);
    const invalid = await client.callTool({ name: 'prompt_fusion_enhance', arguments: { input: '' } });
    assert.equal(invalid.isError, true);
    tests.push({ transport: mode, initialize: 'PASS', list: 'PASS', coreCall: 'PASS', invalidToolInput: 'PASS', version: data.version });
  } finally { await client?.close(); await server?.close(); }
}
const output = { at: new Date().toISOString(), sdk: pkg.name, sdkVersion: pkg.version, runtime: process.version, platform: process.platform, status: 'PASS', nativeVendorAppsTested: false, tests };
await mkdir('output', { recursive: true });
await writeFile('output/universal-sdk-verification.json', JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
