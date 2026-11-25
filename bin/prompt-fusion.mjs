#!/usr/bin/env node
// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { enhance, VERSION, FusionError, LIMITS } from '../src/core.mjs';
import { createHttpProvider } from '../src/providers.mjs';
import { startMcp } from '../src/mcp.mjs';
import { installSkill, makeConfig, TARGETS } from '../src/install.mjs';
export async function readStdin(stream = process.stdin, maxBytes = LIMITS.inputBytes * 2) {
  const chunks = []; let size = 0;
  for await (const chunk of stream) { const value = Buffer.from(chunk); size += value.length; if (size > maxBytes) throw new FusionError('INPUT_TOO_LARGE', 'Standard input exceeds budget.'); chunks.push(value); }
  return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
}
function flags(args) {
  const out = { _: [] }; const toggles = ['json', 'model', 'voice', 'dry-run', 'help', 'version'];
  const valued = ['domain', 'mode', 'intensity', 'language', 'target', 'scope', 'root', 'out', 'file'];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]; if (a === '--') { out._.push(...args.slice(i + 1)); break; }
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const key = a.slice(2);
    if (toggles.includes(key)) out[key] = true;
    else if (valued.includes(key) && args[i + 1] !== undefined && !args[i + 1].startsWith('--')) out[key] = args[++i];
    else throw new FusionError('INVALID_OPTION', `Unknown option or missing value: ${a}`);
  } return out;
}
export async function main(args = process.argv.slice(2)) {
  const f = flags(args);
  if (f.version) { console.log(VERSION); return; }
  let command = f._[0];
  if (!['enhance', 'mcp', 'install', 'config', 'targets'].includes(command)) command = 'enhance'; else f._.shift();
  if (f.help || (!args.length && process.stdin.isTTY)) {
    console.log(`Prompt Fusion ${VERSION}\nUsage:\n  prompt-fusion enhance --file prompt.txt [--domain code] [--mode smart --model] [--json]\n  echo prompt | prompt-fusion enhance\n  prompt-fusion enhance --json < request.json\n  prompt-fusion mcp\n  prompt-fusion install --target codex --scope project --root PROJECT [--dry-run]\n  prompt-fusion config --target claude [--out snippet.json]\n  prompt-fusion targets\n\nOffline by default. --model explicitly enables FUSION_BASE_URL, FUSION_MODEL and optional FUSION_API_KEY. The original task is never executed.`); return;
  }
  if (command === 'mcp') { startMcp(); return; }
  if (command === 'targets') { console.log(JSON.stringify(TARGETS, null, 2)); return; }
  if (command === 'install') { console.log(JSON.stringify(await installSkill({ target: f.target, scope: f.scope, destinationRoot: f.root, dryRun: !!f['dry-run'] }), null, 2)); return; }
  if (command === 'config') { const config = makeConfig(f.target); const text = typeof config === 'string' ? config : JSON.stringify(config, null, 2) + '\n'; if (f.out) await writeFile(f.out, text, { flag: 'wx' }); else process.stdout.write(text); return; }
  let input;
  if (f.file) { const data = await readFile(f.file); if (data.length > LIMITS.inputBytes * 2) throw new FusionError('INPUT_TOO_LARGE', 'Input file exceeds budget.'); input = new TextDecoder('utf-8', { fatal: true }).decode(data); }
  else input = f._.length ? f._.join(' ') : await readStdin();
  let request;
  if (f.json) { try { request = JSON.parse(input); } catch { throw new FusionError('INVALID_JSON', 'Input must be one JSON request object.'); } }
  else request = { input };
  if (!request || typeof request !== 'object' || Array.isArray(request)) throw new FusionError('INVALID_INPUT', 'Request must be a JSON object.');
  for (const key of ['domain', 'mode', 'intensity', 'language']) if (f[key]) request[key] = f[key];
  if (f.voice) request.voice = true;
  const providers = [];
  if (f.model) { providers.push(createHttpProvider({ baseUrl: process.env.FUSION_BASE_URL, model: process.env.FUSION_MODEL, apiKey: process.env.FUSION_API_KEY })); if (request.mode === undefined) request.mode = 'smart'; }
  const result = await enhance(request, { providers });
  process.stdout.write(f.json ? JSON.stringify(result, null, 2) + '\n' : result.enhanced + '\n');
  if (!f.json && result.warnings.length) process.stderr.write(JSON.stringify({ warnings: result.warnings }) + '\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => {
  process.stderr.write(JSON.stringify({ code: e instanceof FusionError ? e.code : 'INTERNAL_ERROR', message: e instanceof FusionError ? e.message : 'Command failed. Check configuration and input.' }) + '\n'); process.exitCode = 1;
});
