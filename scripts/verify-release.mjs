// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
// Offline release gate. A passing report is not a native-host compatibility claim.
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadEvaluation } from './score-evaluation.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
const requireThat = (value, message) => { if (!value) throw new Error(message); };
const read = file => readFile(file, 'utf8');
const json = async file => JSON.parse(await read(file));
function withoutVersion(source, file) {
  if (file !== 'core.mjs') return source;
  requireThat((source.match(/^export const VERSION = '[^']+';$/gm) ?? []).length === 1, 'Expected one explicit core version');
  return source.replace(/^export const VERSION = '[^']+';$/m, "export const VERSION = '<release-version>';" );
}
export async function verifyRuntimeParity(projectDir, evidenceDir) {
  const current = path.join(projectDir, 'src'), frozen = path.join(evidenceDir, 'runtime');
  const entries = await readdir(current, { withFileTypes: true });
  requireThat(entries.every(item => item.isFile() && item.name.endsWith('.mjs')), 'Unexpected runtime entry');
  const names = entries.map(item => item.name).sort();
  const frozenNames = (await readdir(frozen)).sort();
  requireThat(names.join('\n') === frozenNames.join('\n'), 'Runtime file inventory changed after evaluation');
  const files = [];
  for (const name of names) {
    const actual = await read(path.join(current, name)), expected = await read(path.join(frozen, name));
    requireThat(withoutVersion(actual, name) === withoutVersion(expected, name), 'Runtime changed after evaluation: ' + name);
    files.push({ path: 'src/' + name, sha256: sha(actual), evaluatedSha256: sha(expected), versionOnlyChange: actual !== expected });
  }
  return files;
}
export async function verifyRelease({ projectDir, evidenceDir }) {
  const { data, result, integrity } = await loadEvaluation(evidenceDir);
  requireThat(result.complete && result.passed, 'Quality gate not satisfied: complete=' + result.complete + ', passed=' + result.passed);
  const files = await verifyRuntimeParity(projectDir, evidenceDir);
  const manifest = await json(path.join(evidenceDir, 'runtime-manifest.json'));
  const core = await read(path.join(projectDir, 'src/core.mjs'));
  const version = core.match(/^export const VERSION = '([^']+)';$/m)?.[1];
  const pkg = await json(path.join(projectDir, 'package.json'));
  const claude = await json(path.join(projectDir, '.claude-plugin/plugin.json'));
  requireThat(/^\d+\.\d+\.\d+$/.test(version ?? '') && pkg.version === version && claude.version === version, 'Release versions are not aligned and stable');
  requireThat(sha(await read(path.join(projectDir, 'docs/evaluation/OPTIMIZATION_PROTOCOL.md'))) === manifest.protocol, 'Frozen evaluation protocol changed');
  const baseline = await json(path.join(projectDir, 'evals/ui-contract.json'));
  const client = await read(path.join(projectDir, 'adapters/dsh/client-source.js'));
  const css = client.match(/  const css = ([\s\S]+?);\n/)?.[1];
  const icon = client.match(/  const icon = ([\s\S]+?);\n/)?.[1];
  requireThat(css && icon && sha(css) === baseline.cssSha256 && sha(css) === manifest.css && sha(icon) === baseline.iconSha256 && client.includes("name:'" + baseline.slot + "'"), 'Approved single-button appearance changed');
  return { status: 'PASS', version, round: data.round, quality: result.aggregate.filter(row => row.product === 'fusion'), integrity, runtime: files, ui: { cssSha256: sha(css), iconSha256: sha(icon), slot: baseline.slot }, scope: 'Frozen quality gate, exact core parity except version literal, metadata and UI appearance; native-host and package execution require their own tests.' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const round = process.argv[2];
  if (!/^semantic-round-\d{2}$/.test(round ?? '')) throw new Error('Provide the accepted semantic-round-NN');
  const report = await verifyRelease({ projectDir, evidenceDir: path.join(projectDir, 'evals/semantic-rounds', round) });
  console.log(JSON.stringify(report, null, 2));
}
