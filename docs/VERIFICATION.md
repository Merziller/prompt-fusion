# 验证报告 — Prompt Fusion0.3.1

2026-11-26，Asia/Shanghai。实现者自测；没有虚构独立QA、团队签字或厂商应用测试。文字效果另见[质量审计](QUALITY_AUDIT.md)，工程测试数量不作为增强质量分数。

## 本轮工程回归

Windows x64、Node24.19.0：构建、161项回归、元数据/导出/语法/本地链接/生成客户端检查。机器数据见[test-results.json](test-results.json)。发行包独立安装复验及本轮CI实际回执见[发布记录](RELEASE.md)。

| 范围 | 实际检查 | 证据层级 |
| --- | --- | --- |
| 原有核心/结构 | 原文、代码/数字/标识符、语言、幂等、预算、取消、超时、规则JSON、流式去重等 | 实际Node及明确提供商替身 |
| 通用Skill | 任意品牌标签和显式目录、自包含执行、dry-run、不覆盖、带哈希回执卸载、已编辑/额外/缺失文件保留、symlink/junction拒绝 | 临时目录、实际文件与Node执行 |
| 新CLI | 任意目录安装/卸载、命令型/远程配置、无效端口、空令牌变量、实际启动Bearer服务且日志不回传令牌 | 实际子进程/HTTP请求 |
| stdio MCP | 初始化、工具列表、实际调用、错误、取消、帧限制、stdout协议纯净 | 实际子进程 |
| HTTP MCP | 初始化/通知/工具调用、无状态跨客户端ID、协议/方法/Accept/JSON/UTF-8/大小边界 | 实际本机服务和请求 |
| HTTP边界 | Bearer覆盖MCP/REST/OpenAPI，非本机需令牌，Host/Origin限制、8并发、超时/断连/关闭 | 实际本机服务；Host使用真正发送该头的node:http客户端 |
| REST/OpenAPI | 相同核心、Schema、错误与认证 | 实际HTTP；非厂商平台导入 |
| DSH一按钮 | 单控件、无面板/语音、固定参数、直接应用/停止/撤销/编辑竞态/会话切换/引用保护 | 执行真实生成bundle的hook/slot契约替身，非已登录React GUI |
| 便携预设 | 原七宿主及新增Kimi路径；WorkBuddy命令/streamableHttp配置 | 配置与文件测试，非厂商程序原生加载 |

## 独立官方SDK互通

使用另行安装的官方`@modelcontextprotocol/sdk1.32.2`，项目运行时仍零依赖。命令：

```sh
node scripts/sdk-smoke.mjs --sdk-root /absolute/node_modules/@modelcontextprotocol/sdk
```

stdio、HTTP、HTTP+Bearer三种连接均完成initialize、listTools、callTool、错误输入。调用结果与共享核心一致，版本0.3.1。SDK最高协议与服务器协商至2025-06-18。回执见[sdk-verification.json](sdk-verification.json)。这是独立客户端协议互通，不是Grok Bot、Muse、WorkBuddy等应用原生通过。

## 历史真实DSH证据（版本不混用）

- DSH0.2.2-rc.5的0.1/0.2本地目录安装及停用/启用返回`application:applied`。
- 真实0.2工具返回`model-assisted/structured/deep`及原文，0.1离线/模型调用也完成；未登录enhance/voice-status实际返回401。最终Host为官方connection，无raw webServer旁路。
- 本轮0.3未改DSH交互源码，也未重新宣称已登录GUI/IPC端到端通过。
- 现有无关experimental-inspector有fetch accessor警告，与本插件工具结果同时存在；未修改无关插件。

## CI、质量与待测

历史0.1/0.2的六组OS/Node CI已成功。0.3.0源码CI中Windows/Linux四组成功、macOS两组失败：安装器误拦系统/var别名。0.3.1限定放行Darwin根级/var、/tmp、/etc指向各自/private标准目标，仍拦任意普通链接；增加严格映射回归。0.3.1源码CI实际六组全部成功（run45712394306），已逐一核对job；全新安装的发行包亦161/161PASS并通过SDK三连接。旧失败运行保留，链接和匿名下载哈希详见发布记录。

本次质量复核为历史36份真实模型输出＋本地已发布0.2运行12份，共48份逐条审阅。新增真实LLM调用0；主试验/探索设置分开；作者主观评分而非独立盲评。当前核心约61/100。没有完成新语义改写器或新的下游提升试验。

| 项目 | 状态与原因 |
| --- | --- |
| 各厂商智能体应用原生加载/真实业务 | NOT_RUN；协议、配置和SDK互通不替代厂商应用实测 |
| Claude Code原生 | BLOCKED；现有claude.exe平台错误；未修复无关安装 |
| 已登录DSH GUI/主题/窄屏/DesktopIPC | NOT_RUN；独立浏览器要求正常登录；组件只做契约验证 |
| Windows开发链接替换远程包 | 历史FAILED/BLOCKED；pnpm profile目录rename出现ERR_PNPM_EPERM；没有重复覆盖或修改ACL |
| 实体语音 | NOT_RUN；DSH继续使用自带语音，插件没有第二入口 |
| 公网HTTPS/OAuth/旧SSE/浏览器CORS前端 | 本版未交付；HTTP服务不等于已部署公共云服务 |
| 豆包工作自定义传输 | 官方帮助页已找到，返回正文证据不足，待核实 |
| 任意“同名Muse” | 仅查Zer0Qing/Muse；其他项目需精确来源 |

已知质量缺陷不因161项工程回归消失，公开记录于[质量审计](QUALITY_AUDIT.md)。项目免费，自选模型与托管服务费用另计。
