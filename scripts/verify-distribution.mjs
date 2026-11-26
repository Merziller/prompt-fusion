// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
// Verify a release's exact files and retained evidence; this never assigns a quality score.
import { readFile, readdir, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checkCandidate } from '../src/rewrite.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ensure = (ok, message) => { if (!ok) throw new Error(message); };
export const DISTRIBUTION_MANIFEST = 'evals/releases/0.5.1/manifest.json';
const directories = ['src', 'adapters', 'bin', 'scripts', 'tests', 'skills', 'locale'];
export async function distributionCodeFiles(root) {
  async function walk(dir) {
    const names = [];
    for (const entry of await readdir(path.join(root, dir), { withFileTypes:true })) {
      ensure(!entry.isSymbolicLink(), 'Distribution contains a symlink');
      const name = dir + '/' + entry.name;
      if (entry.isDirectory()) names.push(...await walk(name));
      else { ensure(entry.isFile(), 'Distribution contains a non-file'); names.push(name); }
    }
    return names;
  }
  const groups = await Promise.all(directories.map(walk));
  return groups.flat().sort();
}
export async function verifyDistribution(projectDir, manifestFile = DISTRIBUTION_MANIFEST) {
  const root = path.resolve(projectDir), read = name => readFile(path.join(root, name));
  const manifest = JSON.parse(await read(manifestFile));
  ensure(manifest.schema === 'prompt-fusion-distribution-v1', 'Unsupported distribution manifest');
  ensure(/^\d+\.\d+\.\d+$/.test(manifest.version ?? ''), 'Release version is not stable');
  ensure(Array.isArray(manifest.files) && manifest.files.length > 0 && manifest.files.length <= 160, 'Invalid distribution inventory');
  const paths = new Set(); let total = 0;
  for (const item of manifest.files) {
    ensure(typeof item.path === 'string' && item.path.length && !path.isAbsolute(item.path) && !/[:\\]/u.test(item.path) && item.path.split('/').every(part => part && part !== '.' && part !== '..'), 'Unsafe manifest path');
    ensure(!paths.has(item.path), 'Duplicate manifest path'); paths.add(item.path);
    ensure(/^[a-f0-9]{64}$/.test(item.sha256) && Number.isSafeInteger(item.bytes) && item.bytes >= 0 && item.bytes <= 8388608, 'Invalid file identity');
    total += item.bytes; ensure(total <= 33554432, 'Distribution inventory exceeds budget');
    let full = root;
    for (const part of item.path.split('/')) { full = path.join(full, part); ensure(!(await lstat(full)).isSymbolicLink(), 'Manifest path is a symlink'); }
    ensure((await lstat(full)).isFile(), 'Manifest entry is not a file');
    const bytes = await read(item.path);
    ensure(bytes.length === item.bytes && sha(bytes) === item.sha256, 'Distribution bytes changed: ' + item.path);
  }
  const actualCode = await distributionCodeFiles(root);
  const expectedCode = [...paths].filter(name => directories.some(dir => name.startsWith(dir + '/'))).sort();
  ensure(JSON.stringify(actualCode) === JSON.stringify(expectedCode), 'Runtime or verification file inventory changed');
  for (const required of ['package.json', '.claude-plugin/plugin.json', '.mcp.json', 'cordis.patch.yml', 'README.md', 'README.en.md', 'AUTHORS.md', 'LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md', 'evals/ui-contract.json', 'src/intent-guards.mjs', 'adapters/dsh/undo-state.mjs']) ensure(paths.has(required), 'Required identity missing: ' + required);
  const pkg = JSON.parse(await read('package.json')), plugin = JSON.parse(await read('.claude-plugin/plugin.json'));
  const core = (await read('src/core.mjs')).toString('utf8');
  ensure(pkg.version === manifest.version && plugin.version === manifest.version && core.match(/export const VERSION = '([^']+)'/u)?.[1] === manifest.version, 'Distribution versions differ');
  ensure(pkg.name === '@merziller/prompt-fusion' && pkg.bin?.['prompt-fusion'] === './bin/prompt-fusion.mjs' && plugin.name === 'prompt-fusion', 'Public package or command identity changed');
  ensure(pkg.license === 'Apache-2.0' && Object.keys(pkg.dependencies ?? {}).length === 0 && !pkg.scripts?.preinstall && !pkg.scripts?.postinstall && !pkg.scripts?.prepare, 'Unexpected licensing, runtime dependencies or install hooks');
  const copyright = 'Copyright 2026 绍兴市柯桥区禾杨智绘软件开发工作室 (禾杨智绘) & Merziller (子墨)';
  ensure(pkg.copyright === copyright && (await read('LICENSE')).toString() === (await read('third-party/licenses/Fishsb-Apache-2.0.txt')).toString() + '\n' + copyright + '\n', 'Apache text or attribution changed');
  ensure(sha(await read('THIRD_PARTY_NOTICES.md')) === manifest.thirdPartyNoticesSha256, 'Upstream notices changed');
  const baseline = JSON.parse(await read('evals/ui-contract.json')), client = (await read('adapters/dsh/client-source.js')).toString();
  ensure(sha(client.match(/const css = ([\s\S]+?);\n/u)?.[1] ?? '') === baseline.cssSha256 && sha(client.match(/const icon = ([\s\S]+?);\n/u)?.[1] ?? '') === baseline.iconSha256 && client.includes("'" + baseline.slot + "'"), 'Approved single-button appearance changed');
  const predecessor = manifest.behaviorBaseline;
  ensure(predecessor && paths.has(predecessor.path) && sha(await read(predecessor.path)) === predecessor.sha256, 'Behavior baseline identity mismatch');
  const old = JSON.parse(await read(predecessor.path));
  const behaviorFiles = old.files.filter(item => /^(?:src|adapters|bin)\//u.test(item.path));
  ensure(JSON.stringify(actualCode.filter(name => /^(?:src|adapters|bin)\//u.test(name))) === JSON.stringify(behaviorFiles.map(item => item.path).sort()), 'Behavior module inventory differs from tested fix');
  for (const item of behaviorFiles) {
    let bytes = await read(item.path);
    if (item.path === 'src/core.mjs') bytes = Buffer.from(bytes.toString().replace(/^export const VERSION = '[^']+';$/m, `export const VERSION = '${old.version}';`));
    ensure(sha(bytes) === item.sha256, 'Behavior differs from tested fix: ' + item.path);
  }
  ensure(manifest.qualityAcceptance === 'NOT_CLAIMED_FOR_RELEASE' && manifest.authenticatedGui === 'NOT_RUN', 'Unexpected release evidence claim');
  const evidence = manifest.hostObservations;
  ensure(evidence && paths.has(evidence.path), 'Retained host observation file missing');
  const observations = JSON.parse(await read(evidence.path));
  ensure(observations.version === old.version && observations.authenticatedGuiTested === false && observations.newQualityScore === null && observations.observations?.length === 8, 'Invalid retained host observation scope');
  for (const item of observations.observations) {
    const result = item.result;
    ensure(result.version === old.version && result.engine === 'model-rewrite' && result.warnings?.length === 0, 'Invalid retained host result');
    ensure(checkCandidate(result.original, result.enhanced, result.layout).length === 0, 'Retained sample violates current guards');
  }
  return { status:'PASS', version:manifest.version, files:paths.size, runtimeModules:actualCode.filter(name => name.startsWith('src/')).length, behaviorBaseline:'PASS_EXCEPT_VERSION', hostObservations:8, authenticatedGui:'NOT_RUN', qualityAcceptance:'NOT_CLAIMED_FOR_RELEASE', ui:baseline, scope:'Exact distribution identity, compatibility, unchanged tested behavior except version, and retained host sample checks. Not a fresh whole-product quality or native GUI claim.' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await verifyDistribution(fileURLToPath(new URL('../', import.meta.url))), null, 2));
}
