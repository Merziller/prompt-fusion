// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
import { readFile, access, readdir } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=(p)=>readFile(resolve(root,p),'utf8');
const pkg=JSON.parse(await read('package.json'));
let failures=[];
for(const p of ['LICENSE','NOTICE','AUTHORS.md','THIRD_PARTY_NOTICES.md','README.md','README.en.md','docs/SPEC.md','docs/VERIFICATION.md','docs/RELEASE.md','assets/icon.svg','cordis.patch.yml','.claude-plugin/plugin.json','.mcp.json']) try{await access(resolve(root,p));}catch{failures.push('Missing: '+p);}
for(const p of Object.values(pkg.exports).filter(p=>!p.includes('*'))) try{await access(resolve(root,p));}catch{failures.push('Export missing: '+p);}
if(pkg.dependencies&&Object.keys(pkg.dependencies).length) failures.push('Unexpected runtime dependency');
if(pkg.scripts.prepare||pkg.scripts.postinstall||pkg.scripts.preinstall) failures.push('Unexpected install hook');
if(pkg.author.name!=='Merziller'||pkg.license!=='Apache-2.0')failures.push('Author/license mismatch');
const zh=JSON.parse(await read('locale/zh.json')),en=JSON.parse(await read('locale/en.json'));
if(Object.keys(zh.ui).sort().join()!==Object.keys(en.ui).sort().join())failures.push('UI locale keys differ');
const client=await read('adapters/dsh/client.js');
if(!client.includes("id: '@merziller/prompt-fusion'")) failures.push('Client module ID mismatch');
if(/require\(['"]@deepseek-ai\/dsh-client/.test(client)||/document\.body/.test(client))failures.push('Private UI import/global DOM mutation');
const build=spawnSync(process.execPath,['scripts/build-client.mjs','--check'],{cwd:root,stdio:'inherit'});if(build.status!==0)failures.push('Generated client stale');
async function walk(dir){let out=[];for(const e of await readdir(resolve(root,dir),{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isSymbolicLink()){failures.push('Unexpected symlink: '+p);continue;}if(e.isDirectory())out.push(...await walk(p));else out.push(p);}return out;}
for(const p of [...await walk('src'),...await walk('bin'),...await walk('adapters'),...await walk('scripts'),...await walk('tests')])if(['.js','.mjs','.cjs'].includes(extname(p))){const result=spawnSync(process.execPath,['--check',p],{cwd:root,stdio:'inherit'});if(result.status!==0)failures.push('Syntax: '+p);}
for(const p of ['README.md','README.en.md','AUTHORS.md','THIRD_PARTY_NOTICES.md',...await walk('docs')])if(extname(p)==='.md'){const text=await read(p);for(const m of text.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)){const target=m[1].replace(/^<|>$/g,'').split('#')[0];if(!target||/^(https?:|mailto:)/.test(target))continue;try{await access(resolve(root,dirname(p),decodeURIComponent(target)));}catch{failures.push('Broken link in '+p+': '+target);}}}
if(failures.length){console.error(JSON.stringify({ok:false,failures},null,2));process.exitCode=1;}else console.log(JSON.stringify({ok:true,package:pkg.name,version:pkg.version,checks:['exports','license/author','locales','module-id','no-install-hooks','generated-client','syntax','local-links']},null,2));
