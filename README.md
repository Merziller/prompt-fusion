# Prompt Fusion

**面向任意智能体的提示词规则增强核心与接入层。** Merziller 开发，Apache-2.0，零运行时依赖。提供 DSH 单按钮、标准 Skill、CLI、MCP stdio、MCP Streamable HTTP 和 REST/OpenAPI。品牌预设是快捷方式，不是允许名单。

**质量说明：当前核心仍是“原文保留＋规则补充”，尚未实现真正的语义改写。** 四插件复核中，Prompt Fusion 0.2在本次主观文本质量评分约61/100，明显落后于另外三款。0.3主要扩展通用接入，未把这个质量缺陷包装成已修复。详见[质量审计](docs/QUALITY_AUDIT.md)。

[English](README.en.md) · [通用接入](docs/UNIVERSAL_ACCESS.md) · [平台与官方依据](docs/PLATFORMS.md) · [来源审计](docs/SOURCE_AUDIT.md) · [验证](docs/VERIFICATION.md) · [发布/市场状态](docs/RELEASE.md) · [作者](AUTHORS.md)

## 接入任意具备接口的智能体

需要 Node.js ≥22.19.0。克隆后无需安装运行依赖：

```sh
git clone https://github.com/Merziller/prompt-fusion.git
cd prompt-fusion
node bin/prompt-fusion.mjs --help
node bin/prompt-fusion.mjs enhance "整理现有工程的开发需求，保留原技术栈" --intensity deep --layout structured
node bin/prompt-fusion.mjs enhance --json < request.json
```

| 宿主能力 | 使用方式 |
| --- | --- |
| 标准 Agent Skills | 自包含 `SKILL.md`，`--skills-dir`接受任意目录和品牌标签 |
| MCP命令型客户端 | `node /absolute/path/bin/prompt-fusion.mjs mcp` |
| MCP Streamable HTTP | `serve`启动后连接`/mcp`，无状态JSON响应 |
| HTTP / OpenAPI工具 | `POST /v1/enhance`、`GET /openapi.json` |
| Shell工具 | CLI stdin / JSON / 文件 |
| 仅普通聊天 | 手工复制输出，不称为原生插件安装 |

```sh
node bin/prompt-fusion.mjs install --target AnyAgent --skills-dir /absolute/skills --dry-run
node bin/prompt-fusion.mjs install --target AnyAgent --skills-dir /absolute/skills
node bin/prompt-fusion.mjs config --target generic
node bin/prompt-fusion.mjs serve --host 127.0.0.1 --port 8765
node bin/prompt-fusion.mjs config --target http --server-url https://YOUR_HOST/mcp
```

新增 Kimi快捷安装、WorkBuddy命令型与`streamableHttp`配置；Grok Bot、Muse等按官方接口选择中立方案。**协议互通不等于所有厂商原生实测。** Grok Bot命令在其云端机器运行；Muse手机的localhost指手机。豆包工作公开帮助页正文不足以确认自定义接入格式，仍为待核实。详细状态、同名Muse的限定和一手来源在[平台矩阵](docs/PLATFORMS.md)。

远程监听显式要求令牌；HTTPS、可达网络与宿主秘密配置由部署方提供。本项目没有自动部署公网、TLS/OAuth服务或旧HTTP+SSE适配。安装/卸载检查回执与文件哈希，保留已有或修改过的用户文件。宿主配置只生成新片段，不覆盖原文件。

## DSH：一个按钮

输入区右侧只有 **增强**；运行时变 **停止**，完成后变 **撤销增强**。没有模式/场景/强度/上下文面板或额外语音按钮。沿用DSH原生语音；插件不自动发送消息。普通草稿直接应用；引用块采用原位追加；会话切换、继续编辑和草稿版本变化时阻止过期覆盖。

```sh
dsh plugin --profile desktop add https://github.com/Merziller/prompt-fusion/releases/download/v0.3.1/prompt-fusion-0.3.1.tgz
```

目标DSH0.2.2-rc.5。已验证历史本地目录安装/工具调用；Windows现有开发链接替换远程包曾遇EPERM，未标为成功。已登录GUI点击、DesktopIPC和其他厂商应用端到端状态另见[验证报告](docs/VERIFICATION.md)。市场PR提交与正式上架分开记录。

DSH默认`auto/smart/deep/structured`，只发送当前草稿给宿主已选模型做规则选择，失败离线回退；不读历史、文件或工作区。**模型服务可能收费，项目本身免费。** 当前深度结构会合并预设规则，模型没有自由改写任务正文的能力；这也是本次质量审计指出的主要问题。

## 输入、结果与异常

```json
{"input":"整理一人公司的客户回访工作，不要代发消息。","domain":"auto","mode":"standard","intensity":"deep","layout":"structured"}
```

CLI/MCP/API保留高级参数；默认API为`layout:append`，`structured`只是外围章节组织。返回`original`、`enhanced`、领域/语言、规则ID、引擎、警告和变更元数据。`originalPreserved`指完整原文保留；`reorganized`仅表示结构化输出变化，**不代表完成语义改写或质量提升**。publish模式不执行发布。

- 核心只处理文本，不执行其中的命令、写文件、发送消息或任务；模型没有执行工具。
- 原文48KiB、输出80KiB、模型选择响应8KiB；显式上下文8KiB。空值、无效JSON/UTF-8、未知字段、超长、取消、超时和无效模型输出均有错误或警告。
- MCP stdio为逐行JSON-RPC，stdout只输出协议。HTTP单请求128KiB、并发8个、有超时/断连释放；本机默认监听，非本机绑定需至少24字符令牌。
- HTTP MCP是Streamable HTTP的无状态JSON响应形式；GET返回405，无旧SSE服务。REST/OpenAPI共用核心。未提供浏览器跨域前端。
- 只明确提供的参考资料参与API；没有隐式长期记忆。凭证模式检查不等于完整脱敏。
- 中文/英文规则可用；其他脚本保留原文。场景正则仍可能误分类，详见质量审计。

CLI显式模型调用：

```sh
# 仅此时读取FUSION_BASE_URL、FUSION_MODEL、可选FUSION_API_KEY。
node bin/prompt-fusion.mjs enhance --file prompt.txt --mode smart --model --intensity deep --layout structured
```

离线默认免费，无订阅、收费模块、遥测或强制云服务。显式调用的自选模型/云主机可能产生第三方费用。

## 开发、测试与卸载

```sh
npm run build
npm test
npm run check
npm run test:report
npm pack --dry-run
# 可选：提供自己安装的官方SDK路径；不为项目引入运行依赖。
node scripts/sdk-smoke.mjs --sdk-root /absolute/node_modules/@modelcontextprotocol/sdk
```

本轮本机回归161项；官方SDK1.32.2对stdio、HTTP、HTTP Bearer分别初始化、发现、调用、无效输入测试通过。这是工程与协议证据，质量评分单独计算；厂商原生、CI和发行包复验详见[验证报告](docs/VERIFICATION.md)。

DSH在插件设置停用/卸载；Skill使用`uninstall --skill-dir EXACT_DIRECTORY`并先dry-run；修改过的安装保留供人工审阅。MCP只删除自己合并的配置条目。`serve`是显式前台服务，停止进程后无常驻服务。

## 开源与致谢

新代码Apache-2.0。借鉴[feiwell](https://github.com/feiwell/dsh-enhance-prompt)、[ChosenXu](https://github.com/ChosenXu/dsh-prompt-enhancer)、[Fishsb](https://github.com/Fishsb/dsh-voice-prompt-enhancer)的功能思路，未直接复制运行时代码、提示词模板或图标。原许可证和NOTICE保留；原作者是来源致谢对象，不虚构为实际贡献者。见[第三方声明](THIRD_PARTY_NOTICES.md)。

微信 **Merziller** · QQ **1411574209** · 邮箱 **k26789228@gmail.com**（本人明确确认用于公开项目）。
