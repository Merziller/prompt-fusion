# 发布与市场状态

公开仓库：[Merziller/prompt-fusion](https://github.com/Merziller/prompt-fusion)，Apache-2.0，作者Merziller。仓库创建于2026-11-25 19:18:43UTC（2026-11-26 03:18:43Asia/Shanghai）。npm尚未发布，不把包名当成已上架。

## 0.3.0 本轮构建状态

2026-11-26 06:08Asia/Shanghai：通用Skill目录和回执卸载、MCP stdio/Streamable HTTP、REST/OpenAPI、CLI与平台证据文档已完成。本机Node24.19.0/win32回归**160/160PASS**、构建和元数据/语法/链接检查PASS。官方SDK1.32.2三种连接互通PASS，见[验证报告](VERIFICATION.md)和[SDK回执](sdk-verification.json)。

0.3.0源码推送、独立发行包与公开附件、对应CI和市场条目更新在本轮发布操作后补记真实回执；此处尚不声称已发布。质量审计已完成，旧0.2约61/100；0.3仅改接入，未修复语义改写缺陷。

## 市场申请与安装边界

真实申请：[PR #18880](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/18880)，仅新增`data/plugins/Merziller__prompt-fusion.yml`，不动生成文档或他人条目。按[贡献说明](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)，仓库满一天最早为**2026-11-27 03:18:43Asia/Shanghai**；这不是承诺收录时点。维护者合并、dsh-market目录、npm Discover索引分别判断。本项目没有向其他厂商市场提交插件。

历史DSH0.1/0.2本地目录加载成功。现有Windows开发链接替换远程包遇到pnpm `ERR_PNPM_EPERM`，未标远程替换通过，也未手工覆盖profile。全新隔离目录的npm包安装与DSH当前profile链接替换是不同验证。已登录GUI、DesktopIPC、其他厂商应用原生加载仍按[平台矩阵](PLATFORMS.md)列待测。

## 历史发行记录

- 0.1.0：[Release](https://github.com/Merziller/prompt-fusion/releases/tag/v0.1.0)，72117字节附件；提交`74c2331e77cd283915d48c2109d010b5b783dbae`，本机123项；Ubuntu/macOS/Windows×Node22.19.0/24六组公开CI通过。
- 0.2.0：[Release](https://github.com/Merziller/prompt-fusion/releases/tag/v0.2.0)，[附件](https://github.com/Merziller/prompt-fusion/releases/download/v0.2.0/prompt-fusion-0.2.0.tgz)70788字节；提交`0fdf97f78b58e46643bc856d3529e7cc144c8de4`，SHA256`31cf4939daead6f365b966deb3195490e2d8e6f294064d312a0f46a5d7757c5c`。已匿名下载比对，隔离包138/138PASS。
- 0.2在2026-11-26 04:15核验的[源码CI](https://github.com/Merziller/prompt-fusion/actions/runs/45692452508)为5/6成功、macOS24排队；这里只保留当时快照，不作为当前或新版结论。

源码main中的本页补录最终发布回执；发行包内保留打包时的历史快照。质量问题、厂商未测和目录审核不会因上传而变成PASS。
