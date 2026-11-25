# 发布与市场状态

公开仓库：[Merziller/prompt-fusion](https://github.com/Merziller/prompt-fusion)，Apache-2.0。仓库创建于2026-11-25 19:18:43 UTC，即2026-11-26 03:18:43（Asia/Shanghai）。

## 版本与分发

0.2.0重做为输入框右侧单一增强按钮：场景自动、deep、smart选择审核规则并离线回退，自动编排、直接写回、停止与撤销。不提供第二套语音入口或设置面板。源码、生成Client、CLI/MCP、自包含Skill、安装器、双语文档与来源许可齐全。没有prepare/postinstall钩子；npm尚未发布，不将包名当作已上架。

当前发行请查看 [GitHub Releases](https://github.com/Merziller/prompt-fusion/releases)。0.1.0的[真实发行](https://github.com/Merziller/prompt-fusion/releases/tag/v0.1.0)和72117字节附件已发布；初版提交为 `74c2331e77cd283915d48c2109d010b5b783dbae`。

0.2.0发行安装地址：

```sh
dsh plugin --profile desktop add https://github.com/Merziller/prompt-fusion/releases/download/v0.2.0/prompt-fusion-0.2.0.tgz
```

发行附件上传之后该地址才可用；具体上传回执在下方。其他profile需替换desktop。本机现有本地开发链接已加载0.2，但远程包替换该链接曾发生pnpm `ERR_PNPM_EPERM`，未标记远程替换成功，也未手工覆盖profile。新目录的npm发行包安装和现有DSH链接替换是两项不同验证。

## 测试

本机0.2回归138/138通过，真实宿主工具已返回0.2.0的深度结构化结果。首版公开CI六组Ubuntu/Windows/macOS×Node22.19.0/24全通过。0.2的CI与独立发行包复验以最终回执为准，未用旧版结果替代新版。

## DSH市场申请

已实际创建 [PR #18880](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/18880)，只新增 `data/plugins/Merziller__prompt-fusion.yml`，包含双语描述及预构建包。申请仓库为 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)，非市场应用仓库本身。

按[贡献说明](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)，仓库需创建满一天：最早为 **2026-11-27 03:18:43（Asia/Shanghai）**。当前申请不等于已收录，仍需目录检查与维护者合并；不承诺合并时点。dsh-market目录和npm Discover索引不同，本项目没有宣称进入npm索引。

## 发布回执

本记录在准备0.2发行时生成；实际commit、Release、CI和PR更新将在源码仓库本页记录。版本包内保留的是打包时记录；最新审核状态以链接目的页为准。
