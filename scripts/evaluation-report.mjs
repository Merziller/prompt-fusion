// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
// Offline cross-round report. Reads recorded evidence; never generates or regrades text.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEvaluation } from './score-evaluation.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
const ensure = (value, message) => { if (!value) throw new Error(message); };
const json = async file => JSON.parse(await readFile(file, 'utf8'));

export async function buildEvaluationReport(root) {
  const names = (await readdir(root, { withFileTypes: true }))
    .filter(entry => entry.isDirectory() && /^semantic-round-\d{2}$/.test(entry.name))
    .map(entry => entry.name).sort();
  ensure(names.length, 'No complete recorded evaluation rounds');
  const rounds = []; let baseline;
  for (const name of names) {
    const directory = path.join(root, name);
    const { data, result, integrity } = await loadEvaluation(directory);
    const generation = await json(path.join(directory, 'generation-request.json'));
    const manifest = await json(path.join(directory, 'runtime-manifest.json'));
    const signature = {
      cases: sha(JSON.stringify(data.cases.map(c => [c.id, c.set, c.sha256]))),
      judge: sha(JSON.stringify({ selection: data.judgeRequest.selection,
        temperature: data.judgeRequest.temperature, reasoningEffort: data.judgeRequest.reasoningEffort,
        rubric: data.judgeRequest.items[0].system, maxTokens: data.judgeRequest.items.map(item => item.maxTokens) })),
      controls: sha(JSON.stringify({ selection: generation.selection, temperature: generation.temperature,
        reasoningEffort: generation.reasoningEffort,
        items: generation.items.filter(item => item.kind === 'model') })),
      protocol: manifest.protocol
    };
    if (baseline) ensure(JSON.stringify(signature) === JSON.stringify(baseline), 'Cross-round protocol, cases, judge or control requests changed: ' + name);
    else baseline = signature;
    const fusion = result.aggregate.filter(row => row.product === 'fusion');
    rounds.push({ round: name, complete: result.complete, passed: result.passed,
      generationFailures: result.generationFailures,
      judgeAttempts: result.attempts.length, invalidJudgeAttempts: result.attempts.filter(a => !a.valid).length,
      fusion: Object.fromEntries(fusion.map(row => [row.set, row])),
      controls: result.aggregate.filter(row => row.product !== 'fusion' && row.set === 'all'),
      critical: result.perCase.filter(row => row.product === 'fusion' && row.criticalIssues.length)
        .map(row => ({ caseId: row.caseId, total: row.total, issues: row.criticalIssues })),
      runtime: { core: manifest.core, rewrite: manifest.rewrite, css: manifest.css }, integrity });
  }
  return { schema: 1, scope: 'Recorded model evaluations, not a native-app or universal-quality guarantee',
    comparison: baseline, rounds };
}

export function renderEvaluationMarkdown(report) {
  const lines = ['# 逐轮真实评测汇总', '',
    '此表离线验证每轮证据哈希、相同输入、评审配置与对照请求后生成；不调用模型、不补写评分。失败生成保留零分，历史失败轮次不删除。', '',
    '| 轮次 | 固定集均分 | 迁移集均分 | 总均分 | 最低单例 | 本插件生成失败 | 关键问题例数 | 验收 |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |'];
  for (const r of report.rounds) lines.push(`| ${r.round} | ${r.fusion.fixed.mean} | ${r.fusion.transfer.mean} | ${r.fusion.all.mean} | ${r.fusion.all.minimum} | ${r.generationFailures.filter(id => id.endsWith('--fusion')).length} | ${r.critical.length} | ${r.complete && r.passed ? 'PASS' : '未通过'} |`);
  lines.push('', '## 各轮对照总均分', '', '| 轮次 | feiwell | ChosenXu | Fishsb | Prompt Fusion |', '| --- | ---: | ---: | ---: | ---: |');
  for (const r of report.rounds) {
    const mean = product => r.controls.find(row => row.product === product)?.mean ?? '—';
    lines.push(`| ${r.round} | ${mean('feiwell')} | ${mean('chosenxu')} | ${mean('fishsb')} | ${r.fusion.all.mean} |`);
  }
  lines.push('', '## 限制与核对', '',
    '- 本插件每阶段最多8192 tokens；三款对照每次最多4096 tokens，调用成本不相等。',
    '- 12条历史输入与12条迁移输入为冻结合成题；连续迭代存在基准适配，不代表新用户总体。',
    '- 两个相反顺序的匿名模型评审不是独立人工评审；任意关键错误仍阻断验收。',
    '- 每轮 evaluation.json、calls.jsonl、生成请求、运行时快照和 integrity.json 保留完整证据。',
    '- 旧版约61分作者审计与本表不是同一量尺，不直接相减。', '');
  return lines.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [root = 'evals/semantic-rounds', flag, output] = process.argv.slice(2);
  ensure(!flag || flag === '--out' && output, 'Usage: node scripts/evaluation-report.mjs [root] [--out NEW_FILE.md]');
  const report = await buildEvaluationReport(path.resolve(root));
  if (output) await writeFile(path.resolve(output), renderEvaluationMarkdown(report), { flag: 'wx' });
  console.log(JSON.stringify(report, null, 2));
}
