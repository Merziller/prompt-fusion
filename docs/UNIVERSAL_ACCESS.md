# 通用智能体接入教程

本教程不依赖品牌名单。先确认宿主支持标准Skills、MCP stdio、MCP Streamable HTTP、HTTP/OpenAPI、Shell中的哪种。仅有聊天框的产品先手工复制，不称为原生集成。官方平台依据与未测项见[矩阵](PLATFORMS.md)。

源码下载后，在本项目根目录操作。Node.js≥22.19.0，无运行时依赖。以下路径和域名均为使用者替换项，不是已经部署的公共服务。

## 1. 标准Skill

```sh
node bin/prompt-fusion.mjs install --target MyAgent --skills-dir /absolute/host-skills --dry-run
node bin/prompt-fusion.mjs install --target MyAgent --skills-dir /absolute/host-skills
```

`--skills-dir`必须是宿主读取标准`SKILL.md`的根目录。安装器创建`prompt-fusion/`，包含SKILL、核心、结构函数、语义改写器、模型适配器、自适应策略、异常分类、意图保护、执行入口及LICENSE十个文件，以及哈希回执；无外部运行时包。未知品牌只需明确目录。新目录同名冲突或符号链接会停止，已有文件保留。

0.5.1默认执行真正的语义改写与对照审查；满足窄范围表面等价条件时走一次调用的轻量路径，否则完整复核。独立进程必须明确传入`--model`才读取`FUSION_BASE_URL`、`FUSION_MODEL`和可选`FUSION_API_KEY`。把这些变量配置在宿主启动该脚本的环境中，不写入公共Skill。安装后的调用示例：

```sh
node /absolute/host-skills/prompt-fusion/scripts/enhance.mjs --model --json < request.json
```

未传`--model`时没有隐式网络访问，原文保留并返回`MODEL_REQUIRED`警告，不算语义增强成功；确需旧版纯规则行为可在JSON中显式设置`mode:standard`。

Kimi Code CLI当前可使用`.agents/skills`：

```sh
node bin/prompt-fusion.mjs install --target kimi --scope project --root /absolute/project
```

卸载：

```sh
node bin/prompt-fusion.mjs uninstall --skill-dir /absolute/host-skills/prompt-fusion --dry-run
node bin/prompt-fusion.mjs uninstall --skill-dir /absolute/host-skills/prompt-fusion
```

若文件被编辑、添加、丢失，卸载保留整个目录供人工处理。Muse原生`.skill.json`和Grok Bot应用内工作流未被当成标准文件Skill，优先选下面的MCP。

## 2. MCP命令型

生成中立连接描述：

```sh
node bin/prompt-fusion.mjs config --target generic --model
```

输出真实Node和入口绝对路径，例如：

```json
{"command":"/absolute/node","args":["/absolute/prompt-fusion/bin/prompt-fusion.mjs","mcp","--model"]}
```

将字段填进宿主的命令型MCP设置。Claude/Kimi/WorkBuddy有`mcpServers`包装快捷生成：

```sh
node bin/prompt-fusion.mjs config --target workbuddy --model --out workbuddy-stdio.snippet.json
node bin/prompt-fusion.mjs config --target kimi --model --out kimi-mcp.snippet.json
```

移动源码目录后重新生成路径。命令运行机器必须具备Node及这份源码；Grok Bot的Command指向其Bot云端机器，而非桌面电脑。Kimi可合并到项目`.kimi-code/mcp.json`或用户配置；不要用未经证实的旧目录。

## 3. 远程MCP Streamable HTTP

本机开发：

```sh
node bin/prompt-fusion.mjs serve --host 127.0.0.1 --port 8765 --model
```

连接`http://127.0.0.1:8765/mcp`，传输选择Streamable HTTP。服务采用无状态JSON响应，没有GET SSE流或旧`/sse`端点；GET返回405是该模式的预期行为。初始化/列工具/调用由标准客户端完成。

跨机器显式配置令牌。PowerShell示例：

```powershell
$env:PROMPT_FUSION_TOKEN = 'REPLACE_WITH_A_RANDOM_TOKEN_AT_LEAST_24_CHARACTERS'
node bin/prompt-fusion.mjs serve --host 0.0.0.0 --port 8765 --token-env PROMPT_FUSION_TOKEN --model
```

令牌从使用者选择的环境变量读取，不在启动日志、配置输出或增强结果中返回。每次请求带`Authorization: Bearer TOKEN`。生产远程地址使用部署方提供的HTTPS网关；本项目未代建公网服务、TLS或OAuth。WorkBuddy生产连接器要求HTTPS，Grok Bot选择Remote HTTPS；Muse手机需可达的局域网/HTTPS地址，手机localhost不是电脑。

```sh
node bin/prompt-fusion.mjs config --target http --server-url https://YOUR_HOST/mcp
node bin/prompt-fusion.mjs config --target workbuddy --server-url https://YOUR_HOST/mcp --out workbuddy-http.snippet.json
```

WorkBuddy连接器生成`type:streamableHttp`；Claude/Kimi为各自支持的`type:http`包装。中立描述只交付url/type，不推断其他宿主配置文件格式。认证头在宿主秘密设置输入，生成器不嵌入令牌；URL中的账号、密码、查询令牌或fragment会被拒绝。

WorkBuddy连接器正式上架还需要其元信息、图标、认证描述及平台审核，当前只交付连接片段，未声称已向WorkBuddy市场提交。Grok Bot受团队MCP策略影响。Muse指已核查的Zer0Qing/Muse Android项目；同名产品需另核机制。

## 4. REST/OpenAPI

相同服务暴露：

- `GET /openapi.json`：OpenAPI3.1定义；启用令牌时此接口也需认证。
- `POST /v1/enhance`：`Content-Type:application/json`，请求与CLI JSON相同。
- 工具语义始终是“仅增强提示词”，不是执行原任务。

```json
{"input":"梳理客户回访要求，先不要发送消息。","layout":"structured","intensity":"deep"}
```

返回`original/enhanced/engine/warnings/changes/audit`等。`model-rewrite`表示完成改写审查，`unchanged`加警告表示本次没有有效增强；清楚的原稿也可能经有效审查保持不变。`audit`记录阶段和实际调用数，不是质量分。单请求128KiB、并发8、请求截止和断连取消；格式错误400、令牌错误401、来源/Host错误403、超长413、并发限制429、截止504。REST/HTTP/MCP共用同一核心，没有另建厂商逻辑分支。

HTTP是服务端工具接口，未提供CORS网页应用；`--allow-origin`是明确来源许可，不会自动生成浏览器跨域前端。豆包工作若提供可配置的HTTP工具，可对照OpenAPI接入；当前公开帮助返回内容不足，本项目不声明其原生兼容。

## 5. 互通复现

在独立目录安装使用者选定版本的官方`@modelcontextprotocol/sdk`，再传其包目录；项目不自动安装SDK：

```sh
node scripts/sdk-smoke.mjs --sdk-root /absolute/node_modules/@modelcontextprotocol/sdk
```

已实测SDK1.32.2对stdio、无令牌HTTP和Bearer HTTP各自的无模型/本地模型替身两种路径，共六组合；包括初始化、工具发现、实际核心调用、错误输入、两阶段语义结果，以及未启用模型时零网络调用。自动协商到服务声明的2025-06-18协议。语义接口回执见[语义SDK回执](sdk-semantic-verification.json)，[旧版回执](sdk-verification.json)保留历史身份。这些是独立协议客户端测试，不是厂商应用原生或真实模型质量证明。

真实文字质量的冻结协议和逐轮记录见[语义评测](evaluation/OPTIMIZATION_PROTOCOL.md)及[验证报告](VERIFICATION.md)；[旧版质量审计](QUALITY_AUDIT.md)保留另一量尺下的历史问题。
