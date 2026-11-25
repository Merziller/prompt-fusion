# 发布与市场状态

项目：[Merziller/prompt-fusion](https://github.com/Merziller/prompt-fusion)，公开仓库，Apache-2.0。创建时间为 2026-11-25 19:18:43 UTC，即北京时间 **2026-11-26 03:18:43**。

本地交付包含完整源码、生成的 DSH 客户端、零依赖构建、CLI、MCP、七类平台 Skill 安装器、配置生成器、双语说明、测试、来源审计、作者与第三方许可。无需 npm 认证即可从 GitHub 克隆运行。

## 分发

首版目标 tag：`v0.1.0`。预构建发行附件：`prompt-fusion-0.1.0.tgz`。实际发布结果以 GitHub Releases 页面及下方发布回执为准。无 prepare/postinstall 构建钩子。尚未发布 npm（本次无 npm 认证），也不将 npm 包名写作已上架。

DSH 安装命令：

```sh
dsh plugin --profile desktop add https://github.com/Merziller/prompt-fusion/releases/download/v0.1.0/prompt-fusion-0.1.0.tgz
```

该命令需在发行附件实际上传后使用；本机已验证从项目目录安装，远程发行安装另见回执。其他 profile 请替换 desktop。

## DSH 市场

收录目标是 [awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)，不是 dsh-market 应用本身。按其 [贡献说明](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)，只增加 `data/plugins/Merziller__prompt-fusion.yml` 一条，附双语功能描述与 GitHub 发行包地址。

已发现明确门槛：**仓库创建满 1 天**。本仓库最早满足时间为 **2026-11-27 03:18:43（Asia/Shanghai）**。提交申请不等于收录；还需通过目录检查并由维护者审阅合并。新仓库的年龄检查可能暂时失败，目录说明表示会刷新过期结论，无需伪造提交日期或空提交。

合并后 dsh-market 会随目录更新展示条目。官方 Discover 的 npm 格式索引与 dsh-market 不完全相同；只在 GitHub 发布的本版不能被描述为已进入 npm Discover 索引。

## 发布回执

实现完成后在此补充实际 GitHub commit、Release、市场 PR 链接与状态。发布尚在进行的文档不是成功回执。
