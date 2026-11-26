#!/usr/bin/env node
// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
import { enhance, FusionError } from '../../../src/core.mjs';
import { createHttpProvider } from '../../../src/providers.mjs';
let size = 0; const chunks = [];
try {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--json', '--model'].includes(arg))) throw new FusionError('INVALID_OPTION', 'Use --json and optional --model only.');
  for await (const chunk of process.stdin) { size += chunk.length; if (size > 131072) throw new FusionError('BODY_TOO_LARGE', 'Input exceeds 128 KiB.'); chunks.push(chunk); }
  let request; try { request = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); } catch { throw new FusionError('INVALID_JSON', 'Provide a UTF-8 JSON request on stdin.'); }
  const providers = args.includes('--model') ? [createHttpProvider({ baseUrl: process.env.FUSION_BASE_URL, model: process.env.FUSION_MODEL, apiKey: process.env.FUSION_API_KEY })] : [];
  process.stdout.write(JSON.stringify(await enhance(request, { providers })) + '\n');
} catch (e) { process.stderr.write(JSON.stringify({ error: { code: e instanceof FusionError ? e.code : 'INTERNAL_ERROR', message: e instanceof FusionError ? e.message : 'Enhancement failed; original retained.' } }) + '\n'); process.exitCode = 1; }
