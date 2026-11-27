# Prompt Fusion 0.5.2 · 禾杨灵词正式稳定版

禾杨智绘工作室（绍兴市柯桥区禾杨智绘软件开发工作室）出品 · Merziller（子墨）开发。

Copyright 2026 绍兴市柯桥区禾杨智绘软件开发工作室 (禾杨智绘) & Merziller (子墨)

## 本次发行

将已发布的 0.5.2-rc.1 晋升为 **0.5.2 正式稳定版**，作为 GitHub Latest。保留原 RC 和 0.5.1 的标签与附件。相对 RC 的 18 个运行文件仅核心版本字面量变化，没有新增产品行为。

## 包含的修复

- 减少正常中文描述被误当作禁止指令，改善部分“转圈结束但原稿未变”的误拦。
- 增强未成功时直接显示保真、格式、连接、限流、凭证、超时或中断等原因；检查未通过仍保留原稿。
- 修复清空草稿后停止受阻，完善编辑后旧结果防覆盖和过时提示清理。
- 保持一个“增强／停止／撤销增强”按钮，不自动发送，不执行提示词里的任务。
- 失败诊断不包含提供商错误正文或密钥。

## 验证与限制

正式包重新进行完整自动回归、全新离线安装及逐文件比对、官方 MCP SDK 六组和 React/Lexical 验证；具体数字和源码 CI 在发行附件 `verification.json` 中记录。七项真实 DSH 操作检查属于已测开发候选，运行代码与本版仅版本字面量不同，不冒充正式版独立 GUI 重测。

仍保留：窄窗口 Desktop 渲染进程崩溃原因未定，浅色/深色主题覆盖未完成，未重跑完整真实模型质量基准。稳定版标识不表示这些限制已经修复，也不代表所有厂商原生应用均已验证。

## 安装或更新

```sh
dsh plugin --profile desktop add https://github.com/Merziller/prompt-fusion/releases/download/v0.5.2/prompt-fusion-0.5.2.tgz
```

[预构建包](https://github.com/Merziller/prompt-fusion/releases/download/v0.5.2/prompt-fusion-0.5.2.tgz) · [SHA-256 校验](https://github.com/Merziller/prompt-fusion/releases/download/v0.5.2/SHA256SUMS.txt) · [验证记录](https://github.com/Merziller/prompt-fusion/releases/download/v0.5.2/verification.json)

需要回退可安装保留的 [0.5.1](https://github.com/Merziller/prompt-fusion/releases/tag/v0.5.1)。项目代码开源免费（Apache-2.0），所选模型服务可能计费。GitHub 发行与插件市场收录分别核验。

详细范围：[0.5.2 发行验证](releases/0.5.2.md)。
