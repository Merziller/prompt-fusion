// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
// Only expose a bounded classification; provider bodies, URLs and credentials stay private.
export function classifyFailure(error) {
  if (error?.failure && typeof error.failure.category === 'string') {
    const known = ['configuration','cancelled','timeout','connection','authentication','rate-limit','format','fidelity','model'];
    if (known.includes(error.failure.category)) return { category:error.failure.category, retryable:error.failure.retryable === true, ...(Number.isInteger(error.failure.status) && error.failure.status >= 100 && error.failure.status <= 599 ? {status:error.failure.status} : {}) };
  }
  const code = String(error?.code ?? error?.cause?.code ?? '').toUpperCase();
  const httpCode = /^HTTP_([1-5][0-9]{2})$/.exec(code);
  const status = Number.isInteger(error?.status) ? error.status : httpCode ? Number(httpCode[1]) : undefined;
  const result = (category, retryable = false) => ({ category, retryable, ...(status >= 100 && status <= 599 ? {status} : {}) });
  if (['CANCELLED','ABORTED','REGISTRATION_DISPOSED'].includes(code)) return result('cancelled');
  // Gateway/request timeouts are timeouts, not generic 5xx connection failures.
  if (status === 408 || status === 504 || ['TIMEOUT','ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT'].includes(code)) return result('timeout', true);
  if (['MODEL_REQUIRED','NO_MODEL','INVALID_PROVIDER','NO_ADAPTER','UNKNOWN_MODEL','MODEL_UNSUPPORTED','INVALID_CONFIG','INVALID_MODEL_INFO','INVALID_MODEL_CONTEXT','INVALID_MODEL_MAX_TOKENS','INVALID_MODEL_REASONING','UNSUPPORTED_OPTION','UNSUPPORTED_REASONING_EFFORT'].includes(code)) return result('configuration');
  if (status === 401 || status === 403 || ['AUTH','BILLING','PROVIDER_AUTH','MISSING_CREDENTIAL','INVALID_CREDENTIAL','ACCOUNT_SIGN_IN_REQUIRED','ACCOUNT_TOKEN_INVALID','ACCOUNT_QUOTA','QUOTA'].includes(code)) return result('authentication');
  if (status === 429 || ['RATE_LIMIT','PROVIDER_RATE_LIMIT','BUSY'].includes(code)) return result('rate-limit', true);
  if (status >= 500 || ['NETWORK_SERVICE_ERROR','NETWORK_ERROR','TRANSPORT','STREAM_CLOSED','SERVER','ECONNRESET','ECONNREFUSED','ENOTFOUND','EAI_AGAIN','UND_ERR_SOCKET'].includes(code)) return result('connection', true);
  if (['MODEL_INVALID','MODEL_EMPTY','MODEL_TRUNCATED','MODEL_TOO_LARGE','EMPTY_RESPONSE','INVALID_RESPONSE','MALFORMED_RESPONSE'].includes(code)) return result('format');
  if (code === 'FIDELITY_FAILED') return result('fidelity');
  // Message matching is local only. Do not copy any matched message into the result.
  if (/fetch failed|network(?: request)? (?:failed|error)|socket hang up|ECONNRESET|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|\bDNS\b/i.test(String(error?.message ?? ''))) return result('connection', true);
  return result('model');
}
export function failureCode(failure) {
  return ({ configuration:'MODEL_REQUIRED', cancelled:'CANCELLED', timeout:'TIMEOUT', connection:'NETWORK_SERVICE_ERROR', authentication:'PROVIDER_AUTH', 'rate-limit':'PROVIDER_RATE_LIMIT' })[failure.category] ?? 'MODEL_FAILED';
}
