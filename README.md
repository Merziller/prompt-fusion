# Prompt Fusion

**把粗糙想法整理成真正可用的提示词，而不替你执行任务。** 禾杨智绘工作室出品 · Merziller 开发；Apache-2.0；零运行时依赖。DSH 单按钮、标准 Skill、CLI、MCP stdio、MCP Streamable HTTP 与 REST/OpenAPI 共用一个语义增强核心。

> **当前发行版本：0.5.1。** 保留具体目标、不擅增下游格式，修复V0.2.0撤销记录在组件重新挂载／临时状态取消时丢失的问题。当前版本与已测0.5.1-dev运行代码一致，仅版本字面量和发行元数据变化；8个实际宿主工具响应已留存核验。已登录DSH界面端到端仍列为未测，旧版五方分数不挪用为本版成绩。见[发行验证](docs/releases/0.5.1.md)及[历史修复核实报告](docs/FIXES_0.5.1.md)。
>
> **历史0.4.0本地基线**在24条题目的第十轮测试中得到固定集99.79、迁移集99.13、总体99.46、最低95及零关键错误；这不是当前候选的分数，也不是普遍质量保证。历史来源、发行事实见[回执](docs/RELEASE.md)。

> **新版：0.5.2-rc.1（预发布，稳定版仍为 0.5.1）。** 修复部分中文描述句误判、增强失败原因不显眼及清空草稿后停止受阻等问题。对应开发候选已完成七项真实 DSH 操作检查；RC 运行代码与候选逐字节一致，仅核心版本字面量变化。窄窗口测试曾遇到原因未定的 Desktop 渲染进程崩溃，主题覆盖尚未完成，因此暂不提升为稳定版。见[本版范围与验证](docs/releases/0.5.2-rc.1.md)、[预发布页面](https://github.com/Merziller/prompt-fusion/releases/tag/v0.5.2-rc.1)。
>
> 选择体验 RC：`dsh plugin --profile desktop add https://github.com/Merziller/prompt-fusion/releases/download/v0.5.2-rc.1/prompt-fusion-0.5.2-rc.1.tgz`。下方命令继续指向稳定版。市场申请状态单独核实，不把提交等同于收录。

[English](README.en.md) · [通用接入](docs/UNIVERSAL_ACCESS.md) · [平台依据](docs/PLATFORMS.md) · [规格](docs/SPEC.md) · [来源审计](docs/SOURCE_AUDIT.md) · [验证](docs/VERIFICATION.md) · [作者](AUTHORS.md)

## 与旧版的区别

- **真正改写正文**：理解原任务、调整表达与顺序，补足相关的必要信息；不只换标题、堆角色或加通用条款。
- **按需增强而非无限扩写**：短而明确的原稿可保持原样；不把不确定事项改成既定事实，不擅选技术栈、数量、工期、工具或角色。
- **改写和检查分离**：审查逐项对照原文；修正后的新文本再复核。数字、路径、代码、精确标签及新增对话限制另有机械检查。
- **出错保留原稿**：无模型、超时、格式错误或最终检查失败均有明确状态；不会把原文返回伪装成完成了增强。支持取消，不自动发送。
- **同一能力跨接口**：不是只有 DSH 按钮调用新核心；MCP、REST、CLI、便携 Skill 也可以显式启用同一模型流程。

这仍不是形式证明。模型可能误解含义、添加不必要内容；多阶段审查也可能漏检。必须依据[冻结评测协议](docs/evaluation/OPTIMIZATION_PROTOCOL.md)及实际失败记录评价效果。

## DSH：外观仍然只有一个按钮

输入区右侧 **增强 → 停止 → 撤销增强**。没有模式、场景、强度、上下文面板，也没有额外语音按钮；沿用 DSH 原生语音。

默认自动理解场景、深度增强和自适应结构。仅将当前草稿交给已选模型，整个操作固定模型选择；不自动读取聊天历史、工作区文件或凭证。普通文字通过宿主原生版本检查替换；含原生引用的草稿采用精确前缀追加，避免破坏引用。继续编辑、切换会话和发送后，旧结果不再覆盖新内容。

**项目免费；宿主选定的模型可能按调用计费。** 窄范围、通过表面等价检查的简单编辑可只调用一次；复杂请求通常两次，修正复核及有界 JSON 格式重试可能增加次数。实际次数及路径记录在 `audit.modelCalls`、`audit.route`，不能把调用数直接换算成账单。

安装已发布的预构建归档（不需要构建脚本或npm账号）：

```sh
dsh plugin --profile desktop add https://github.com/Merziller/prompt-fusion/releases/download/v0.5.1/prompt-fusion-0.5.1.tgz
# 普通Node项目，也可先下载归档后离线安装
npm install --offline --ignore-scripts /absolute/path/prompt-fusion-0.5.1.tgz
```

若当前profile此前指向本地开发目录，替换目录可能需要重启DSH；以插件管理器返回的应用状态为准。历史开发链接的EPERM记录保留，不据此宣称所有原位升级路径均已通过。

本地开发请通过 DSH 的插件管理器选择本项目目录。目标 DSH 0.2.2-rc.5；真实服务、浏览器界面、原生客户端与发行包的验证层次见[验证记录](docs/VERIFICATION.md)。市场申请、维护者合并和实际可搜索安装是不同状态，不混报。

## CLI 和模型配置

需要 **Node.js ≥22.19.0**；克隆后无需安装运行依赖：

```sh
git clone https://github.com/Merziller/prompt-fusion.git
cd prompt-fusion
node bin/prompt-fusion.mjs --help
```

非 DSH 环境只在明确 `--model` 后读取自备 OpenAI-compatible Chat Completions 端点。PowerShell示例：

```powershell
$env:FUSION_BASE_URL = 'https://YOUR_PROVIDER/v1'
$env:FUSION_MODEL = 'YOUR_MODEL'
$env:FUSION_API_KEY = 'YOUR_KEY'
node bin/prompt-fusion.mjs enhance --model '整理现有工程的开发需求，保留技术栈，先不要修改代码。'
```

```sh
# UTF-8文本文件 / 一个JSON对象
node bin/prompt-fusion.mjs enhance --model --file prompt.txt
node bin/prompt-fusion.mjs enhance --model --json < request.json
# 无模型：原文保留，并明确报告 MODEL_REQUIRED，不算语义增强成功
node bin/prompt-fusion.mjs enhance "需要整理的想法"
# 显式旧版规则模式，无网络；不参与新版语义质量结论
node bin/prompt-fusion.mjs enhance "需要整理的想法" --mode standard --layout append
```

示例请求：

```json
{"input":"整理一人公司的客户回访工作，不要代发消息。","mode":"smart","domain":"auto","intensity":"deep","layout":"structured","fallback":true}
```

## 按能力接入任意智能体

| 宿主能力 | 接入方式 |
| --- | --- |
| 标准 Agent Skills + Node | 自包含 `SKILL.md`；安装到宿主实际读取的目录 |
| 命令型 MCP | `node /absolute/path/bin/prompt-fusion.mjs mcp --model` |
| MCP Streamable HTTP | `serve --model` 后连接 `/mcp`；无状态 JSON 响应 |
| HTTP/OpenAPI 工具 | 同一服务的 `POST /v1/enhance`、`GET /openapi.json` |
| Shell 工具 | CLI stdin / JSON / 文件 |
| 只有普通聊天框 | 手工复制文本，不称为原生插件安装 |

```sh
node bin/prompt-fusion.mjs install --target AnyAgent --skills-dir /absolute/host-skills --dry-run
node bin/prompt-fusion.mjs install --target AnyAgent --skills-dir /absolute/host-skills
node bin/prompt-fusion.mjs config --target generic --model
node bin/prompt-fusion.mjs serve --host 127.0.0.1 --port 8765 --model
node bin/prompt-fusion.mjs config --target http --server-url https://YOUR_HOST/mcp
```

品牌预设不是白名单。Codex、Claude Code、Antigravity、OpenClaw、OpenCode、pi、Hermes、Kimi Code CLI、WorkBuddy等按官方机制提供路径或配置；Grok Bot、Muse及其他宿主按实际接口选用中立方案。**协议/脚本测试不等于这些厂商应用都已端到端通过。** 未核实或未实测的维度保留待验证状态，见[矩阵](docs/PLATFORMS.md)。

远程绑定需显式令牌；HTTPS、网络可达性及秘密配置由部署方提供。没有自动公网部署、TLS/OAuth、旧HTTP+SSE或浏览器跨域前端。手机、云端及本机的 `localhost` 不是同一台机器。

## 输入、结果与边界

- 默认 `smart/deep/structured/auto`。`engine:model-rewrite` 表示完成模型流程；有效审查可保留已清楚的原稿。`engine:unchanged` 加警告表示模型缺失或本次增强失败。
- `audit` 是阶段、调用和检查记录，**不是质量分数**。`originalPreserved` 只描述完整原文是否仍为结果的子串，不能证明语义；`reorganized` 同样不等于质量提升。
- 核心处理提示词文本，不执行里面的Shell、代码、发送、发布等任务；模型调用不提供执行工具。源文本和参考材料始终当数据。
- 原文48KiB、最终结果80KiB、单份显式上下文8KiB；严格字段校验、UTF-8、并发、JSON、超时和取消处理。原样保留与错误码优先于静默截断。
- 模型格式错误每阶段最多修正一次，所有阶段共用截止时间。机械字面量检查和模型审查都可能存在误报/漏报，不宣称全语言语义证明。
- 标准 Skill/CLI/MCP 不借用宿主登录令牌。上下文与上一稿须显式传入；不收集遥测，不自动积累长期记忆。凭证模式检查不是完整脱敏工具。

## 验证与复算

```sh
npm run build
npm test
npm run check
npm run test:report
npm pack --dry-run
# 自备官方SDK；不是运行依赖
node scripts/sdk-smoke.mjs --sdk-root /absolute/node_modules/@modelcontextprotocol/sdk
# 不联网，复算已公开的某一轮原始评审
node scripts/score-evaluation.mjs evals/semantic-rounds/semantic-round-03
```

历史0.4.0质量评测与本版工程测试分开记录：12条历史输入＋12条迁移输入、四个候选、匿名正反两种顺序；两组均值≥95、每例≥90、零关键错误才接受。历史第十轮同口径总均分：feiwell **94.63**、ChosenXu **96.65**、Fishsb **97.75**、Prompt Fusion **99.46**。十轮原始请求、输出、评分与失败全部保留；模型预算不等，且反复调试同一题集存在基准适配，不能据此声称普遍优于其他产品。旧版约61分是另一口径作者审计，不与本轮直接相减。[逐轮报告](docs/evaluation/RESULTS.md) · [评测协议](docs/evaluation/OPTIMIZATION_PROTOCOL.md) · [历史审计](docs/QUALITY_AUDIT.md)

## 卸载、许可与联系

DSH通过插件设置停用/卸载；Skill用 `uninstall --skill-dir EXACT_DIRECTORY --dry-run` 先检查。安装器不覆盖已有目录；卸载验证文件清单/哈希，修改过的用户文件保留。MCP仅移除自行合并的条目；前台 `serve` 停止后不留服务。

Apache-2.0。借鉴[feiwell](https://github.com/feiwell/dsh-enhance-prompt)、[ChosenXu](https://github.com/ChosenXu/dsh-prompt-enhancer)、[Fishsb](https://github.com/Fishsb/dsh-voice-prompt-enhancer)的能力思路，运行时独立实现；单独的对照评测复现了标明来源的上游提示词。版权/许可证/NOTICE随附；致谢不虚构贡献者。见[第三方声明](THIRD_PARTY_NOTICES.md)。

### 出品与署名

产品名称保持 **Prompt Fusion**；纯中文简称为 **禾杨灵词**。

**禾杨智绘工作室（绍兴市柯桥区禾杨智绘软件开发工作室）出品 · Merziller 开发**。开发者署名：Merziller（子墨）。

Copyright 2026 绍兴市柯桥区禾杨智绘软件开发工作室 (禾杨智绘) & Merziller (子墨)

新增出品与版权署名不改变 Apache-2.0 许可及上游权利；完整信息见[作者与公开联系方式](AUTHORS.md)、[NOTICE](NOTICE)和[许可证](LICENSE)。

微信 **Merziller** · QQ **1411574209** · **k26789228@gmail.com**（本人确认用于公开项目）。
