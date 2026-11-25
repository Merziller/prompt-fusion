# Prompt Fusion

保留原意的提示词增强插件。作者 **Merziller**，Apache-2.0 开源，零运行时依赖。默认离线免费，增强过程不执行提示词里的任务。

[English](README.en.md) · [平台适配](docs/PLATFORMS.md) · [来源审计](docs/SOURCE_AUDIT.md) · [验证结果](docs/VERIFICATION.md) · [作者与联系](AUTHORS.md)

## 如何增强

输入原文 → 选择场景/模式/强度 → 生成预览 → 审阅 → 明确应用或复制。DSH 不自动发送，CLI/MCP 只返回文本和元数据。

本版采用保真优先策略：**原文作为逐字不变的前缀，随后补充可选、从属的组织指引**。保留代码、路径、数字、引号、语言、约束；不把“兼容Windows”扩成“仅Windows”，不添加技术栈、页数、业绩或好评。模型辅助模式只从已审核规则中选择ID，模型写出的答案、自由改写或额外要求会被丢弃并回退离线。它适合整理指令结构；不声称每条增强都能提高模型任务成绩。

场景：通用、代码开发、设计、OPC/办公、多智能体协作、研究、写作。后四类中的研究/写作为合理扩展，未冒充用户既有使用习惯。模式为 base / lite / standard / smart / publish，另有 light / standard / deep 强度；publish 只检查发布提示要素，不执行发布。重复增强会提示 `ALREADY_ENHANCED`，调整模式请先撤销旧增强。

自动语言检测支持中文、英文；日语、韩语、阿拉伯语、俄语等返回原文并报告保留模式，不自动翻译。显式 `language` 只选择补充指引的语言，仍保留原文。

## 快速开始

需要 Node.js ≥22.19.0。克隆仓库后无需安装依赖：

```sh
git clone https://github.com/Merziller/prompt-fusion.git
cd prompt-fusion
node bin/prompt-fusion.mjs --help
node bin/prompt-fusion.mjs enhance "整理现有工程的开发需求，保留原技术栈" --domain code
node bin/prompt-fusion.mjs enhance --file prompt.txt --mode standard
node bin/prompt-fusion.mjs enhance --json < request.json
```

JSON输入示例：

```json
{"input":"请整理一人公司的客户回访工作，不要代发消息。","domain":"office","mode":"standard","intensity":"deep"}
```

JSON结果包含 `original`、`enhanced`、`domain`、`mode`、`intensity`、`language`、`engine`、`ruleIds`、`warnings`、`changes`；可选的 `voiceSuggestion` 单独返回，`voiceApplied:false`。错误写入stderr并以非零状态退出。MCP错误使用协议或工具错误结构。

## DSH 安装与使用

原生目标为 DSH 0.2.2-rc.5。将本仓库目录作为本地 bundle 安装，或在已收录后通过插件市场安装；**实际收录/提交状态见[发布记录](docs/RELEASE.md)**。不要仅凭本文仓库地址就认为市场已收录。

安装后在会话输入区下方出现 Prompt Fusion：选择场景/模式/强度，点击“增强预览”，审阅后点“确认加入草稿”。应用使用原生插入API保留引用和附件；需把光标放在草稿末尾。预览生成后若内容或版本变化，会提示重新生成。撤销只在草稿仍等于刚应用的版本时删除追加内容，避免覆盖后续编辑。

高级设置按次显式开启：参考资料、上一稿记忆、语音规整、可选快捷键。记忆仅在当前面板内存中保留一稿，提交/清空/切换会话或关闭记忆时清除；不写浏览器存储。显式参考资料最多8KiB、4条；不自动扫描工作区或读取历史会话。API还会拒绝明显的凭证模式，但这不是完整的数据脱敏器。

语音入口显示当前宿主识别器及 `host-local/cloud` 位置，点击后才申请麦克风；静音1–5秒自动停止，最长120秒。使用宿主公开的 `speechToText` 服务，需先在DSH设置中配置/准备识别器；不自动下载安装模型，不把音频切换到另一服务。转写后先审阅，再插入草稿，再按需增强。音频仅在本次录音/请求内存中处理，本插件不写音频文件；若选择云识别器，音频会发往该识别器，服务方处理行为以其说明为准。真实麦克风与各识别器的端到端状态见验证报告。

可选快捷键默认关闭：Alt+Shift+P 预览，Alt+Shift+V 录音/停止。Host命令 `/prompt-fusion 待增强文本` 和工具 `prompt_fusion_enhance` 共用相同核心，只输出预览。

## 其他智能体

交付自包含 Agent Skill、标准stdio MCP、CLI和必要的原生配置。Codex、Claude Code、Antigravity、OpenClaw、OpenCode、pi、Hermes分别使用已核查的机制；**生成配置/脚本测试通过与宿主实测是不同状态**。具体路径、命令、官方依据及待测项见[平台矩阵](docs/PLATFORMS.md)。Zcode按用户确认暂时排除。

```sh
node bin/prompt-fusion.mjs install --target codex --scope project --root /absolute/project --dry-run
node bin/prompt-fusion.mjs install --target codex --scope project --root /absolute/project
node bin/prompt-fusion.mjs config --target codex --out codex-mcp.snippet.toml
node bin/prompt-fusion.mjs mcp
```

安装器不覆盖已有Skill、不修改宿主配置；配置以新片段输出供合并。Skill仅在明确要求增强/优化提示词时触发，不把普通开发/写作请求变成增强任务。按 `skill-creator` 方法设置触发边界并提供回归样例，未声称做过各宿主模型触发率评测。

## 移除

DSH 在插件设置中停用或卸载 Prompt Fusion 即可，资源由宿主 effect 清理。便携 Skill 只需移除安装器回执所指的 `prompt-fusion` 目录；本插件未改写其他 Skill 或宿主配置。若手动合并过 MCP 配置片段，请只删除自己添加的 `prompt_fusion` / `prompt-fusion` 条目并重启对应 MCP 服务。CLI 不运行时没有常驻服务；本插件不持久保存提示词、音频或草稿历史。

## 可选模型与费用

离线模式没有API、订阅或收费模块。源码、构建与测试全部免费。需要语义选择时，CLI显式传 `--model`，配置 `FUSION_BASE_URL`、`FUSION_MODEL`，按服务需要配置 `FUSION_API_KEY`；只支持HTTPS或本机HTTP的OpenAI-compatible `/chat/completions`。没有提供商账号时仍可完整使用离线功能。

```sh
node bin/prompt-fusion.mjs enhance --file prompt.txt --mode smart --model
```

用户自行选择的远程模型/云识别器可能按其定价计费；本项目不收费、不代付、不默认调用。DSH smart使用当前所选模型；离线模式不调用模型。上下文与记忆仅在显式开启后进入请求。CLI的smart默认在失败时回退离线；JSON `fallback:false` 可改为返回错误。provider API可显式提供最多4个模型函数，按顺序尝试且共用总超时，DSH首版不自动选择其他收费模型。

## 边界与异常

- 输入最多48KiB UTF-8，输出最多80KiB；模型选择响应最多8KiB；上下文最多8KiB；超时10–120000ms，默认30000ms。
- 空输入、NUL、未知参数/枚举、超长数据、无效JSON、重复活跃MCP ID、取消、模型越界输出均有错误码或警告；不把错误写成增强成功。
- 多语言保留模式、模型缺失/失败回退、重复增强、忽略未启用上下文会在 `warnings` 中说明。
- 内嵌的shell、发布、联网或文件指令都是待增强数据。核心没有执行器；模型调用没有工具定义。宿主之后如何使用增强稿属于另一个动作。
- 增强可补充组织问题，不替用户发明事实；人工审阅仍重要。语音清理可能改变口头表达，因此始终单列建议。

## 开发与测试

```sh
npm run build
npm test
npm run check
npm run test:report
npm pack --dry-run
```

共享核心在 [src/core.mjs](src/core.mjs)，提供商在 [src/providers.mjs](src/providers.mjs)，MCP在 [src/mcp.mjs](src/mcp.mjs)，安装器在 [src/install.mjs](src/install.mjs)。DSH源码为 [adapters/dsh/index.mjs](adapters/dsh/index.mjs) 与 [adapters/dsh/client-source.js](adapters/dsh/client-source.js)，客户端由无依赖脚本生成，提交前检查同步。测试覆盖保真、注入式输入、取消超时、流式去重、协议异常、原生草稿竞态、安装冲突、语音编码及静音门控等。实际通过数、环境与未测项见[验证报告](docs/VERIFICATION.md)，不将测试替身写作真实硬件/平台测试。

## 开源与致谢

新代码Apache-2.0，作者Merziller。借鉴 feiwell、ChosenXu、Fishsb 三个项目的功能思路，未直接复制其运行时代码、提示词模板或图标；原作者不是本项目实际贡献者。已保留各自许可与NOTICE，详见[第三方声明](THIRD_PARTY_NOTICES.md)。

公开联系：微信 **Merziller** · QQ **1411574209** · 邮箱 **k26789228@gmail.com**（由本人明确确认用于本项目）。
