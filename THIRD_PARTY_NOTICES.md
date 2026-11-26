# 第三方来源与许可声明

Prompt Fusion 自行实现核心、CLI、MCP 服务、DSH 主机与客户端、录音/VAD/PCM 编码、安装器、图标、语义改写/审查提示词及测试。产品运行时没有复制三个原插件的运行时代码、系统提示词模板、图标或打包依赖；借鉴的是功能方向及已公开的扩展接口。相似的 DSH 注册调用是对同一宿主 API 的使用。

单独的`evals/semantic-rounds`对照评测数据会原样记录上述固定版本的模型提示词、请求和结果，以便复算比较；这些原插件提示词属于相应原作者，按下表及随附的完整许可保留声明，不重新归为Merziller原创，也不装载到产品的语义增强流程。评测中的运行时快照为本项目各轮自身代码；模型生成结果仅作为有出处的观测记录，不冒充人工编写或上游作者的背书。

| 原项目 | 原作者署名 | 审查版本 / commit | 许可证 | 本项目借鉴内容 |
|---|---|---|---|---|
| [dsh-enhance-prompt](https://github.com/feiwell/dsh-enhance-prompt) | feiwell | 0.2.0 / `72524db41749dd6faa0820e58cd94dcbcd47d1e6` | MIT，Copyright 2026 feiwell | 输入框入口、开发/设计/办公场景、撤销体验 |
| [dsh-prompt-enhancer](https://github.com/ChosenXu/dsh-prompt-enhancer) | ChosenXu；许可文件署名 DSH Prompt Enhancer contributors | 1.0.0 / `4019a2cae49cdca445b0af2ff5f301ac5c2c2a02` | MIT，Copyright 2026 DSH Prompt Enhancer contributors | 多档强度、取消/超时、前后端分工 |
| [dsh-voice-prompt-enhancer](https://github.com/Fishsb/dsh-voice-prompt-enhancer) | Fishsb | 3.5.1 / `1809510556edbc3e4cc814f851e1f7d32bb38353` | Apache-2.0，Copyright 2026 Fishsb | 分级模式、语音转写后增强、术语词典、显式草稿记忆 |

上游完整许可原文存放在 [third-party/licenses](third-party/licenses)：[feiwell MIT](third-party/licenses/feiwell-MIT.txt)、[ChosenXu MIT](third-party/licenses/ChosenXu-MIT.txt)、[Fishsb Apache-2.0](third-party/licenses/Fishsb-Apache-2.0.txt)、[Fishsb NOTICE](third-party/licenses/Fishsb-NOTICE.txt)。ChosenXu 的原许可还提到 Lucide 图标；本项目使用自行绘制的 SVG，没有复用 Lucide 资产。

新代码使用 [Apache-2.0](LICENSE)，版权为 Merziller；原许可原文的权利归相应权利人。Apache 官方的 [Category A 列表](https://www.apache.org/legal/resolved.html#category-a) 包括 MIT；本项目独立实现仍保留出处和原文以便追溯。以后若实际引入上游代码，必须逐项记录文件、变更和适用许可，不能把“借鉴”声明当作免除义务。

以上是来源与文件清单，不表示原作者对本项目提供支持、参与开发或认可本项目。
