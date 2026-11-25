# 发布与市场状态

公开仓库：[Merziller/prompt-fusion](https://github.com/Merziller/prompt-fusion)，Apache-2.0。仓库创建于2026-11-25 19:18:43 UTC，即2026-11-26 03:18:43（Asia/Shanghai）。

## 版本与分发

0.2.0重做为输入框右侧单一增强按钮：场景自动、deep、smart选择审核规则并离线回退，自动编排、直接写回、停止与撤销。不提供第二套语音入口或设置面板。源码、生成Client、CLI/MCP、自包含Skill、安装器、双语文档与来源许可齐全。没有prepare/postinstall钩子；npm尚未发布，不将包名当作已上架。

当前发行请查看 [GitHub Releases](https://github.com/Merziller/prompt-fusion/releases)。0.1.0的[真实发行](https://github.com/Merziller/prompt-fusion/releases/tag/v0.1.0)和72117字节附件已发布；初版提交为 `74c2331e77cd283915d48c2109d010b5b783dbae`。

0.2.0发行安装地址：

```sh
dsh plugin --profile desktop add https://github.com/Merziller/prompt-fusion/releases/download/v0.2.0/prompt-fusion-0.2.0.tgz
```

该附件已验证可匿名下载，上传回执在下方。其他profile需替换desktop。本机现有本地开发链接已加载0.2，但远程包替换该链接曾发生pnpm `ERR_PNPM_EPERM`，未标记远程替换成功，也未手工覆盖profile。新目录的npm发行包安装和现有DSH链接替换是两项不同验证。

## 测试

本机0.2回归138/138通过，真实宿主工具已返回0.2.0的深度结构化结果。首版公开CI六组Ubuntu/Windows/macOS×Node22.19.0/24全通过。0.2的CI与独立发行包复验以最终回执为准，未用旧版结果替代新版。

## DSH市场申请

已实际创建 [PR #18880](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/18880)，只新增 `data/plugins/Merziller__prompt-fusion.yml`，包含双语描述及预构建包。申请仓库为 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)，非市场应用仓库本身。

按[贡献说明](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)，仓库需创建满一天：最早为 **2026-11-27 03:18:43（Asia/Shanghai）**。当前申请不等于已收录，仍需目录检查与维护者合并；不承诺合并时点。dsh-market目录和npm Discover索引不同，本项目没有宣称进入npm索引。

## 发布回执

2026-11-26 04:15（Asia/Shanghai）核对：

- 完整0.2源码已推送，版本提交 [`0fdf97f78b58e46643bc856d3529e7cc144c8de4`](https://github.com/Merziller/prompt-fusion/commit/0fdf97f78b58e46643bc856d3529e7cc144c8de4)。
- [Release v0.2.0](https://github.com/Merziller/prompt-fusion/releases/tag/v0.2.0) 已公开发布；[预构建包](https://github.com/Merziller/prompt-fusion/releases/download/v0.2.0/prompt-fusion-0.2.0.tgz) 70788字节，已匿名下载并与本地产物逐字节哈希核对。
- SHA256：`31cf4939daead6f365b966deb3195490e2d8e6f294064d312a0f46a5d7757c5c`。
- 最终发行包在全新隔离目录安装，重跑 **138/138 PASS**，构建一致性、导出、语法、清单和文档链接检查通过（2026-11-25 20:10:44 UTC）。
- 当前本地DSH停用/启用该bundle均返回 `application:applied`；没有再次尝试失败的远程开发链接替换。
- [新版源码CI](https://github.com/Merziller/prompt-fusion/actions/runs/45692452508)：Ubuntu与Windows的Node22.19.0/24，以及macOS的Node22.19.0，共 **5/6成功**；macOS Node24仍排队。另一个tag触发的同提交CI也有排队项，未声明整组通过。
- [市场PR #18880](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/18880) 已实际更新描述与0.2.0附件；远端YAML和PR正文与交付内容一致。状态OPEN、未合并，[目录检查](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/actions/runs/45692560421/job/139481538487) 仍进行中；未声称已收录。

源码仓库本页是最终回执；版本包内保留打包时记录。CI排队、市场审核和已登录GUI/其他智能体原生待测项不因发布而改成PASS。
