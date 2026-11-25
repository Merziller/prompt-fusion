# Prompt Fusion0.3.0 — 能力中立接入与质量审计

品牌名单不再限制接入。标准Skill、CLI、MCP stdio、MCP Streamable HTTP和REST/OpenAPI共用零依赖核心；宿主具有相应扩展能力即可选择适配方式。未验证的厂商程序不宣称原生兼容。

- 任意智能体标签＋显式Skill目录；安装不覆盖，带哈希回执卸载保留修改/额外/缺失文件。
- 新增`serve`、无状态JSON响应MCP、REST和OpenAPI3.1，默认loopback；跨机显式Bearer令牌。预算、来源/Host、8并发、取消和截止均有回归。生产HTTPS由部署方网关提供，无OAuth、旧SSE或代建公网服务。
- Kimi路径修正；WorkBuddy命令型/streamableHttp配置；Grok Bot云端Command/Remote HTTPS、Zer0Qing/Muse Android远程接入的依据与限制；豆包工作自定义接口待核实。
- 官方MCP SDK1.32.2实测stdio/HTTP/Bearer HTTP初始化、发现、实际调用和错误输入；可运行复现脚本。工程回归160项，厂商原生加载/已登录DSH GUI保持单列待测。
- DSH继续一个增强按钮，同按钮停止/撤销，不增加设置面板或录音入口。不自动发送或执行原任务。

**质量披露：本次48份输出复核中，已发布0.2约60.8/100。核心仍保留原文并追加规则，尚未实现用户期望的真正语义改写。0.3是接入改进版，不能当成该缺陷已修复。** 评分由实现助手主观给出，非独立盲评；原三款使用历史36份真实输出，本款12份发行包本地离线执行，新模型调用0。详见docs/QUALITY_AUDIT.md。

Apache-2.0，作者Merziller。三个上游来源/许可证与致谢保留，未虚构贡献者。项目免费；自选模型和托管商可收费。市场PR #18880为申请，实际收录以目录合并为准。Windows现存开发链接远程替换的EPERM仍是历史未解决环境项；不手工覆盖profile。
