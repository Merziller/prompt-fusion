# 任意智能体的接入方式与验证状态

核查日期：2026-11-26。**品牌名只是配置快捷方式，接入由宿主能力决定。** 本项目提供标准 Skills、MCP stdio、MCP Streamable HTTP、REST/OpenAPI 与 CLI，不设置厂商品牌白名单。新的宿主有其中一种可用接口，即可按对应方式适配；封闭产品仅能手工复制文本时，仍属于手工使用，原生安装状态待平台开放。

“协议互通”“生成配置通过测试”“厂商应用加载”“真实业务端到端”分别记录。标准接口通过测试，不等于所有应用、版本和账号均已实测。

## 先按接口选择

| 宿主能力 | 本项目入口 | 前提和边界 |
| --- | --- | --- |
| 读取标准 `SKILL.md` 并运行 Node | 自包含便携 Skill；任意 `--skills-dir` | Node≥22.19.0；由宿主决定触发和脚本执行 |
| 启动命令型 MCP | `node /absolute/prompt-fusion/bin/prompt-fusion.mjs mcp --model` | 换行 JSON-RPC stdio；安装位置是宿主实际运行命令的机器；模型端点由该进程环境提供 |
| MCP Streamable HTTP | `POST /mcp` | 无状态 JSON 响应，GET返回405；旧 HTTP+SSE-only 客户端需另外适配 |
| HTTP 工具 / OpenAPI | `POST /v1/enhance`、`GET /openapi.json` | JSON请求；服务端工具调用方式；未交付浏览器跨域网页应用 |
| Shell / 命令工具 | CLI，支持stdin、JSON和文件 | 不依赖原生插件机制 |
| 只有聊天输入框 | 复制增强文本 | 不称为插件安装或自动集成 |

0.5.1共用真实语义改写、对照审查和必要时复核核心，不再默认使用原文加规则。非DSH接口须明确`--model`并配置`FUSION_BASE_URL`、`FUSION_MODEL`及可选`FUSION_API_KEY`；没有启用模型时原稿保留并返回警告。旧版问题保留在[历史质量审计](QUALITY_AUDIT.md)；新版本的实际评测、工程验证及未测项见[验证记录](VERIFICATION.md)，不把接口覆盖数当成质量证明。

## 不在预设名单中的宿主

```sh
# target仅是回执里的标签；skills-dir是该宿主实际读取的标准Skills根目录。
node bin/prompt-fusion.mjs install --target AnyAgent --skills-dir /absolute/agent-skills --dry-run
node bin/prompt-fusion.mjs install --target AnyAgent --skills-dir /absolute/agent-skills
node bin/prompt-fusion.mjs uninstall --skill-dir /absolute/agent-skills/prompt-fusion --dry-run
node bin/prompt-fusion.mjs uninstall --skill-dir /absolute/agent-skills/prompt-fusion

# 中立命令型连接信息，无需增加品牌代码。
node bin/prompt-fusion.mjs config --target generic --model
# 中立远程连接信息；不写入令牌。
node bin/prompt-fusion.mjs config --target http --server-url https://YOUR_HOST/mcp
```

安装独占创建目录，不覆盖旧版、不编辑宿主配置。卸载仅处理带本项目回执、文件清单及SHA-256均匹配的目录；发现修改、额外文件、缺失文件或符号链接时保留目录。共享 `.agents/skills` 时不必为每个品牌重复安装。

本机服务：

```sh
node bin/prompt-fusion.mjs serve --host 127.0.0.1 --port 8765 --model
```

默认仅监听本机。跨机器时使用 `--host` 和 `--token-env` 显式配置至少24字符令牌；服务原生为HTTP，HTTPS由部署方网关提供。**没有自动部署公网、内置TLS、OAuth登录或旧SSE适配。** 远程平台的127.0.0.1指向平台自身；手机的127.0.0.1指向手机，不是桌面电脑。云端或手机需可达地址。详情见 [通用接入教程](UNIVERSAL_ACCESS.md)。

## 平台核查矩阵（示例，非支持名单上限）

| 平台 | 已核实机制 / 推荐入口 | 项目验证状态 |
| --- | --- | --- |
| DSH | 原生bundle、输入框单按钮、Host工具与官方connection | 0.2.2-rc.5真实宿主调用、0.5.1-dev八条保留响应、正式版字节延续和React/Lexical按钮契约分别验证；已登录GUI未作为实测 |
| Codex | `.agents/skills`；stdio MCP配置 | 安装器、可移植脚本、配置已测；厂商应用NOT_RUN |
| Claude Code | `.claude/skills`；插件目录；MCP | 目录和配置已测；本机claude.exe平台错误，原生加载BLOCKED |
| Antigravity | 项目`.agents/skills`，用户`~/.gemini/config/skills`；MCP | 机制与安装脚本已测；原生NOT_RUN |
| OpenClaw | 项目`skills`、用户`~/.openclaw/skills` | 安装脚本已测；原生NOT_RUN |
| OpenCode | `.opencode/skills`、`~/.config/opencode/skills`；当前V2 `mcp.servers` | 脚本与配置已测；原生NOT_RUN，不冒称旧V1配置兼容 |
| pi | `.agents/skills`（也有`.pi/skills`） | 便携安装已测；原生NOT_RUN |
| Hermes | 用户`~/.hermes/skills` | 用户范围安装已测；原生NOT_RUN |
| Kimi Code CLI | 项目/用户`.agents/skills`或`.kimi-code/skills`；`.kimi-code/mcp.json` | 新增kimi快捷安装与命令型/HTTP配置已测；原生NOT_RUN；不使用旧`.kimi/skills`猜测路径 |
| WorkBuddy | 官方连接器支持stdio、Streamable HTTP和SSE；JSON `mcpServers` | 新增stdio/HTTP配置已测；原生NOT_RUN；本服务不提供其旧SSE模式 |
| Grok Bot | 自定义连接器 Remote HTTPS 或 Command | 官方机制已查；采用中立连接详情；Command运行在Bot云端机器，原生NOT_RUN |
| Muse（Zer0Qing/Muse Android项目） | 用户手册14.3列明Streamable HTTP/SSE、Bearer等认证；手机无本地stdio | 推荐本项目HTTP入口；原生NOT_RUN。其`.skill.json`与标准`SKILL.md`不同，不混装；若指其他同名Muse需对应项目链接 |
| 豆包工作 | 已找到官方“使用插件”帮助入口 | 返回的公开正文不足以核实自定义MCP/HTTP或配置格式，标为待核实；不把通用协议测试当成豆包工作原生支持 |
| Zcode及未来宿主 | 按实际Skills/MCP/HTTP/CLI能力选择 | 不再以品牌为硬限制；未核实机制的产品保持待验证，无猜测配置 |

## 快捷配置

```sh
node bin/prompt-fusion.mjs install --target kimi --scope project --root /absolute/project
node bin/prompt-fusion.mjs config --target kimi --model --out kimi-mcp.snippet.json
node bin/prompt-fusion.mjs config --target workbuddy --model --out workbuddy-stdio.snippet.json
node bin/prompt-fusion.mjs config --target workbuddy --server-url https://YOUR_HOST/mcp --out workbuddy-http.snippet.json
```

Kimi的项目配置可位于`.kimi-code/mcp.json`；WorkBuddy在MCP连接器中导入/合并片段。配置只写新文件，现有配置由使用者合并。令牌通过宿主秘密字段、环境变量或HTTP认证头输入，不嵌入发布文件。Grok Bot的原生Skill是应用内保存的工作流，本项目未找到其标准Skills文件路径；使用命令或远程MCP。Muse需将MCP服务绑定给目标助手。

## 一手依据

- Codex：[Skills](https://developers.openai.com/codex/skills/)、[MCP](https://developers.openai.com/codex/mcp/)。
- Claude Code：[插件](https://code.claude.com/docs/en/plugins)、[清单](https://code.claude.com/docs/en/plugins/manifest-reference)、[Skills](https://code.claude.com/docs/en/skills)、[MCP](https://code.claude.com/docs/en/mcp)。
- Antigravity：[Skills](https://antigravity.google/docs/skills)、[MCP](https://antigravity.google/docs/mcp)。
- OpenClaw：[Skills](https://docs.openclaw.ai/tools/skills)。
- OpenCode：[Skills](https://opencode.ai/docs/skills/)、[MCP](https://opencode.ai/docs/mcp-servers/)。
- pi：[官方Skills说明](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/skills.md)。
- Hermes：[Skills](https://hermes-agent.nousresearch.com/docs/skills/)。
- Kimi：[Skills](https://www.kimi.com/code/docs/kimi-code-cli/customization/skills.html)、[MCP](https://www.kimi.com/code/docs/kimi-code-cli/customization/mcp.html)。
- WorkBuddy：[自建MCP连接器](https://open.workbuddy.cn/docs/connector)、[专家包规范](https://open.workbuddy.cn/docs/expert)。
- Grok Bot：[Computer and apps](https://docs.x.ai/grok-bot/computer-and-apps.md)、[Skills](https://docs.x.ai/grok-bot/skills-routines-and-automations.md)。
- Muse：[项目README](https://github.com/Zer0Qing/Muse)、[项目用户手册](https://github.com/Zer0Qing/Muse/blob/main/%E7%94%A8%E6%88%B7%E6%89%8B%E5%86%8C.md)。仅作机制查证，没有复用该项目代码。
- 豆包工作：[官方使用插件帮助页](https://www.doubao.com/work/docs/zh-cn/articles/705018132598-plugins)，本次返回的正文不足以作自定义传输兼容证明。
- MCP：[2025-06-18传输规范](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)。已用独立官方SDK 1.32.2互通；这是协议证明。
- DSH：[官方仓库](https://github.com/deepseek-ai/deepseek-harness)，本机0.2.2-rc.5包README及类型。
