# 验证报告 — Prompt Fusion 0.2.0

日期2026-11-26（Asia/Shanghai）。实现者自测与复核，没有虚构独立QA或团队签字。

## 本机回归

Windows x64、Node v24.19.0、DSH0.2.2-rc.5：`npm run build`、`npm run test:report`，**138/138 PASS，0 FAIL，0 SKIP**。机器可读报告见 [test-results.json](test-results.json)，可重跑生成；修改后的未来版本需重新验证。

| 范围 | 实际覆盖 | 证据等级 |
| --- | --- | --- |
| 保真核心 | 原文/代码/数字/路径/否定约束，中英及其他语言保留，100次确定性Unicode回归，模式/领域/强度，重复增强不堆叠 | 实际Node执行 |
| 新版结构 | 原文在任务章节完整保留，章节顺序、任务细化上限、不得降级deep、未知layout拒绝 | 实际Node执行 |
| 模型与异常 | 严格规则ID、不执行原任务、无效/恶意输出、JSON/UTF-8/预算/取消/超时/离线回退、流式去重与混合尾部 | 实际执行及提供商/HTTP/流替身 |
| MCP | 初始化、列出与调用、取消、重复活跃ID、帧上限、错误恢复、stdout纯JSON | 实际stdio子进程 |
| 七平台适配 | 安装路径、自包含核心与structure副本、执行安装后脚本、冲突不覆盖、dry-run、配置结构与转义 | 临时目录+实际Node子进程；不是七宿主原生加载 |
| DSH Host | 官方connection路由、注册/清理、方法/类型/JSON/忙碌/取消、识别器变更不上传 | 服务契约替身及下述真实工具调用 |
| 新版单按钮 | 恰好一个input.right按钮、无select/textarea/details/语音面板、固定auto/smart/deep、直接应用、停止、同按钮撤销、并发编辑、引用追加 | 执行真实生成bundle的最小hook/slot契约替身；不是实际React/已登录GUI |
| 保留的语音底层 | PCM16/16kHz/单声道WAV、重采样、静音门控、120秒上限释放 | 数值与浏览器API替身；新版前端不装入录音模块 |

## 当前DSH的真实结果

- 本地目录bundle安装及新版停用/启用返回 `application:applied`。未更改其他插件。
- 真实 `prompt_fusion_enhance` 已返回 **version0.2.0、engine:model-assisted、layout:structured、intensity:deep**；测试要求包含仅一个按钮、保留框架、Windows与Linux，结果原文逐字保留并自动补充插件/界面要点。
- 0.1阶段真实离线/模型调用均通过；未登录enhance与voice-status实际返回401。最终Host使用官方connection，无原始webServer旁路。
- 用户提供截图证明0.1面板实际显示，并据其反馈改为0.2单按钮；这张截图不当作0.2已登录点击验证。
- 已有experimental-inspector曾报告 `globalThis.fetch is an accessor and cannot be observed safely`；与本插件工具调用成功同时存在，未修复无关插件。

## CI与发行包

首版源码提交 `74c2331e77cd283915d48c2109d010b5b783dbae` 的 [公开CI](https://github.com/Merziller/prompt-fusion/actions/runs/45686010972) 六组全部成功：Ubuntu/Windows/macOS × Node22.19.0/24。这是跨OS核心/协议/适配脚本执行，不是各智能体原生兼容证明。

0.1发行包已在独立目录安装并重跑123项及检查，全通过。0.2的发行包复验与CI实际回执列在 [发布记录](RELEASE.md)；没有把旧版CI结果写成新版结果。

## 待测与限制

| 项目 | 状态与原因 |
| --- | --- |
| 0.2已登录GUI点击、主题、窄屏、DesktopIPC端到端 | NOT_RUN；独立浏览器进入现有GUI后要求正常登录。新版真实生成组件有契约测试，本地已重新加载，未宣称完成原生界面实测 |
| 从远程发行地址替换现有Windows开发链接 | FAILED/BLOCKED；pnpm在profile包目录执行rename时报ERR_PNPM_EPERM，现有目录仍指向本地源码。未绕过该写入错误，未做文件权限修复；本地Git元数据与缺失清单已从公开提交恢复，修改内容保留 |
| Claude Code原生加载 | BLOCKED；现有claude.exe报“指定的可执行文件不是此操作系统平台的有效应用程序。” |
| Codex、Antigravity、OpenClaw、OpenCode、pi、Hermes原生加载 | NOT_RUN；PATH未发现可执行程序；官方机制与安装脚本分别核验 |
| 实体麦克风/识别器端到端 | NOT_RUN；0.2使用DSH自带语音，不重复提供入口 |
| 下游任务提升、跨模型触发率、任意语种增强 | NOT_RUN；没有把保真、模板和协议通过数当作质量A/B结论 |

首次使用可在非关键草稿上检查：增强→同按钮撤销；增强中继续编辑应保留新输入；引用/附件仍在；普通草稿不要求光标置末尾。其他平台边界见 [PLATFORMS](PLATFORMS.md)。

取舍：模型只选规则，结构化保留原句，不做任意语义改写；适用补充来自审核条件规则。它避免硬约束漂移，但不会承诺自动解决原请求的歧义或总能提高下游成绩。项目免费不代表自选模型服务免费。
