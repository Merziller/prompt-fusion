## Update Merziller/prompt-fusion to 0.5.1

One catalog entry only: `data/plugins/Merziller__prompt-fusion.yml`, category `ui`. Public project: https://github.com/Merziller/prompt-fusion . Product name remains **Prompt Fusion** (Chinese short name: 禾杨灵词). Produced by 禾杨智绘工作室（绍兴市柯桥区禾杨智绘软件开发工作室）, developed by Merziller (子墨).

Copyright 2026 绍兴市柯桥区禾杨智绘软件开发工作室 (禾杨智绘) & Merziller (子墨)

Apache-2.0, zero runtime dependencies, prebuilt pinned release: https://github.com/Merziller/prompt-fusion/releases/download/v0.5.1/prompt-fusion-0.5.1.tgz . Exact package/client identity `@merziller/prompt-fusion`, a `dsh.bundle` patch, localized metadata, original icon and `dsh-plugin` topic are retained.

### What changed

Semantic prompt rewriting with fidelity review and conditional verification, a conservative one-call surface-edit path, explicit network/timeout/provider errors, and the Undo transaction fix. It protects explicit goals and avoids adding unrequested output-format restrictions. DSH has the same single Enhance / Stop / Undo enhancement button; there is no extra brand prefix, settings panel or recording button and no auto-send.

CLI, portable Skills, MCP stdio/stateless Streamable HTTP and REST/OpenAPI share the core. Outside DSH, model access requires explicit `--model` and user-provided environment variables. No host login is borrowed. Project code is free; selected model providers may charge.

### Verification and honest boundaries

`npm run build`, `npm test`, `npm run check` and `node scripts/verify-distribution.mjs` validate the release. A fresh offline archive install repeats the source checks and tests; independent MCP SDK and React 18.2 / Lexical 0.49 fixtures exercise transports and Undo. Retained actual host-tool results are distinct from an authenticated GUI test, which remains NOT_RUN. See `docs/releases/0.5.1.md` and `docs/RELEASE.md` for exact final receipts and CI links.

Earlier four-/five-way evaluation outputs, errors, input and source snapshots remain as historical evidence. Their headline scores are **not** attributed to 0.5.1. Native vendor applications and historical Windows development-link replacement limitations remain disclosed. No universal quality or compatibility guarantee is claimed.

Upstream feiwell, ChosenXu and Fishsb are acknowledged sources, not invented contributors. Their license and NOTICE texts are preserved. Runtime implementation and separately attributed evaluation prompt reuse are distinguished.

Repository creation: 2026-11-25 19:18:43 UTC; the one-day condition is met after 2026-11-26 19:18:43 UTC. This request does not edit generated READMEs or other entries. Submission, maintainer merge and actual client catalog synchronization are separate statuses.

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
