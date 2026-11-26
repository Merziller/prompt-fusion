#!/usr/bin/env node
// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { enhance, VERSION, FusionError, LIMITS } from '../src/core.mjs';
import { createHttpProvider } from '../src/providers.mjs';
import { startMcp } from '../src/mcp.mjs';
import { installSkill, uninstallSkill, makeConfig, TARGETS } from '../src/install.mjs';
import { startHttp } from '../src/http.mjs';
export async function readStdin(stream = process.stdin, maxBytes = LIMITS.inputBytes * 2) {
  const chunks = []; let size = 0;
  for await (const chunk of stream) { const value = Buffer.from(chunk); size += value.length; if (size > maxBytes) throw new FusionError('INPUT_TOO_LARGE', 'Standard input exceeds budget.'); chunks.push(value); }
  return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
}
function flags(args) {
  const out = { _: [] }; const toggles = ['json', 'model', 'voice', 'dry-run', 'help', 'version'];
  const valued = ['domain', 'mode', 'intensity', 'language', 'layout', 'target', 'scope', 'root', 'out', 'file', 'skills-dir', 'skill-dir', 'host', 'port', 'token-env', 'allow-origin', 'server-url'];
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
  if (!['enhance', 'mcp', 'serve', 'install', 'uninstall', 'config', 'targets'].includes(command)) command = 'enhance'; else f._.shift();
  if (f.help || (!args.length && process.stdin.isTTY)) {
    console.log(`Prompt Fusion ${VERSION}\nUsage:\n  prompt-fusion enhance --file prompt.txt [--domain code] [--mode smart --model] [--json]\n  echo prompt | prompt-fusion enhance\n  prompt-fusion enhance --json < request.json\n  prompt-fusion mcp\n  prompt-fusion serve --host 127.0.0.1 --port 8765 [--token-env PROMPT_FUSION_TOKEN]\n  prompt-fusion install --target codex --scope project --root PROJECT [--dry-run]\n  prompt-fusion install --target ANY_LABEL --skills-dir AGENT_SKILLS_DIRECTORY [--dry-run]\n  prompt-fusion uninstall --skill-dir EXACT_INSTALLED_DIRECTORY [--dry-run]\n  prompt-fusion config --target generic [--out entry.json]\n  prompt-fusion config --target claude|workbuddy|kimi [--out snippet.json]\n  prompt-fusion config --target http --server-url https://YOUR_HOST/mcp\n  prompt-fusion targets\n\nNo network by default: semantic rewriting retains the original with a MODEL_REQUIRED warning until --model explicitly enables FUSION_BASE_URL, FUSION_MODEL and optional FUSION_API_KEY. Use --mode standard for legacy offline guidance. MCP, serve and config also accept --model. The embedded task is never executed.`); return;
  }
  const modelProviders = () => f.model ? [createHttpProvider({ baseUrl: process.env.FUSION_BASE_URL, model: process.env.FUSION_MODEL, apiKey: process.env.FUSION_API_KEY })] : [];
  if (command === 'mcp') { startMcp({ providers: modelProviders() }); return; }
  if (command === 'targets') { console.log(JSON.stringify(TARGETS, null, 2)); return; }
  if (command === 'install') { console.log(JSON.stringify(await installSkill({ target: f.target, scope: f.scope, destinationRoot: f.root, skillsDir: f['skills-dir'], dryRun: !!f['dry-run'] }), null, 2)); return; }
  if (command === 'uninstall') { console.log(JSON.stringify(await uninstallSkill({ skillDir: f['skill-dir'], dryRun: !!f['dry-run'] }), null, 2)); return; }
  if (command === 'serve') {
    if (f.port !== undefined && !/^\d+$/.test(f.port)) throw new FusionError('INVALID_LISTEN', 'Port must be an integer.');
    if (f['token-env'] && !/^[A-Za-z_][A-Za-z0-9_]{0,79}$/.test(f['token-env'])) throw new FusionError('INVALID_TOKEN', 'Provide an environment variable name.');
    const token = f['token-env'] ? process.env[f['token-env']] : undefined;
    if (f['token-env'] && !token) throw new FusionError('MISSING_TOKEN', 'The selected token environment variable is empty.');
    const providers = modelProviders();
    const server = await startHttp({ host: f.host, port: f.port === undefined ? 8765 : Number(f.port), token, allowedOrigins: f['allow-origin'] ? f['allow-origin'].split(',').map(x => x.trim()) : [], providers });
    let stopping = false;
    const stop = async () => { if (stopping) return; stopping = true; process.off('SIGINT', stop); process.off('SIGTERM', stop); await server.close(); };
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
    console.log(JSON.stringify({ url: server.url, mcp: server.url + '/mcp', openapi: server.url + '/openapi.json', transport: server.transport, authentication: server.authentication })); return;
  }
  if (command === 'config') { const config = makeConfig(f.target, { serverUrl: f['server-url'], model: !!f.model }); const text = typeof config === 'string' ? config : JSON.stringify(config, null, 2) + '\n'; if (f.out) await writeFile(f.out, text, { flag: 'wx' }); else process.stdout.write(text); return; }
  let input;
  if (f.file) { const data = await readFile(f.file); if (data.length > LIMITS.inputBytes * 2) throw new FusionError('INPUT_TOO_LARGE', 'Input file exceeds budget.'); input = new TextDecoder('utf-8', { fatal: true }).decode(data); }
  else input = f._.length ? f._.join(' ') : await readStdin();
  let request;
  if (f.json) { try { request = JSON.parse(input); } catch { throw new FusionError('INVALID_JSON', 'Input must be one JSON request object.'); } }
  else request = { input };
  if (!request || typeof request !== 'object' || Array.isArray(request)) throw new FusionError('INVALID_INPUT', 'Request must be a JSON object.');
  for (const key of ['domain', 'mode', 'intensity', 'language', 'layout']) if (f[key]) request[key] = f[key];
  if (f.voice) request.voice = true;
  const providers = modelProviders();
  const result = await enhance(request, { providers });
  process.stdout.write(f.json ? JSON.stringify(result, null, 2) + '\n' : result.enhanced + '\n');
  if (!f.json && result.warnings.length) process.stderr.write(JSON.stringify({ warnings: result.warnings }) + '\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => {
  process.stderr.write(JSON.stringify({ code: e instanceof FusionError ? e.code : 'INTERNAL_ERROR', message: e instanceof FusionError ? e.message : 'Command failed. Check configuration and input.' }) + '\n'); process.exitCode = 1;
});
