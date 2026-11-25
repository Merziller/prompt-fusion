// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');mkdirSync(resolve(root,'output'),{recursive:true});
const r=spawnSync(process.execPath,['--test','--test-reporter=tap','tests/*.test.mjs'],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});
const log=(r.stdout??'')+(r.stderr??'');writeFileSync(resolve(root,'output/test-results.tap'),log);
const get=(key)=>Number(log.match(new RegExp('^# '+key+' (\\d+)$','m'))?.[1]??0);
const summary={at:new Date().toISOString(),node:process.version,platform:process.platform,architecture:process.arch,status:r.status===0?'PASS':'FAIL',tests:get('tests'),pass:get('pass'),fail:get('fail'),cancelled:get('cancelled'),skipped:get('skipped'),scope:'automated core/protocol/adapter tests; not a claim of native host or physical microphone execution'};
writeFileSync(resolve(root,'output/test-results.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));if(r.status!==0){process.stderr.write(log);process.exitCode=1;}
