# 发布与市场状态

公开仓库：[Merziller/prompt-fusion](https://github.com/Merziller/prompt-fusion)，Apache-2.0，作者Merziller。仓库创建于2026-11-25 19:18:43UTC（2026-11-26 03:18:43Asia/Shanghai）。npm尚未发布，不把包名当成已上架。

## 0.5.2-rc.1 预发布准备与核验入口

本次选择发布 **0.5.2-rc.1**，不覆盖 0.5.1 稳定版。实际变化、七项开发候选现场检查、RC 字节关系及未测项见[本版验证](releases/0.5.2-rc.1.md)。窄窗口测试遇到原因未定的 Desktop 渲染进程崩溃，主题覆盖尚未完成，因此保持预发布身份。

- [GitHub 预发布页面](https://github.com/Merziller/prompt-fusion/releases/tag/v0.5.2-rc.1)：以页面上的公开状态、源码标签和附件为准。本文件冻结于打包阶段，不把预定地址视为已经上传。
- [固定附件地址](https://github.com/Merziller/prompt-fusion/releases/download/v0.5.2-rc.1/prompt-fusion-0.5.2-rc.1.tgz)与[校验和](https://github.com/Merziller/prompt-fusion/releases/download/v0.5.2-rc.1/SHA256SUMS.txt)。发布流程在真实上传后匿名重新下载并核对字节。
- [源码 CI](https://github.com/Merziller/prompt-fusion/actions)：当前门禁使用 `scripts/verify-current-release.mjs`；历史 0.5.1 的严格清单仍由精确旧版 fixture 测试。
- [市场申请 #18880](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/18880)：2026-11-27 10:27 Asia/Shanghai 查询时仍 OPEN、未合并，目录主分支中尚无本项目条目。后续是否收录以远端申请为准。
- 项目免费公开；没有发布 npm 包，按 GitHub 固定标签归档安装。无需提供新的仓库或登录资料，已有仓库推送权限已核实。

## 0.5.1 稳定发行（历史核验记录）

用户已授权推送正式源码、GitHub Release与更新已有DSH目录申请。出品方为禾杨智绘工作室（绍兴市柯桥区禾杨智绘软件开发工作室），开发者Merziller（子墨）；继续使用Apache-2.0和原有公共标识。

- 版本身份：`@merziller/prompt-fusion@0.5.1`，运行代码相对已验证0.5.1-dev只变更版本字面量；[发行清单](../evals/releases/0.5.1/manifest.json)保留对应字节身份。
- 源码构建、完整回归和检查：384/384 PASS；[机器回执](test-results.json)。
- 官方MCP SDK六组合及React/Lexical撤销复现：PASS；[SDK回执](sdk-semantic-verification.json)、[撤销回执](releases/0.5.1-undo-verification.json)。均不冒充已登录GUI测试。
- 正式源码已推送：[发行提交 `276f801784a66b79f3b229f64a633aaedcafae71`](https://github.com/Merziller/prompt-fusion/commit/276f801784a66b79f3b229f64a633aaedcafae71)。补充了Git属性，确保历史源码和上游许可证按原始字节检出，不改变运行代码。
- [Release v0.5.1](https://github.com/Merziller/prompt-fusion/releases/tag/v0.5.1)已于2026-11-27 00:21:03 Asia/Shanghai公开。正式附件4,121,146字节，匿名下载与本地归档SHA256一致：`a05e6b20ae49f00c2dfc3c23568d254d3e7e4fa723e8c0d146d177dc9dedabd9`；另有[校验文件](https://github.com/Merziller/prompt-fusion/releases/download/v0.5.1/SHA256SUMS.txt)。首次公开下载检查返回404，后续匿名下载已成功验证，原记录保留。
- 正式tgz在全新离线目录安装，275个文件逐字节一致；安装后的384/384测试、源码检查、官方SDK六组合及React/Lexical撤销复现均PASS。公开仓库全新克隆也完成构建、384项测试、检查和发行身份验证。
- [发行提交CI](https://github.com/Merziller/prompt-fusion/actions/runs/45857920987)与[源码提交CI](https://github.com/Merziller/prompt-fusion/actions/runs/45857286572)均已核实：Ubuntu、Windows、macOS × Node 22.19.0/24，六组全部成功。
- [市场PR #18880](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/18880)已更新至0.5.1固定附件，仅变更`data/plugins/Merziller__prompt-fusion.yml`；远端条目和申请正文与本地匹配。截至2026-11-27 00:26 Asia/Shanghai，申请OPEN、未合并，目录检查仍进行中；不宣称已被市场收录或所有客户端已同步。仓库满一天的最早时刻为2026-11-27 03:18:43 Asia/Shanghai，最终收录由维护者决定。
- [机器发布回执](releases/0.5.1-publication.json)分别记录附件身份、六组CI和申请状态。此页后续文档提交不移动发行标签、不改写已发布附件。

安装命令：

```sh
dsh plugin --profile desktop add https://github.com/Merziller/prompt-fusion/releases/download/v0.5.1/prompt-fusion-0.5.1.tgz
```

[0.5.1范围与复现命令](releases/0.5.1.md)。当前版本没有新四方/五方质量评分，下文均为历史身份。

## 0.4.0 历史本地发行准备（当时未发布）

第十轮冻结质量验收已通过：固定集99.79、迁移集99.13、总体99.46、最低单例95，关键错误0。交付运行时与该轮十个源模块逐字一致，只有核心版本字面量从开发版改为0.4.0；按钮CSS、图标与位置的冻结摘要不变。

本机308/308工程回归及官方SDK1.32.2六种协议/模型替身组合通过。实际预构建包、全新隔离安装、对应源码CI、公开下载哈希和市场申请更新将各自记录结果，尚未执行的步骤不以准备文件冒充成功。

当时0.4.0完成了本地归档与验证，后续按用户要求先进行WorkBuddy文档对照和修复，未推送该发行。不要把当时计划中的v0.4.0下载地址当成已公开附件。十轮原始证据包含历史失败与上游服务错误，见[汇总](evaluation/RESULTS.md)。

## 0.3系列历史记录

通用Skill目录和回执卸载、MCP stdio/Streamable HTTP、REST/OpenAPI、CLI与平台证据文档已完成。已发布的[0.3.0](https://github.com/Merziller/prompt-fusion/releases/tag/v0.3.0)提交`23661cc3b113c3d6959c91c6a67ea815d03dc954`，附件91011字节、SHA256`78db19db6dc2f654bfa011cb063ffee4e00e83221c0e067d02136b976aae35b2`，已匿名下载比对。隔离包160项及SDK三连接通过，但[CI](https://github.com/Merziller/prompt-fusion/actions/runs/45711121386)只有Windows/Linux四组成功、macOS两组失败：安装器误拦系统/var别名。保留原标签/附件和失败运行，不覆盖历史。

0.3.1限定放行Darwin根级/var、/tmp、/etc到各自/private标准目标，普通链接继续拒绝。2026-11-26 06:22Asia/Shanghai最终核对：

- 已推送版本提交[`608616fc7277284131d1e4029f37325e2126c8f5`](https://github.com/Merziller/prompt-fusion/commit/608616fc7277284131d1e4029f37325e2126c8f5)。
- [Release v0.3.1](https://github.com/Merziller/prompt-fusion/releases/tag/v0.3.1)和[预构建附件](https://github.com/Merziller/prompt-fusion/releases/download/v0.3.1/prompt-fusion-0.3.1.tgz)已公开，92269字节；匿名下载与本地SHA256一致：`4d5455a00dfa784a96f2afb39e7b9b63078ba66881ae89f91b27ac2cc873cc4b`。
- 本机源码及全新隔离目录安装的实际发行包，均**161/161PASS**、检查PASS；官方SDK1.32.2在两者上stdio/HTTP/Bearer HTTP互通PASS。隔离复验于2026-11-25 22:21UTC完成。
- 对应[源码CI](https://github.com/Merziller/prompt-fusion/actions/runs/45712394306)的Windows/macOS/Ubuntu×Node22.19.0/24，**六组全部成功**；已逐个读取job结果。旧0.3.0失败记录保留。
- 市场PR #18880已实际更新0.3.1的YAML附件地址及正文，远端内容与本地匹配；截至核对时OPEN、未合并，不称已收录。

安装命令：

```sh
dsh plugin --profile desktop add https://github.com/Merziller/prompt-fusion/releases/download/v0.3.1/prompt-fusion-0.3.1.tgz
```

上述全新目录验证不覆盖下方既有DSH开发链接替换故障，其他profile替换desktop。

[质量审计](QUALITY_AUDIT.md)已完成，旧0.2约61/100；0.3系列仅改接入，未修复语义改写缺陷。见[验证报告](VERIFICATION.md)及[SDK回执](sdk-verification.json)。

## 市场申请与安装边界

真实申请：[PR #18880](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/18880)，仅新增`data/plugins/Merziller__prompt-fusion.yml`，不动生成文档或他人条目。按[贡献说明](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)，仓库满一天最早为**2026-11-27 03:18:43Asia/Shanghai**；这不是承诺收录时点。维护者合并、dsh-market目录、npm Discover索引分别判断。本项目没有向其他厂商市场提交插件。

历史DSH0.1/0.2本地目录加载成功。现有Windows开发链接替换远程包遇到pnpm `ERR_PNPM_EPERM`，未标远程替换通过，也未手工覆盖profile。全新隔离目录的npm包安装与DSH当前profile链接替换是不同验证。已登录GUI、DesktopIPC、其他厂商应用原生加载仍按[平台矩阵](PLATFORMS.md)列待测。

## 历史发行记录

- 0.1.0：[Release](https://github.com/Merziller/prompt-fusion/releases/tag/v0.1.0)，72117字节附件；提交`74c2331e77cd283915d48c2109d010b5b783dbae`，本机123项；Ubuntu/macOS/Windows×Node22.19.0/24六组公开CI通过。
- 0.2.0：[Release](https://github.com/Merziller/prompt-fusion/releases/tag/v0.2.0)，[附件](https://github.com/Merziller/prompt-fusion/releases/download/v0.2.0/prompt-fusion-0.2.0.tgz)70788字节；提交`0fdf97f78b58e46643bc856d3529e7cc144c8de4`，SHA256`31cf4939daead6f365b966deb3195490e2d8e6f294064d312a0f46a5d7757c5c`。已匿名下载比对，隔离包138/138PASS。
- 0.2在2026-11-26 04:15核验的[源码CI](https://github.com/Merziller/prompt-fusion/actions/runs/45692452508)为5/6成功、macOS24排队；这里只保留当时快照，不作为当前或新版结论。

源码main中的本页补录最终发布回执；发行包内保留打包时的历史快照。质量问题、厂商未测和目录审核不会因上传而变成PASS。
