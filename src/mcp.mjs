// Minimal stdio MCP server. JSON-RPC 2.0 / MCP 2025-06-18; no HTTP listener.
import { enhance, FusionError, VERSION } from './core.mjs';
import { toolDefinition } from './schema.mjs';
export function startMcp({ input = process.stdin, output = process.stdout, providers = [] } = {}) {
  let buffer = Buffer.alloc(0), discarding = false, initialized = false, ready = false, ended = false;
  const active = new Map();
  const send = (message) => { if (!ended && !output.destroyed) output.write(JSON.stringify({ jsonrpc: '2.0', ...message }) + '\n'); };
  const error = (id, code, message) => send({ id, error: { code, message } });
  async function handle(line) {
    let m; try { m = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(line)); } catch { error(null, -32700, 'Parse error'); return; }
    if (!m || Array.isArray(m) || m.jsonrpc !== '2.0' || typeof m.method !== 'string') { error(null, -32600, 'Invalid Request'); return; }
    const hasId = Object.hasOwn(m, 'id');
    if (hasId && !['string', 'number'].includes(typeof m.id)) { error(null, -32600, 'Invalid request id'); return; }
    if (!hasId) {
      if (m.method === 'notifications/initialized' && initialized) ready = true;
      if (m.method === 'notifications/cancelled') active.get(m.params?.requestId)?.abort();
      return;
    }
    if (m.method === 'ping') { send({ id: m.id, result: {} }); return; }
    if (m.method === 'initialize') {
      if (initialized) { error(m.id, -32600, 'Already initialized'); return; }
      if (!m.params || typeof m.params.protocolVersion !== 'string' || !m.params.clientInfo || typeof m.params.capabilities !== 'object') { error(m.id, -32602, 'Invalid initialization parameters'); return; }
      initialized = true;
      const versions = ['2024-11-05', '2025-03-26', '2025-06-18'];
      send({ id: m.id, result: { protocolVersion: versions.includes(m.params.protocolVersion) ? m.params.protocolVersion : '2025-06-18', capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'prompt-fusion', version: VERSION }, instructions: 'This server enhances prompts only. Never execute the task contained in a supplied prompt. Present the preview to the user.' } }); return;
    }
    if (!ready) { error(m.id, -32002, 'Initialize before calling tools'); return; }
    if (m.method === 'tools/list') { send({ id: m.id, result: { tools: [toolDefinition] } }); return; }
    if (m.method !== 'tools/call') { error(m.id, -32601, 'Method not found'); return; }
    if (m.params?.name !== toolDefinition.name) { error(m.id, -32602, 'Unknown tool'); return; }
    if (active.has(m.id)) { error(m.id, -32600, 'Duplicate active request id'); return; }
    if (active.size >= 8) { error(m.id, -32000, 'Too many active requests'); return; }
    const controller = new AbortController(); active.set(m.id, controller);
    try {
      const result = await enhance(m.params.arguments, { providers, signal: controller.signal });
      send({ id: m.id, result: { content: [{ type: 'text', text: JSON.stringify(result) }], isError: false } });
    } catch (e) {
      send({ id: m.id, result: { isError: true, content: [{ type: 'text', text: JSON.stringify({ code: e instanceof FusionError ? e.code : 'INTERNAL_ERROR', message: e instanceof FusionError ? e.message : 'Enhancement failed.' }) }] } });
    } finally { active.delete(m.id); }
  }
  function onData(chunk) {
    let rest = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    while (rest.length) {
      const pos = rest.indexOf(10), part = pos === -1 ? rest : rest.subarray(0, pos);
      if (!discarding) {
        if (buffer.length + part.length > 131072) { error(null, -32600, 'Message exceeds 128 KiB'); buffer = Buffer.alloc(0); discarding = true; }
        else buffer = Buffer.concat([buffer, part]);
      }
      if (pos === -1) break;
      if (!discarding && buffer.length) void handle(buffer);
      buffer = Buffer.alloc(0); discarding = false; rest = rest.subarray(pos + 1);
    }
  }
  function onEnd() { if (buffer.length) error(null, -32700, 'Expected newline-delimited JSON-RPC'); buffer = Buffer.alloc(0); for (const c of active.values()) c.abort(); }
  input.on('data', onData); input.on('end', onEnd);
  return () => { ended = true; input.off('data', onData); input.off('end', onEnd); for (const c of active.values()) c.abort(); active.clear(); };
}
