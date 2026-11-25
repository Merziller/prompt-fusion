# 平台适配与兼容性边界

核查日期：2026-11-26。**文档描述扩展机制、生成配置通过测试、宿主实际加载、真实业务端到端，是四种不同证据。** 本项目只按已完成的层级表述；最新版文档会变化，请以最终 [验证报告](VERIFICATION.md) 和所用宿主版本为准。

## 适配机制

| 平台 | 交付机制 | Skill 安装位置 | 原生运行状态 |
|---|---|---|---|
| DSH | 原生 bundle、composer dock、Host命令/工具/HTTP、可选官方STT | 不需要Skill安装 | 本机实际安装及验证结果见验证报告；目标0.2.2-rc.5 |
| Codex | Agent Skill、stdio MCP配置片段 | 项目/用户 `.agents/skills/prompt-fusion` | 本机未发现Codex CLI；生成器及可移植脚本已测，原生待测 |
| Claude Code | 原生插件目录、Skill、stdio MCP | 独立安装 `.claude/skills/prompt-fusion`；插件目录自带 `skills/` | 本机Claude启动器存在，但其claude.exe报“不是此操作系统平台的有效应用程序”；宿主验证未执行成功 |
| Antigravity | Skill、stdio MCP配置片段 | 项目 `.agents/skills/prompt-fusion`；用户 `.gemini/config/skills/prompt-fusion` | 文档核验、安装脚本测试；原生待测 |
| OpenClaw | Skill | 项目 `skills/prompt-fusion`；用户 `.openclaw/skills/prompt-fusion` | 文档核验、安装脚本测试；原生待测；不生成未经核验的MCP配置 |
| OpenCode | Skill、当前V2形式MCP片段 | 项目 `.opencode/skills/prompt-fusion`；用户 `.config/opencode/skills/prompt-fusion` | 当前文档为 `mcp.servers`；生成器已测，原生待测；不声称兼容旧V1配置 |
| pi | Agent Skill | 项目/用户 `.agents/skills/prompt-fusion` | 官方说明还支持 `.pi/skills`；选择共享标准目录，安装脚本已测，原生待测 |
| Hermes | Skill | 用户 `.hermes/skills/prompt-fusion` | 只生成用户范围安装；项目范围显式报错；原生待测 |
| Zcode | 本版不纳入 | — | 用户已明确同意暂时移除，不宣称支持 |
| 其他宿主 | CLI；具备标准MCP客户端时可手工接入stdio | 由宿主决定 | 未验证，不自动列作兼容 |

Windows Node.js 24.19.0 是本次实际运行的基础环境。Node.js最低声明为22.19.0；Linux、macOS及其他Node版本未做本机实测，CI矩阵另行标记其实际运行结果。DSH语音API属于experimental，升级宿主后应重跑验证。

## 安装命令

在克隆后的仓库根目录运行，无需 `npm install`：

```sh
node bin/prompt-fusion.mjs install --target codex --scope project --root /absolute/project --dry-run
node bin/prompt-fusion.mjs install --target codex --scope project --root /absolute/project
node bin/prompt-fusion.mjs install --target claude --scope user
node bin/prompt-fusion.mjs install --target antigravity --scope project --root /absolute/project
node bin/prompt-fusion.mjs install --target openclaw --scope project --root /absolute/project
node bin/prompt-fusion.mjs install --target opencode --scope project --root /absolute/project
node bin/prompt-fusion.mjs install --target pi --scope user
node bin/prompt-fusion.mjs install --target hermes --scope user
```

安装器复制自包含的Skill、核心脚本、许可及SHA-256收据；不会改写已有宿主配置，不覆盖同名Skill。目标已存在会返回 `ALREADY_INSTALLED`，请先审阅旧目录再决定升级。不同平台可能共享 `.agents/skills`，同目录第二次安装会明确报已存在，避免重复版本。

MCP配置采用**生成片段、审阅合并**：

```sh
node bin/prompt-fusion.mjs config --target codex --out codex-mcp.snippet.toml
node bin/prompt-fusion.mjs config --target claude --out claude-mcp.snippet.json
node bin/prompt-fusion.mjs config --target antigravity --out antigravity-mcp.snippet.json
node bin/prompt-fusion.mjs config --target opencode --out opencode-mcp.snippet.json
```

片段使用当前Node与项目的真实绝对路径并正确转义；移动仓库后重新生成。生成器只写新文件，不覆盖已有配置。Codex合入用户 `~/.codex/config.toml`；Claude可合入项目 `.mcp.json`；Antigravity在MCP设置的原始配置中合并；OpenCode合入其配置文件的 `mcp.servers`。每个宿主自己的工具审批仍由该宿主控制。

Claude原生插件本地开发加载：`claude --plugin-dir /absolute/prompt-fusion`。仓库包含 `.claude-plugin/plugin.json`、`.mcp.json` 与 `skills/prompt-fusion`，MCP路径使用 `${CLAUDE_PLUGIN_ROOT}`。此命令的结构按官方机制制作，本机Claude二进制问题导致实际加载待测。

## 官方依据

- Codex：[Skills](https://developers.openai.com/codex/skills/)；[MCP](https://developers.openai.com/codex/mcp/)。Skills是跨CLI、IDE及App的机制；本项目未据此声称三个界面都已运行测试。
- Claude Code：[插件](https://code.claude.com/docs/en/plugins)；[插件清单](https://code.claude.com/docs/en/plugins/manifest-reference)；[Skills](https://code.claude.com/docs/en/skills)；[MCP](https://code.claude.com/docs/en/mcp)。
- Antigravity：[Skills](https://antigravity.google/docs/skills)，官方同时说明项目 `.agents/skills` 与全局 `~/.gemini/config/skills`，以及旧路径兼容；[MCP](https://antigravity.google/docs/mcp)。
- OpenClaw：[Skills](https://docs.openclaw.ai/tools/skills)。项目与用户范围Skill有优先级，不要在多个位置无意安装不同版本。
- OpenCode：[Skills](https://opencode.ai/docs/skills/)；[MCP](https://opencode.ai/docs/mcp-servers/)，核查时文档已说明从V1扁平 `mcp` 迁移到V2 `mcp.servers`。
- pi：[官方仓库](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent) 与 [Skills说明](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/skills.md)。
- Hermes：[Skills](https://hermes-agent.nousresearch.com/docs/skills/)，用户存放于 `~/.hermes/skills/`。
- MCP：[2025-06-18 stdio传输规范](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)。本服务使用换行JSON-RPC，stdout只输出协议消息。
- DSH：以本机0.2.2-rc.5的官方包README和类型为依据，包括 `dsh-client-ui-conversation`、`dsh-client-locale`、`dsh-tools`、`dsh-experimental-speech-to-text`；[官方仓库](https://github.com/deepseek-ai/deepseek-harness)。

没有使用通用“支持全部智能体”的宣传语。其他宿主自动执行Skill中的脚本仍受其运行环境、Node可用性和用户设置影响。
