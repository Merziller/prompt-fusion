# Prompt Fusion

**一个“增强”按钮，自动匹配场景、深度补充、整理结构。** 作者 **Merziller**，Apache-2.0 开源，零运行时依赖。增强过程只处理提示词，不执行其中的任务。

[English](README.en.md) · [平台适配](docs/PLATFORMS.md) · [来源审计](docs/SOURCE_AUDIT.md) · [验证结果](docs/VERIFICATION.md) · [发布与市场状态](docs/RELEASE.md) · [作者](AUTHORS.md)

## DSH：只点一次

在输入框写好需求，点击右侧 **增强**，增强稿直接写回输入框，发送仍由你决定。

- 没有模式、场景、强度、上下文或语音设置面板，也没有重复的麦克风按钮；语音继续使用 DSH 自带入口。
- 自动识别代码、设计、OPC/办公、协作、研究、写作等场景，默认深度增强。按输入涉及的插件、界面、接口、数据、方案等补充相关执行与核验要点。
- 普通草稿自动编排为“任务需求 → 执行要求 → 交付与核验 → 保真与边界”。**原始需求逐字保留**，不擅自改技术栈、数字、语言和限制。
- 同一个按钮在增强时变为 **停止**，完成后变为 **撤销增强**。你继续编辑或切换会话时，过期结果不会覆盖新草稿。
- 遇到原生引用块时，改用原位追加并保留其位置。附件不由插件重新构造；不再要求光标必须位于末尾。
- 不自动抓取历史会话、文件或工作区；上下文仅使用本次输入文字。没有隐式长期记忆。

DSH 默认使用已选模型从审核规则中选择相关指引，失败或没有模型时离线回退。深度增强不会被模型降成轻量。模型不自由编造任务答案；任务相关补充来自公开、可检查的条件规则。**它不保证每一条提示词都是“最优”，也未声称完成任务质量 A/B 提升验证。** 当前支持中英文组织指引，其他语言保留原文。

## 安装

原生目标为 DSH 0.2.2-rc.5。公开发行包与市场申请的实际状态见[发布记录](docs/RELEASE.md)。市场维护者合并前，不将“已提交”写作“已上架”。

```sh
dsh plugin --profile desktop add https://github.com/Merziller/prompt-fusion/releases/download/v0.2.0/prompt-fusion-0.2.0.tgz
```

其他 profile 请替换 desktop。本机已验证从项目目录安装与重新加载；**已有 Windows 本地链接切换为发行包时曾出现 EPERM 文件替换错误，远程替换安装未通过**，详见验证报告。不要手动覆盖 profile 内的插件目录。

本会话的本地开发版已重新加载；浏览器若仍缓存旧面板，请刷新现有 DSH 页面。

## CLI、MCP 和其他智能体

需要 Node.js ≥22.19.0。克隆后无需安装运行依赖：

```sh
git clone https://github.com/Merziller/prompt-fusion.git
cd prompt-fusion
node bin/prompt-fusion.mjs --help
node bin/prompt-fusion.mjs enhance "整理现有工程的开发需求，保留原技术栈" --intensity deep --layout structured
node bin/prompt-fusion.mjs enhance --json < request.json
node bin/prompt-fusion.mjs mcp
```

```json
{"input":"整理一人公司的客户回访工作，不要代发消息。","domain":"auto","mode":"smart","intensity":"deep","layout":"structured"}
```

CLI/MCP 仍保留高级参数，DSH 单按钮无需选择：`mode` 为 base/lite/standard/smart/publish，`intensity` 为 light/standard/deep。`layout:append` 是兼容旧版的默认 API 行为；`layout:structured` 整理外围章节但保留需求原文。publish 只整理发布条件，不发布。

结果包含 `original`、`enhanced`、场景、语言、规则、引擎、警告与变更元数据。`changes.originalPreserved` 表示原文完整保留；`originalPrefixPreserved` 区分追加与结构化；`reorganized` 标记结构调整。重复增强不堆叠。错误通过 stderr/非零退出码或 MCP 工具错误返回。

Codex、Claude Code、Antigravity、OpenClaw、OpenCode、pi、Hermes 采用可复用核心、便携 Skill 和必要配置；**机制核查、脚本测试、原生加载分别记录**，见[平台矩阵](docs/PLATFORMS.md)。Zcode 经用户确认暂时排除。

```sh
node bin/prompt-fusion.mjs install --target codex --scope project --root /absolute/project --dry-run
node bin/prompt-fusion.mjs install --target codex --scope project --root /absolute/project
node bin/prompt-fusion.mjs config --target codex --out codex-mcp.snippet.toml
```

安装器不覆盖已有 Skill，不改写宿主配置。Skill 仅在明确要求增强/优化提示词时触发；不会把普通开发、写作请求变成增强任务。

## 模型、隐私与费用

离线核心、源码、构建与测试免费，无订阅、收费模块或强制外部服务。CLI 显式使用 `--model` 时读取 `FUSION_BASE_URL`、`FUSION_MODEL` 和按需 `FUSION_API_KEY`，支持 HTTPS 或本机 HTTP 的 OpenAI-compatible `/chat/completions`。

```sh
node bin/prompt-fusion.mjs enhance --file prompt.txt --mode smart --model --intensity deep --layout structured
```

**DSH 单按钮默认 smart，会将当前输入发送给宿主当前选定模型，可能产生服务商费用**；本项目本身不收费。失败默认离线回退，不自动切换收费模型。纯离线调用可使用 CLI/MCP standard；没有提供商仍可使用完整离线组织功能。

高级 API 的显式参考资料、上一稿、术语词典和语音清理能力保留，均不在 DSH 输入区展示。DSH 原生语音入口负责录音；本插件不会在后台开启麦克风。API 的 `voiceSuggestion` 单独返回，不自动改转写。上下文有8KiB预算且拒绝明显凭证模式，这不是完整脱敏工具。

## 边界与异常

- 原文最多48KiB UTF-8，输出最多80KiB；模型选择响应最多8KiB。空值、NUL、未知参数、无效JSON、超长数据、取消、超时和无效模型输出都有错误或警告。
- 原文中的命令、发布、文件操作和联网要求均是数据。核心没有执行器，模型调用没有工具定义；增强不会自行完成这些动作。
- 智能选择不能覆盖本次请求要求的深度；补充要点只在与原始目标一致且适用时采用，不虚构事实、业绩、评价、技术选型、预算或排期。
- 正在编辑、消息发送中、会话切换或版本不匹配时，保留现有草稿。一次撤销只针对尚未被修改的增强稿。
- 日语等保留模式不添加外语章节；不声称已验证各宿主原生兼容或实体语音。

## 开发与验证

```sh
npm run build
npm test
npm run check
npm run test:report
npm pack --dry-run
```

核心：[core.mjs](src/core.mjs) · 结构编排：[structure.mjs](src/structure.mjs) · [提供商](src/providers.mjs) · [MCP](src/mcp.mjs) · [安装器](src/install.mjs)。DSH：[Host](adapters/dsh/index.mjs) 与 [Client 源码](adapters/dsh/client-source.js)，生成客户端不捆绑录音代码。

最新本机回归138项通过；包括单按钮数量、无面板/语音控件、自动参数、直接应用、停止、撤销、编辑竞态、引用保护和结构保真。实际宿主/CI与未测项见[验证报告](docs/VERIFICATION.md)。

移除：DSH 插件设置中停用或卸载；便携 Skill 仅移除安装回执指向的目录。手动合并过 MCP 片段时只删除自己添加的条目。未运行 CLI/MCP 时无常驻服务。

## 开源与致谢

新代码 Apache-2.0，作者 Merziller。借鉴 [feiwell](https://github.com/feiwell/dsh-enhance-prompt)、[ChosenXu](https://github.com/ChosenXu/dsh-prompt-enhancer)、[Fishsb](https://github.com/Fishsb/dsh-voice-prompt-enhancer) 项目的功能思路，未直接复制运行时代码、提示词模板或图标。原作者列于来源与致谢，不虚构为本项目实际贡献者；原许可和 NOTICE 已保留，见[第三方声明](THIRD_PARTY_NOTICES.md)。

微信 **Merziller** · QQ **1411574209** · 邮箱 **k26789228@gmail.com**（本人明确确认用于公开项目）。
