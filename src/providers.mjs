// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
import { FusionError, LIMITS } from './core.mjs';
export function createHttpProvider({ baseUrl, model, apiKey, fetchImpl = globalThis.fetch }) {
  let url;
  try { if (typeof baseUrl !== 'string' || !baseUrl.trim()) throw new Error(); url = new URL(baseUrl); }
  catch { throw new FusionError('INVALID_PROVIDER', 'An explicit valid FUSION_BASE_URL is required for model mode.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new FusionError('INVALID_PROVIDER', 'Use an HTTP(S) base URL without credentials, query or fragment.');
  if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new FusionError('INVALID_PROVIDER', 'Remote model endpoints require HTTPS.');
  if (typeof model !== 'string' || !model.trim()) throw new FusionError('INVALID_PROVIDER', 'A model ID is required.');
  const endpoint = new URL(url.toString().replace(/\/$/, '') + '/chat/completions');
  return async ({ system, input, signal, maxTokens = 8192 }) => {
    if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 16384) throw new FusionError('INVALID_PROVIDER', 'Invalid output token budget.');
    const response = await fetchImpl(endpoint, { method: 'POST', redirect: 'error', signal, headers: { 'content-type': 'application/json', ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) }, body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: input }], temperature: 0, max_tokens: maxTokens, stream: false }) });
    if (!response.ok) { await response.body?.cancel(); const error = new FusionError('PROVIDER_HTTP', `Model endpoint returned HTTP ${response.status}.`); error.status = response.status; throw error; }
    const reader = response.body?.getReader();
    if (!reader) throw new FusionError('MODEL_EMPTY', 'Model endpoint returned no body.');
    const chunks = []; let size = 0;
    try {
      while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 524288) throw new FusionError('MODEL_TOO_LARGE', 'Model HTTP response exceeds budget.'); chunks.push(value); }
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    let data; try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new FusionError('MODEL_INVALID', 'Invalid JSON response from model endpoint.'); }
    if (data.choices?.[0]?.finish_reason === 'length') throw new FusionError('MODEL_TRUNCATED', 'Model response was truncated.');
    return data.choices?.[0]?.message?.content;
  };
}
// DSH reports both assembled blocks and deltas. Select one representation per block.
export async function collectDshText(stream) {
  let pending = '', completed = ''; let total = 0;
  for await (const event of stream) {
    if (event.type === 'text-delta') { const text = typeof event.text === 'string' ? event.text : ''; pending += text; total += new TextEncoder().encode(text).length; }
    if (event.type === 'block-end' && event.block?.type === 'text') { const text = typeof event.block.text === 'string' ? event.block.text : pending; completed += text; pending = ''; total += new TextEncoder().encode(text).length; }
    if (total > 262144) throw new FusionError('MODEL_TOO_LARGE', 'Model stream exceeds budget.');
    if (event.type === 'finish') {
      const kind = typeof event.reason === 'string' ? event.reason : event.reason?.kind;
      if (['error', 'aborted', 'length', 'max-tokens'].includes(kind)) {
        const failure = typeof event.reason === 'object' ? event.reason?.failure : undefined;
        const error = new FusionError(kind === 'length' || kind === 'max-tokens' ? 'MODEL_TRUNCATED' : kind === 'aborted' ? 'PROVIDER_ERROR' : (typeof failure?.code === 'string' ? failure.code : 'PROVIDER_ERROR'), 'Model stream did not complete.');
        if (Number.isInteger(failure?.status)) error.status = failure.status;
        throw error;
      }
    }
  }
  return completed + pending;
}
