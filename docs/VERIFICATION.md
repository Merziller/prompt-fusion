# 验证报告 — Prompt Fusion 0.1.0

验证日期：2026-11-26（Asia/Shanghai）。本报告区分运行结果、契约替身与未测环境；没有独立 QA 人员或子智能体参与，本次为实现者自测与复核。

## 本机自动化

环境：Windows x64，Node.js v24.19.0，DSH 0.2.2-rc.5。运行：

```sh
npm run build
npm run test:report
npm run check
npm pack --dry-run
```

完整测试：**123 / 123 PASS，0 FAIL，0 SKIP**。其中最后加入录音器墙钟上限回归；机器可读原始报告由 `scripts/test-report.mjs` 生成到本地 output 目录，不包含私人会话。若修改代码，请重新执行，以上数字不代表未来版本。

| 范围 | 覆盖内容 | 证据等级 |
| --- | --- | --- |
| 共享核心 | 原文逐字前缀、代码/数字/路径/引号、各模式/领域/强度、100次确定性随机 Unicode、保留语言、重复增强不堆叠 | 实际 Node 执行 |
| 语义边界 | 不把 Windows 支持改成 Windows-only、不虚构评价或营收、内嵌命令仅作数据、模型只选规则ID | 实际执行 + 恶意模型替身 |
| 异常 | JSON、UTF-8、长度、未知字段、取消、忽略取消的模型超时、模型越界与离线回退 | 实际执行 + 提供商替身 |
| 提供商 | delta/assembled 去重、混合尾部、结束原因、HTTP端点/响应预算/不携带工具 | 流与 HTTP 替身，另有一次真实 DSH 模型调用 |
| MCP | 初始化、列工具、调用、取消、重复活跃ID、错误恢复、帧限制、stdout纯JSON | 实际 stdio 子进程 |
| 七个平台的 Skill | 安装路径、自包含副本、真实执行其脚本、冲突不覆盖、dry-run | 临时目录 + 实际 Node 子进程；不是七个平台原生加载 |
| 平台配置 | Codex TOML、Claude/Antigravity JSON、OpenCode V2结构、路径转义 | 生成器与结构断言；不是宿主解析 |
| DSH Host | connection 路由注册/清理、共享核心、方法/JSON/忙碌/取消、识别器变更不上传 | 服务契约替身 + 下述实际宿主检查 |
| DSH Client | 加载真实生成 bundle、预览不编辑、原生追加、撤销、过期版本/光标阻断 | 明确的最小 hook/slot 替身；不是实际 React/界面 |
| 录音 | PCM16/16kHz/单声道 WAV、重采样、音频预算、静音门控、无音频事件仍在120秒释放麦克风 | 数值与浏览器API替身；不是实体麦克风 |

## 当前 DSH 的真实运行结果

- 本地 bundle 安装返回 `application: applied`；修正接口架构后对本插件停用/启用，均返回 `applied`。
- 通过已注册的真实 `prompt_fusion_enhance` 工具调用：办公场景 standard 返回 `engine: offline`；设计场景 smart、`fallback:false` 返回 `engine: model-assisted`，均完整保留原文前缀，且只追加已审核指引。
- 真实未登录 HTTP：`GET /api/merziller/prompt-fusion/voice-status` 与 `POST /api/merziller/prompt-fusion/enhance` 均为 **401**。最终实现走官方 `connection.fetch` 统一鉴权与 Desktop 载体；没有原始 webServer 旁路。
- 语音服务初次状态观察到 SenseVoice Small (INT8)、host-local、standby，未达到 ready。未执行模型下载、云识别或实体录音。
- 宿主同时报告一个原已存在的 experimental-inspector 错误（`globalThis.fetch is an accessor and cannot be observed safely`）；本插件的真实工具验证仍成功，未更改该无关插件。

## 明确未完成的原生测试

| 项目 | 状态 | 具体原因 |
| --- | --- | --- |
| 已登录 DSH 界面点击与主题/窄屏视觉检查 | BLOCKED | 独立浏览器进入现有 GUI URL 后显示 authentication required；未取得正常登录启动链接，未伪造登录或读取浏览器凭证 |
| DSH Desktop IPC、已登录 connection.fetch 端到端 | NOT_RUN | 代码按公开服务接入，未在已登录 Desktop 界面操作 |
| 实体麦克风、不同识别器与权限弹窗 | NOT_RUN | 未准备识别器，未使用用户实体录音 |
| Claude Code 插件原生验证 | BLOCKED | 已安装 claude 启动器的可执行文件报“指定的可执行文件不是此操作系统平台的有效应用程序。”；没有修复无关安装 |
| Codex、Antigravity、OpenClaw、OpenCode、pi、Hermes 原生加载 | NOT_RUN | 本机 PATH 未发现可执行程序；官方机制已核查，适配脚本已测 |
| Linux/macOS 与 Node 22.19 | 待 CI | 已提供公开仓库 CI 矩阵；只有实际完成的 Actions 结果才算通过 |
| 下游任务质量提升、跨模型触发率 | NOT_RUN | 没有把保真与协议测试误称为任务质量 A/B 或真实触发率评测 |

首次运行请在非关键草稿上验证：增强→预览→末尾应用→撤销→生成预览后编辑原文应阻断应用；检查引用和附件仍在。录音需在设置中准备识别器，确认显示的本机/云位置后再点击。若平台 API 后续变更，以 [平台矩阵](PLATFORMS.md) 与实际测试为准。

## 限制与取舍

本版为保真优先的指引追加器，不是任意改写器；smart 模型仅选择规则，不自由重写。日语等语言采用保留模式。语音规整单列建议。ScriptProcessorNode 已被浏览器标记为旧接口，未来可迁移 AudioWorklet；当前没有私有 React fiber 探测。浏览器后台挂起会影响计时器及时性。外部模型及云识别器的价格和服务行为不属于插件免费承诺。
