// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
import { mkdir, readFile, writeFile, lstat, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { FusionError } from './core.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
export const TARGETS = Object.freeze({
  codex: { project: '.agents/skills', user: '.agents/skills' },
  claude: { project: '.claude/skills', user: '.claude/skills' },
  antigravity: { project: '.agents/skills', user: '.gemini/config/skills' },
  openclaw: { project: 'skills', user: '.openclaw/skills' },
  opencode: { project: '.opencode/skills', user: '.config/opencode/skills' },
  pi: { project: '.agents/skills', user: '.agents/skills' },
  hermes: { user: '.hermes/skills' }
});
const digest = (s) => createHash('sha256').update(s).digest('hex');
async function existing(p) { try { return await lstat(p); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } }
export async function installSkill({ target, scope = 'project', destinationRoot, home = os.homedir(), dryRun = false }) {
  const item = TARGETS[target];
  if (!item || !['project', 'user'].includes(scope) || !item[scope]) throw new FusionError('UNSUPPORTED_TARGET', 'Unsupported target/scope; Hermes supports user scope.');
  const base = path.resolve(destinationRoot ?? (scope === 'project' ? process.cwd() : home));
  if (!(await existing(base))?.isDirectory()) throw new FusionError('INVALID_PATH', 'Installation root must be an existing directory.');
  const destination = path.join(base, item[scope], 'prompt-fusion');
  // Do not follow an existing symlink/junction anywhere in the install path.
  let cursor = base;
  for (const piece of [...item[scope].split('/'), 'prompt-fusion']) { cursor = path.join(cursor, piece); if ((await existing(cursor))?.isSymbolicLink()) throw new FusionError('UNSAFE_PATH', 'Installation path contains a symlink or junction.'); }
  if (await existing(destination)) throw new FusionError('ALREADY_INSTALLED', 'Destination exists; existing files were retained. Choose a fresh root or remove the reviewed previous installation.');
  if (dryRun) return { target, scope, destination, changed: false };
  const files = {
    'SKILL.md': await readFile(path.join(root, 'skills/prompt-fusion/SKILL.md'), 'utf8'),
    'scripts/core.mjs': await readFile(path.join(root, 'src/core.mjs'), 'utf8'),
    'scripts/structure.mjs': await readFile(path.join(root, 'src/structure.mjs'), 'utf8'),
    'scripts/enhance.mjs': (await readFile(path.join(root, 'skills/prompt-fusion/scripts/enhance.mjs'), 'utf8')).replace('../../../src/core.mjs', './core.mjs'),
    'LICENSE': await readFile(path.join(root, 'LICENSE'), 'utf8')
  };
  await mkdir(path.join(destination, 'scripts'), { recursive: true });
  // exclusive writes protect against races; no overwrite option intentionally.
  for (const [name, content] of Object.entries(files)) await writeFile(path.join(destination, name), content, { flag: 'wx' });
  const receipt = { owner: '@merziller/prompt-fusion', target, scope, files: Object.fromEntries(Object.entries(files).map(([name, content]) => [name, digest(content)])) };
  await writeFile(path.join(destination, '.prompt-fusion-install.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  return { target, scope, destination: await realpath(destination), changed: true, files: Object.keys(files) };
}
export function makeConfig(target, { nodePath = process.execPath, cliPath = path.join(root, 'bin/prompt-fusion.mjs') } = {}) {
  const entry = { command: nodePath, args: [cliPath, 'mcp'] };
  if (target === 'codex') return `[mcp_servers.prompt_fusion]\ncommand = ${JSON.stringify(nodePath)}\nargs = ${JSON.stringify(entry.args)}\n`;
  if (target === 'opencode') return { $schema: 'https://opencode.ai/config.json', mcp: { servers: { prompt_fusion: { type: 'local', command: [nodePath, ...entry.args] } } } };
  if (['claude', 'antigravity'].includes(target)) return { mcpServers: { prompt_fusion: entry } };
  throw new FusionError('UNSUPPORTED_CONFIG', 'Use the Skill installer for this platform; no unverified MCP config is generated.');
}
