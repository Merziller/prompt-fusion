// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
// Stateless MCP Streamable HTTP (JSON responses) + a neutral OpenAPI/JSON adapter.
import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { enhance, FusionError, VERSION } from './core.mjs';
import { inputSchema, toolDefinition } from './schema.mjs';
import { initializeResult, toolResult, MCP_VERSIONS } from './mcp-common.mjs';
const MAX_BODY = 131072;
const isLoopback = host => ['127.0.0.1', '::1', 'localhost', '[::1]'].includes(host);
const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
export function openApiDocument({ authentication = true } = {}) {
  return {
    openapi: '3.1.0', info: { title: 'Prompt Fusion', version: VERSION, description: 'Prompt text only. Model-assisted semantic rewriting with a separate fidelity review; no embedded task execution. Missing-model and validation failures retain the original with explicit warnings.' },
    servers: [{ url: '/' }],
    ...(authentication ? { security: [{ bearerAuth: [] }], components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } } } } : {}),
    paths: { '/v1/enhance': { post: { operationId: 'prompt_fusion_enhance', summary: 'Rewrite and review a prompt without executing it', requestBody: { required: true, content: { 'application/json': { schema: inputSchema } } }, responses: { '200': { description: 'Original text, enhanced preview, warnings and metadata', content: { 'application/json': { schema: { type: 'object', required: ['original', 'enhanced'], properties: { original: { type: 'string' }, enhanced: { type: 'string' } }, additionalProperties: true } } } }, '400': { description: 'Invalid request' }, '401': { description: 'Bearer token required' }, '413': { description: 'Request over 128 KiB' }, '429': { description: 'Concurrent request limit' } } } } }
  };
}
function readJson(request) {
  return new Promise((resolve, reject) => {
    let size = 0, chunks = [], finished = false;
    const clean = () => { request.off('data', data); request.off('end', end); request.off('error', fail); request.off('aborted', aborted); };
    const fail = error => { if (!finished) { finished = true; clean(); reject(error); } };
    const aborted = () => fail(new FusionError('ABORTED', 'Request disconnected.'));
    const data = chunk => {
      size += chunk.length;
      if (size > MAX_BODY) { request.pause(); chunks = []; fail(new FusionError('INPUT_TOO_LARGE', 'HTTP request exceeds 128 KiB.')); }
      else chunks.push(chunk);
    };
    const end = () => {
      if (finished) return; finished = true; clean();
      try { resolve(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)))); }
      catch { reject(new FusionError('INVALID_JSON', 'Expected one UTF-8 JSON object.')); }
    };
    request.on('data', data); request.on('end', end); request.on('error', fail); request.on('aborted', aborted);
  });
}
export async function startHttp({ host = '127.0.0.1', port = 8765, token, allowedOrigins = [], providers = [], operation = enhance, requestTimeoutMs = 125000 } = {}) {
  if (typeof host !== 'string' || !host.trim() || !Number.isInteger(port) || port < 0 || port > 65535) throw new FusionError('INVALID_LISTEN', 'Provide a host and a port from 0 to 65535.');
  if (token !== undefined && (typeof token !== 'string' || token.length < 24 || token.length > 4096 || /\s/.test(token))) throw new FusionError('INVALID_TOKEN', 'Use a whitespace-free bearer token of at least 24 characters.');
  if (!isLoopback(host) && !token) throw new FusionError('AUTH_REQUIRED', 'A non-loopback listener requires an explicit bearer token.');
  if (!Array.isArray(allowedOrigins) || allowedOrigins.length > 16 || allowedOrigins.some(x => { try { return new URL(x).origin !== x; } catch { return true; } })) throw new FusionError('INVALID_ORIGIN', 'Provide exact origin URLs without a trailing slash.');
  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 10 || requestTimeoutMs > 125000) throw new FusionError('INVALID_TIMEOUT', 'HTTP deadline must be 10..125000 ms.');
  const active = new Set(), secret = token ? Buffer.from('Bearer ' + token) : null;
  let closing = false;
  const server = http.createServer({ requestTimeout: 15000, headersTimeout: 10000 }, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const send = (status, value) => {
      if (res.destroyed || res.writableEnded) return;
      res.statusCode = status;
      if (status >= 400) res.setHeader('Connection', 'close');
      if (value === undefined) { res.end(); return; }
      res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(value));
    };
    if (closing) { send(503, { error: { code: 'CLOSING' } }); return; }
    if (secret) {
      const supplied = Buffer.from(req.headers.authorization ?? '');
      if (supplied.length !== secret.length || !timingSafeEqual(supplied, secret)) { res.setHeader('WWW-Authenticate', 'Bearer'); send(401, { error: { code: 'UNAUTHENTICATED' } }); return; }
    }
    // A tokenless local endpoint must reject DNS-rebinding hosts as well as hostile origins.
    if (!secret) {
      let hostname; try { hostname = new URL('http://' + req.headers.host).hostname; } catch { /* invalid */ }
      if (!isLoopback(hostname)) { send(403, { error: { code: 'INVALID_HOST' } }); return; }
    }
    if (req.headers.origin && !allowedOrigins.includes(req.headers.origin)) {
      let allowed = false;
      try { const origin = new URL(req.headers.origin); allowed = isLoopback(host) && isLoopback(origin.hostname) && ['http:', 'https:'].includes(origin.protocol); } catch { /* reject */ }
      if (!allowed) { send(403, { error: { code: 'INVALID_ORIGIN' } }); return; }
    }
    const route = req.url?.split('?')[0];
    if (route === '/openapi.json' && req.method === 'GET') { send(200, openApiDocument({ authentication: !!secret })); return; }
    if (!['/mcp', '/v1/enhance'].includes(route)) { send(404, { error: { code: 'NOT_FOUND' } }); return; }
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); send(405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Stateless JSON responses; no SSE GET stream.' } }); return; }
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] ?? '')) { send(415, { error: { code: 'CONTENT_TYPE' } }); return; }
    if (Number(req.headers['content-length']) > MAX_BODY) { send(413, { error: { code: 'INPUT_TOO_LARGE' } }); return; }
    if (route === '/mcp') {
      const accept = req.headers.accept ?? '';
      if (!accept.includes('application/json') || !accept.includes('text/event-stream')) { send(406, { error: { code: 'ACCEPT_REQUIRED', message: 'Accept application/json and text/event-stream.' } }); return; }
      if (req.headers['mcp-protocol-version'] && !MCP_VERSIONS.includes(req.headers['mcp-protocol-version'])) { send(400, rpcError(null, -32600, 'Unsupported protocol version')); return; }
    }
    if (active.size >= 8) { send(429, { error: { code: 'BUSY' } }); return; }
    const controller = new AbortController(); active.add(controller);
    const disconnected = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', disconnected);
    let abortListener;
    const cancelled = new Promise((_, reject) => { abortListener = () => reject(new FusionError('ABORTED', 'Request cancelled or timed out.')); controller.signal.addEventListener('abort', abortListener, { once: true }); });
    const deadline = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      await Promise.race([(async () => {
        const message = await readJson(req);
        if (route === '/v1/enhance') { send(200, await operation(message, { providers, signal: controller.signal })); return; }
        if (!message || Array.isArray(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string' || (Object.hasOwn(message, 'id') && !['number', 'string'].includes(typeof message.id))) { send(400, rpcError(null, -32600, 'Invalid Request')); return; }
        if (!Object.hasOwn(message, 'id')) { send(202); return; }
        let result;
        if (message.method === 'initialize') {
          if (typeof message.params?.protocolVersion !== 'string' || !message.params.clientInfo || !message.params.capabilities || typeof message.params.capabilities !== 'object') { send(200, rpcError(message.id, -32602, 'Invalid initialization parameters')); return; }
          result = initializeResult(message.params.protocolVersion);
        } else if (message.method === 'ping') result = {};
        else if (message.method === 'tools/list') result = { tools: [toolDefinition] };
        else if (message.method === 'tools/call') {
          if (message.params?.name !== toolDefinition.name) { send(200, rpcError(message.id, -32602, 'Unknown tool')); return; }
          result = await toolResult(message.params.arguments, { operation, providers, signal: controller.signal });
        } else { send(200, rpcError(message.id, -32601, 'Method not found')); return; }
        send(200, { jsonrpc: '2.0', id: message.id, result });
      })(), cancelled]);
    } catch (error) {
      const code = error instanceof FusionError ? error.code : 'INTERNAL_ERROR';
      send(code === 'INPUT_TOO_LARGE' ? 413 : code === 'ABORTED' ? 504 : code === 'INTERNAL_ERROR' ? 500 : 400, { error: { code, message: error instanceof FusionError ? error.message : 'Request failed.' } });
    } finally {
      clearTimeout(deadline); controller.signal.removeEventListener('abort', abortListener); res.off('close', disconnected); active.delete(controller);
      if (!req.complete) { if (res.writableFinished) req.destroy(); else res.once('finish', () => req.destroy()); }
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, () => { server.off('error', reject); resolve(); }); });
  const address = server.address();
  const hostname = address.address.includes(':') ? '[' + address.address + ']' : address.address;
  return {
    url: 'http://' + hostname + ':' + address.port, transport: 'streamable-http', authentication: !!secret,
    async close() { closing = true; for (const c of active) c.abort(); const done = new Promise(resolve => server.close(resolve)); server.closeAllConnections(); await done; }
  };
}
