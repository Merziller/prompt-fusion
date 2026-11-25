#!/usr/bin/env node
// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
import { enhance, FusionError } from '../../../src/core.mjs';
let size = 0; const chunks = [];
try {
  for await (const chunk of process.stdin) { size += chunk.length; if (size > 131072) throw new FusionError('BODY_TOO_LARGE', 'Input exceeds 128 KiB.'); chunks.push(chunk); }
  let request; try { request = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new FusionError('INVALID_JSON', 'Provide a JSON request on stdin.'); }
  process.stdout.write(JSON.stringify(await enhance(request)) + '\n');
} catch (e) { process.stderr.write(JSON.stringify({ error: { code: e instanceof FusionError ? e.code : 'INTERNAL_ERROR', message: e instanceof FusionError ? e.message : 'Enhancement failed; original retained.' } }) + '\n'); process.exitCode = 1; }
