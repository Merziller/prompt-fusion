// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
// Install the exact stable distribution in a fresh directory, without network or lifecycle hooks.
import { mkdtemp, mkdir, readFile, writeFile, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { verifyDistribution } from './verify-distribution.mjs';
import { compareInstalledTree } from './smoke-package.mjs';
const sha = data => createHash('sha256').update(data).digest('hex');
const ensure = (value, message) => { if (!value) throw new Error(message); };
export function parseDistributionOptions(args) {
  const values = {};
  for (let i=0;i<args.length;i+=2) {
    const key=args[i], value=args[i+1];
    ensure(['--archive','--npm-cli','--sdk-root','--deps-root'].includes(key) && value && !value.startsWith('--'), 'Expected --archive FILE --npm-cli FILE [--sdk-root DIR] [--deps-root DIR]');
    ensure(!Object.hasOwn(values,key), 'Duplicate option: '+key); values[key]=path.resolve(value);
  }
  ensure(values['--archive'] && values['--npm-cli'], 'Archive and explicit npm CLI are required');
  return {archive:values['--archive'],npmCli:values['--npm-cli'],sdkRoot:values['--sdk-root'],depsRoot:values['--deps-root']};
}
function run(script,args,cwd) {
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[script,...args],{cwd,stdio:'inherit',windowsHide:true,env:{...process.env,npm_config_update_notifier:'false'}});
    child.once('error',reject); child.once('close',code=>code===0?resolve():reject(new Error(path.basename(script)+' exited '+code)));
  });
}
export async function smokeDistribution(options,projectDir=fileURLToPath(new URL('../',import.meta.url))) {
  const root=path.resolve(projectDir), identity=await verifyDistribution(root);
  ensure((await lstat(options.archive)).isFile() && (await lstat(options.npmCli)).isFile(), 'Archive and npm CLI must be files');
  const before=await readFile(options.archive), directory=await mkdtemp(path.join(tmpdir(),'prompt-fusion-release-'));
  await writeFile(path.join(directory,'package.json'),'{"private":true}\n',{flag:'wx'});
  await run(options.npmCli,['install','--offline','--ignore-scripts','--no-audit','--no-fund','--package-lock=false',options.archive],directory);
  const installed=path.join(directory,'node_modules/@merziller/prompt-fusion'), files=await compareInstalledTree(root,installed);
  const installedIdentity=await verifyDistribution(installed);
  ensure(JSON.stringify(identity)===JSON.stringify(installedIdentity),'Installed identity differs');
  await run(path.join(installed,'scripts/test-report.mjs'),[],installed);
  await run(path.join(installed,'scripts/check.mjs'),[],installed);
  await run(path.join(installed,'scripts/verify-distribution.mjs'),[],installed);
  if(options.sdkRoot) await run(path.join(installed,'scripts/sdk-smoke.mjs'),['--sdk-root',options.sdkRoot],installed);
  if(options.depsRoot) await run(path.join(installed,'scripts/undo-react-lexical-smoke.mjs'),['--deps-root',options.depsRoot],installed);
  const readResult=name=>readFile(path.join(installed,'output',name),'utf8').then(JSON.parse);
  const tests=await readResult('test-results.json');
  ensure(tests.status==='PASS' && tests.fail===0 && tests.cancelled===0 && tests.skipped===0,'Installed regression did not pass completely');
  const sdk=options.sdkRoot?await readResult('universal-sdk-verification.json'):{status:'NOT_RUN'};
  const undo=options.depsRoot?await readResult('undo-react-lexical-verification.json'):{status:'NOT_RUN'};
  if(options.sdkRoot)ensure(sdk.status==='PASS'&&sdk.tests.length===6,'SDK checks failed');
  if(options.depsRoot)ensure(undo.status==='PASS'&&undo.hostGuiTested===false,'React/Lexical checks failed or scope changed');
  ensure(sha(await readFile(options.archive))===sha(before),'Archive changed during installation');
  const report={at:new Date().toISOString(),status:'PASS',version:identity.version,archive:{name:path.basename(options.archive),bytes:before.length,sha256:sha(before)},installation:directory,files,tests,identity,sdk,undo,authenticatedGui:'NOT_RUN',qualityAcceptance:'NOT_CLAIMED_FOR_RELEASE',scope:'Fresh offline archive install; every installed file equals source; exact tested-runtime continuity; installed automated, optional SDK and real React/Lexical fixture checks. No new model-quality score or authenticated GUI claim.'};
  await mkdir(path.join(root,'output'),{recursive:true});
  const receipt=path.join(root,'output',`distribution-smoke-${identity.version}-${Date.now()}.json`);
  await writeFile(receipt,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  return {report,receipt};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const {report,receipt}=await smokeDistribution(parseDistributionOptions(process.argv.slice(2)));
  console.log(JSON.stringify({status:report.status,version:report.version,archive:report.archive,tests:report.tests.pass,files:report.files.length,sdk:report.sdk.status,undo:report.undo.status,receipt},null,2));
}
