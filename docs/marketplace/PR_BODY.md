## Update Merziller/prompt-fusion to 0.5.2-rc.1 (prerelease)

This submission changes only `data/plugins/Merziller__prompt-fusion.yml`, category `ui`. Public repository: https://github.com/Merziller/prompt-fusion . Product: Prompt Fusion / 禾杨灵词. Produced by 禾杨智绘工作室（绍兴市柯桥区禾杨智绘软件开发工作室）, developed by Merziller (子墨).

Copyright 2026 绍兴市柯桥区禾杨智绘软件开发工作室 (禾杨智绘) & Merziller (子墨)

Apache-2.0; no runtime dependencies or install hooks; real `dsh.bundle` declaration; localized metadata; original icon; `dsh-plugin` topic. Pinned prebuilt archive: https://github.com/Merziller/prompt-fusion/releases/download/v0.5.2-rc.1/prompt-fusion-0.5.2-rc.1.tgz . **This is an opt-in RC, not a stable release. 0.5.1 remains available as stable.**

### Actual changes

- Fix several Chinese descriptive-phrase/ordinary-word false positives while retaining real prohibition checks.
- Show visible, bounded failure reasons rather than only stopping the spinner.
- Allow Stop after the draft is cleared; clear stale notices after editing; retain Undo and revision-checked draft updates.
- Preserve the single Enhance / Stop / Undo button and shared CLI, Skills, MCP and REST core. No automatic task execution or sending. Explicit model configuration outside DSH; model services may charge.

### Evidence and limitations

The development candidate passed seven actual DSH interaction checks, and RC runtime bytes match it except for the core version literal. RC archive installation, full tests and integrity verification are separate from those candidate observations. The six official MCP SDK combinations and React/Lexical fixture are not a claim that all native vendors were tested. See https://github.com/Merziller/prompt-fusion/blob/main/docs/releases/0.5.2-rc.1.md .

A narrow-window test encountered a Desktop renderer crash of unknown cause; theme coverage is incomplete. Hence the prerelease label. No new model-quality benchmark or universal success guarantee is claimed. Historical failures and the original 0.5.1 fixture remain preserved.

feiwell, ChosenXu and Fishsb are credited upstream sources, not invented contributors. Their copyright/license/NOTICE files and the distinction between independent runtime implementation and evaluation prompt reuse remain intact.

The repository is more than one day old. Only this project's entry is changed; generated READMEs and other entries are untouched. Submission, maintainer acceptance and downstream storefront synchronization are separate outcomes.

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
