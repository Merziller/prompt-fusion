// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
// Candidate identity verification only. This is not a real-model or GUI acceptance gate.
import { readFile, readdir, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const sha = value => createHash('sha256').update(value).digest('hex');
const ensure = (value, message) => { if (!value) throw new Error(message); };
export async function verifyFixCandidate(projectDir, manifestFile = 'evals/fixes/0.5.1-dev/manifest.json') {
  const root = path.resolve(projectDir), manifest = JSON.parse(await readFile(path.resolve(root, manifestFile), 'utf8'));
  ensure(manifest.schema === 'prompt-fusion-fix-candidate-v1', 'Unsupported candidate manifest');
  ensure(Array.isArray(manifest.files) && manifest.files.length > 0 && manifest.files.length <= 128, 'Invalid manifest inventory');
  const paths = new Set();
  for (const item of manifest.files) {
    ensure(typeof item.path === 'string' && item.path.length > 0 && !path.isAbsolute(item.path) && !/[:\\]/u.test(item.path) && item.path.split('/').every(part => part && part !== '.' && part !== '..'), 'Unsafe manifest path');
    ensure(!paths.has(item.path), 'Duplicate manifest path'); paths.add(item.path);
    ensure(/^[a-f0-9]{64}$/u.test(item.sha256) && Number.isSafeInteger(item.bytes) && item.bytes >= 0 && item.bytes <= 8388608, 'Invalid file identity');
    let full = root;
    for (const part of item.path.split('/')) { full = path.join(full, part); ensure(!(await lstat(full)).isSymbolicLink(), 'Manifest path is a symlink'); }
    const info = await lstat(full); ensure(info.isFile(), 'Manifest entry is not a file');
    const data = await readFile(full); ensure(data.length === item.bytes && sha(data) === item.sha256, 'Candidate bytes changed: ' + item.path);
  }
  const actualModules = (await readdir(path.join(root, 'src'), { withFileTypes:true })).filter(entry => entry.name.endsWith('.mjs')).map(entry => 'src/' + entry.name).sort();
  const expectedModules = [...paths].filter(name => name.startsWith('src/') && name.endsWith('.mjs')).sort();
  ensure(JSON.stringify(actualModules) === JSON.stringify(expectedModules), 'Runtime module inventory changed');
  for (const required of ['package.json', '.claude-plugin/plugin.json', 'src/core.mjs', 'src/intent-guards.mjs', 'adapters/dsh/client-source.js', 'adapters/dsh/client.js', 'adapters/dsh/undo-state.mjs', 'locale/zh.json', 'locale/en.json']) ensure(paths.has(required), 'Required identity missing: ' + required);
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const plugin = JSON.parse(await readFile(path.join(root, '.claude-plugin/plugin.json'), 'utf8'));
  const core = await readFile(path.join(root, 'src/core.mjs'), 'utf8');
  const coreVersion = core.match(/export const VERSION = '([^']+)'/u)?.[1];
  ensure(pkg.version === manifest.version && plugin.version === manifest.version && coreVersion === manifest.version, 'Candidate versions differ');
  const client = await readFile(path.join(root, 'adapters/dsh/client-source.js'), 'utf8');
  const baseline = JSON.parse(await readFile(path.join(root, 'evals/ui-contract.json'), 'utf8'));
  ensure(sha(client.match(/const css = ([\s\S]+?);\n/u)?.[1] ?? '') === baseline.cssSha256, 'Button CSS changed');
  ensure(sha(client.match(/const icon = ([\s\S]+?);\n/u)?.[1] ?? '') === baseline.iconSha256, 'Button icon changed');
  ensure(client.includes("'" + baseline.slot + "'"), 'Button slot changed');
  ensure(manifest.realModelRegression === 'NOT_RUN' && manifest.authenticatedGui === 'NOT_RUN', 'Unexpected candidate verification claim');
  return { status:'PASS', version:manifest.version, files:paths.size, runtimeModules:actualModules.length, qualityAcceptance:'NOT_CLAIMED', authenticatedGui:'NOT_RUN', realModelRegression:'NOT_RUN', scope:'Exact local fix candidate bytes, module inventory, aligned metadata and frozen button appearance. Behavioral tests are separate receipts.' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
  console.log(JSON.stringify(await verifyFixCandidate(root), null, 2));
}
