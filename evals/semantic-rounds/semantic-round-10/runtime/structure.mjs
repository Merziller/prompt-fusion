// Copyright 2026 Merziller. SPDX-License-Identifier: Apache-2.0
// Reviewed task-specific refinements. These are conditional process guidance, never invented facts.
const refinements = [
  [/插件|plugin|extension/i,
    '若任务涉及插件或扩展，先核对宿主的公开扩展接口、版本与生命周期；复用共用核心，将平台差异限制在适配层，并验证安装、卸载和异常恢复。',
    'For plugins or extensions, verify public host APIs, versions and lifecycle. Reuse a shared core, isolate platform adapters, and verify installation, removal and recovery.'],
  [/界面|前端|网页|UI\b|frontend|web page|website/i,
    '若涉及界面，围绕用户的主要操作建立清晰层级，优先使用合理默认值；检查窄屏、键盘可达性、加载、空态和错误反馈，并通过实际界面验证。',
    'For interfaces, organize hierarchy around the primary action and use sensible defaults. Check narrow screens, keyboard access, loading, empty states and errors, then verify the actual interface.'],
  [/接口|API\b|后端|backend/i,
    '若涉及接口，明确请求、响应、输入校验和失败语义，检查取消、超时、重复请求及权限边界；保留与现有调用方的兼容性。',
    'For APIs, define requests, responses, validation and failures. Check cancellation, timeouts, duplicate requests and access boundaries while preserving existing callers.'],
  [/表格|数据|报表|spreadsheet|dataset|data analysis/i,
    '若涉及数据，先核对来源、字段、单位和统计口径，检查缺失值、重复值与异常值；区分原始数据、计算结果和解释，结果应可复核。',
    'For data, verify sources, fields, units and definitions. Check missing, duplicate and anomalous values; separate raw data, calculations and interpretation, and make results reproducible.'],
  [/计划|方案|OPC|一人公司|one.person company|roadmap|plan\b/i,
    '若涉及方案或一人公司，按目标、可用资源和依赖拆分可执行步骤，明确交付物与检查点；未给出的预算、排期和人力保持为待确认条件。',
    'For plans or a one-person company, derive actionable steps from goals, available resources and dependencies, with deliverables and checkpoints. Leave unspecified budgets, dates and staffing open.'],
  [/调研|研究|最新|research|latest|investigat/i,
    '若结论依赖时效或外部事实，核对来源、发布日期和事件日期，标注证据覆盖与不确定性；避免把单个样本或营销表述当成普遍事实。',
    'When conclusions depend on current or external facts, check sources, publication dates and event dates, and state coverage and uncertainty. Avoid treating single samples or marketing as general facts.'],
  [/文章|文案|写作|article|copywriting|writing/i,
    '若涉及写作，在保留既定事实、立场和语气的前提下组织开头、论述与收束；删去重复空话，不虚构经历、引语、数据或人物评价。',
    'For writing, organize opening, argument and ending while retaining stated facts, position and voice. Remove repetition without inventing experiences, quotes, data or testimonials.'],
  [/多智能体|团队|协作|multi.agent|handoff|team/i,
    '若涉及协作，明确任务依赖和交接格式，给并行执行者划分独立写入范围；汇总冲突与验证结果，禁止把未运行的工作报告为完成。',
    'For collaboration, define dependencies and handoffs, give parallel contributors separate write scopes, and reconcile conflicts and verification results. Do not report unrun work as complete.']
];
export function taskRefinements(input, language) {
  const index = language === 'zh' ? 1 : 2;
  return refinements.filter(([pattern]) => pattern.test(input)).slice(0, 5).map(row => row[index]);
}
export function structuredPrompt(input, ids, rules, language) {
  const zh = language === 'zh', index = zh ? 0 : 1;
  const groups = [
    [zh ? '任务需求' : 'Task request', input],
    [zh ? '执行要求' : 'Execution guidance', [...ids.filter(id => !['scope','deliver','evidence','exceptions'].includes(id)).map(id => rules[id][index]), ...taskRefinements(input, language)].map(text => '- ' + text).join('\n')],
    [zh ? '交付与核验' : 'Deliverables and verification', ids.filter(id => ['deliver','evidence','exceptions'].includes(id)).map(id => '- ' + rules[id][index]).join('\n')],
    [zh ? '保真与边界' : 'Fidelity and boundaries', '- ' + rules.scope[index]]
  ];
  return groups.filter(([, text]) => text).map(([heading, text]) => '## ' + heading + '\n' + text).join('\n\n');
}
export function isStructuredPrompt(input, rules) {
  return (input.startsWith('## 任务需求\n') && input.includes('\n\n## 保真与边界\n- ' + rules.scope[0])) ||
    (input.startsWith('## Task request\n') && input.includes('\n\n## Fidelity and boundaries\n- ' + rules.scope[1]));
}
