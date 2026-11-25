// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
import { mkdir, readFile, writeFile, lstat, realpath, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { FusionError } from './core.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
// Convenience paths, not a host allowlist. Unknown brands use an explicit skillsDir.
export const TARGETS = Object.freeze({
  codex: { project: '.agents/skills', user: '.agents/skills' },
  claude: { project: '.claude/skills', user: '.claude/skills' },
  antigravity: { project: '.agents/skills', user: '.gemini/config/skills' },
  openclaw: { project: 'skills', user: '.openclaw/skills' },
  opencode: { project: '.opencode/skills', user: '.config/opencode/skills' },
  pi: { project: '.agents/skills', user: '.agents/skills' },
  hermes: { user: '.hermes/skills' },
  kimi: { project: '.agents/skills', user: '.agents/skills' }
});
const digest = (s) => createHash('sha256').update(s).digest('hex');
const ownedFiles = ['SKILL.md', 'scripts/core.mjs', 'scripts/structure.mjs', 'scripts/enhance.mjs', 'LICENSE'];
async function existing(p) { try { return await lstat(p); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } }
// macOS exposes these root-level OS aliases; only their canonical targets are allowed.
const macRootAliases = Object.freeze({ '/var': '/private/var', '/tmp': '/private/tmp', '/etc': '/private/etc' });
export function isSystemPathAlias(platform, alias, target) {
  return platform === 'darwin' && Object.hasOwn(macRootAliases, alias) && macRootAliases[alias] === target;
}
async function checkPath(p) {
  const absolute = path.resolve(p), parts = absolute.slice(path.parse(absolute).root.length).split(path.sep).filter(Boolean);
  let cursor = path.parse(absolute).root;
  for (const piece of parts) {
    cursor = path.join(cursor, piece);
    const item = await existing(cursor);
    if (item?.isSymbolicLink()) {
      if (isSystemPathAlias(process.platform, cursor, await realpath(cursor))) continue;
      throw new FusionError('UNSAFE_PATH', 'Path contains a symlink or junction.');
    }
    if (item && !item.isDirectory()) throw new FusionError('INVALID_PATH', 'A directory path contains a file.');
  }
  return absolute;
}
export async function installSkill({ target = 'generic', scope = 'project', destinationRoot, skillsDir, home = os.homedir(), dryRun = false }) {
  if (typeof target !== 'string' || !target.trim() || target.length > 100) throw new FusionError('UNSUPPORTED_TARGET', 'Provide a host label or generic.');
  let parent, actualScope = scope;
  if (skillsDir !== undefined) {
    if (typeof skillsDir !== 'string' || !skillsDir.trim()) throw new FusionError('INVALID_PATH', 'skillsDir must be a directory path.');
    parent = await checkPath(skillsDir); actualScope = 'custom';
  } else {
    const item = TARGETS[target];
    if (!item || !['project', 'user'].includes(scope) || !item[scope]) throw new FusionError('UNSUPPORTED_TARGET', 'Use --skills-dir for any other Agent Skills host; Hermes requires user scope.');
    const base = path.resolve(destinationRoot ?? (scope === 'project' ? process.cwd() : home));
    if (!(await existing(base))?.isDirectory()) throw new FusionError('INVALID_PATH', 'Installation root must be an existing directory.');
    parent = await checkPath(path.join(base, item[scope]));
  }
  const destination = path.join(parent, 'prompt-fusion');
  await checkPath(destination);
  if (await existing(destination)) throw new FusionError('ALREADY_INSTALLED', 'Destination exists; existing files were retained.');
  if (dryRun) return { target, scope: actualScope, destination, changed: false };
  const files = {
    'SKILL.md': await readFile(path.join(root, 'skills/prompt-fusion/SKILL.md'), 'utf8'),
    'scripts/core.mjs': await readFile(path.join(root, 'src/core.mjs'), 'utf8'),
    'scripts/structure.mjs': await readFile(path.join(root, 'src/structure.mjs'), 'utf8'),
    'scripts/enhance.mjs': (await readFile(path.join(root, 'skills/prompt-fusion/scripts/enhance.mjs'), 'utf8')).replace('../../../src/core.mjs', './core.mjs'),
    'LICENSE': await readFile(path.join(root, 'LICENSE'), 'utf8')
  };
  await mkdir(parent, { recursive: true });
  // Exclusive destination creation fails closed if another installer wins the race.
  await mkdir(destination);
  await mkdir(path.join(destination, 'scripts'));
  for (const [name, content] of Object.entries(files)) await writeFile(path.join(destination, name), content, { flag: 'wx' });
  const receipt = { owner: '@merziller/prompt-fusion', target, scope: actualScope, files: Object.fromEntries(Object.entries(files).map(([name, content]) => [name, digest(content)])) };
  await writeFile(path.join(destination, '.prompt-fusion-install.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  return { target, scope: actualScope, destination: await realpath(destination), changed: true, files: Object.keys(files) };
}
export async function uninstallSkill({ skillDir, dryRun = false } = {}) {
  if (typeof skillDir !== 'string' || !skillDir.trim()) throw new FusionError('INVALID_PATH', 'Provide the exact installed prompt-fusion directory.');
  const destination = await checkPath(skillDir);
  let receipt;
  try { receipt = JSON.parse(await readFile(path.join(destination, '.prompt-fusion-install.json'), 'utf8')); }
  catch { throw new FusionError('NOT_OWNED', 'A valid Prompt Fusion installation receipt is required.'); }
  if (receipt.owner !== '@merziller/prompt-fusion' || JSON.stringify(Object.keys(receipt.files ?? {}).sort()) !== JSON.stringify([...ownedFiles].sort())) throw new FusionError('NOT_OWNED', 'Receipt does not describe this installation.');
  const expected = new Set([...ownedFiles, '.prompt-fusion-install.json']);
  async function inspect(dir, prefix = '') {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const rel = prefix + entry.name;
      if (entry.isSymbolicLink()) throw new FusionError('UNSAFE_PATH', 'Installation contains a symlink.');
      if (entry.isDirectory() && rel === 'scripts') await inspect(path.join(dir, entry.name), 'scripts/');
      else if (!entry.isFile() || !expected.has(rel)) throw new FusionError('MODIFIED_INSTALL', 'Extra files were retained; review the directory manually.');
    }
  }
  await inspect(destination);
  for (const name of ownedFiles) {
    let content; try { content = await readFile(path.join(destination, name)); } catch { throw new FusionError('MODIFIED_INSTALL', 'Installation is incomplete; no files removed.'); }
    if (digest(content) !== receipt.files[name]) throw new FusionError('MODIFIED_INSTALL', 'A file was edited; no files removed.');
  }
  if (!dryRun) await rm(destination, { recursive: true });
  return { destination, changed: !dryRun };
}
export function makeConfig(target, { nodePath = process.execPath, cliPath = path.join(root, 'bin/prompt-fusion.mjs'), serverUrl } = {}) {
  if (serverUrl !== undefined || target === 'http') {
    let url;
    try { url = new URL(serverUrl ?? 'http://127.0.0.1:8765/mcp'); } catch { throw new FusionError('INVALID_SERVER_URL', 'Provide a complete MCP HTTP endpoint URL.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash || url.search) throw new FusionError('INVALID_SERVER_URL', 'Use HTTP(S) without embedded credentials, query tokens or fragments.');
    const entry = { type: target === 'workbuddy' ? 'streamableHttp' : 'http', url: url.href };
    if (['generic', 'http'].includes(target)) return entry;
    if (['claude', 'kimi', 'workbuddy'].includes(target)) return { mcpServers: { prompt_fusion: entry } };
    throw new FusionError('UNSUPPORTED_CONFIG', 'Use config --target http for neutral remote connection details; consult the host format.');
  }
  const entry = { command: nodePath, args: [cliPath, 'mcp'] };
  if (target === 'codex') return `[mcp_servers.prompt_fusion]\ncommand = ${JSON.stringify(nodePath)}\nargs = ${JSON.stringify(entry.args)}\n`;
  if (target === 'opencode') return { $schema: 'https://opencode.ai/config.json', mcp: { servers: { prompt_fusion: { type: 'local', command: [nodePath, ...entry.args] } } } };
  if (['claude', 'antigravity', 'kimi', 'workbuddy'].includes(target)) return { mcpServers: { prompt_fusion: entry } };
  if (target === 'generic' || target === 'stdio') return entry;
  throw new FusionError('UNSUPPORTED_CONFIG', 'Use config --target generic for neutral command/args, or install --skills-dir for a custom Skill host.');
}
