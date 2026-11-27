# Prompt Fusion

**Turn a rough draft into a usable prompt without performing its task.** Produced by 禾杨智绘工作室, developed by Merziller. Apache-2.0, zero runtime dependencies. One semantic core serves the DSH button, portable Skills, CLI, MCP stdio, MCP Streamable HTTP and REST/OpenAPI.

> **Current release: 0.5.1.** Explicit-goal and downstream-format guards plus the v0.2.0 Undo state-loss fix. Runtime behavior matches the tested 0.5.1-dev snapshot; only the version literal and distribution metadata change. Eight actual host-tool responses are retained and checked. Authenticated DSH GUI end-to-end remains untested, and earlier five-way scores are not claimed as this version's score. See [release verification](docs/releases/0.5.1.md) and the [historical fix report](docs/FIXES_0.5.1.md).
>
> The historical local 0.4.0 baseline scored 99.79/99.13 on its 24 fixed/transfer cases, with a 99.46 overall mean, a 95 minimum and no critical errors. Those are not this candidate's scores or a universal guarantee. Historical publication facts remain in the [release receipts](docs/RELEASE.md).

> **New version: 0.5.2-rc.1 (prerelease; 0.5.1 remains stable).** Addresses several Chinese descriptive-phrase false positives, hard-to-see failure feedback, and stopping after clearing the draft. Its development candidate passed seven actual DSH interaction checks; RC runtime files match that candidate exactly except for the core version literal. A narrow-window test encountered a Desktop renderer crash of undetermined cause, and theme coverage remains incomplete, so this is not promoted to stable. See the [scope and verification](docs/releases/0.5.2-rc.1.md) and [prerelease page](https://github.com/Merziller/prompt-fusion/releases/tag/v0.5.2-rc.1).
>
> Opt in to the RC: `dsh plugin --profile desktop add https://github.com/Merziller/prompt-fusion/releases/download/v0.5.2-rc.1/prompt-fusion-0.5.2-rc.1.tgz`. The commands below still select stable. Marketplace submission and acceptance are separate statuses.

[中文](README.md) · [Universal access](docs/UNIVERSAL_ACCESS.md) · [Platform evidence](docs/PLATFORMS.md) · [Specification](docs/SPEC.md) · [Verification](docs/VERIFICATION.md) · [Sources and licenses](THIRD_PARTY_NOTICES.md)

## What changed

- Rewrite the actual request, order its requirements and add only relevant missing detail—not a copied original wrapped in generic headings.
- Keep goals, language, facts, exact literals, negative constraints, uncertainty and task stage. Deep does not mean long. An already clear draft may remain unchanged.
- Separate rewriting from fidelity review. A corrected review is verified again; numeric, code, path and conversational-gate checks also run.
- Preserve the original on missing models, timeout or failed validation, with an explicit warning. Cancel and undo do not send the task.
- Expose the same model pipeline through every adapter, rather than implementing semantic enhancement only behind the DSH button.

These are safeguards, not a proof of semantic equivalence. Models and checks can miss errors. Quality is measured using the [frozen evaluation protocol](docs/evaluation/OPTIMIZATION_PROTOCOL.md), retaining unsuccessful rounds.

## DSH: still one button

**Enhance → Stop → Undo enhancement.** No mode/domain/depth/context selectors or extra microphone button. DSH's own voice input remains unchanged.

Only the current draft is sent to the selected host model, whose identity is pinned for the whole operation. There is no automatic history, workspace or credential collection. Plain text uses the native revision-checked replacement; atomic references use exact-prefix append. Later edits, session switches and sending invalidate stale results.

The project is free; **your model provider may charge**. An eligible surface edit can use one call only after deterministic equivalence checks pass. Complex prompts normally use two calls; verification and bounded JSON-contract retries can add calls. `audit.modelCalls` and `audit.route` record the actual work, not a billing estimate.

Install the prebuilt release archive; no build hook or npm account is needed:

```sh
dsh plugin --profile desktop add https://github.com/Merziller/prompt-fusion/releases/download/v0.5.1/prompt-fusion-0.5.1.tgz
# Or download the archive and install in a Node project offline
npm install --offline --ignore-scripts /absolute/path/prompt-fusion-0.5.1.tgz
```

Replacing a profile's existing development-directory link may require restarting DSH. Trust the plugin manager's application result; the historical EPERM update failure is retained rather than claimed as a successful in-place upgrade.

Use DSH's plugin manager to select the local project directory for development. Target: DSH 0.2.2-rc.5. Native service, GUI, IPC and packaged-install results are recorded separately; marketplace submission is not the same as listing.

## CLI and explicit model access

Node.js ≥22.19.0. No runtime package installation required:

```sh
git clone https://github.com/Merziller/prompt-fusion.git
cd prompt-fusion
node bin/prompt-fusion.mjs --help
```

Configure your own OpenAI-compatible Chat Completions endpoint using `FUSION_BASE_URL`, `FUSION_MODEL` and optional `FUSION_API_KEY`. Standalone adapters only read them when `--model` is explicit.

```sh
node bin/prompt-fusion.mjs enhance --model "Clarify this existing brief without changing the stack or writing code."
node bin/prompt-fusion.mjs enhance --model --file prompt.txt
node bin/prompt-fusion.mjs enhance --model --json < request.json
# No model: unchanged draft plus MODEL_REQUIRED warning, not a claimed enhancement
node bin/prompt-fusion.mjs enhance "A rough idea"
# Explicit legacy offline rules; outside the new semantic quality claim
node bin/prompt-fusion.mjs enhance "A rough idea" --mode standard --layout append
```

```json
{"input":"Organize customer follow-up for a one-person company; do not send messages.","mode":"smart","domain":"auto","intensity":"deep","layout":"structured","fallback":true}
```

## Agent-neutral adapters

| Host capability | Entry |
| --- | --- |
| Standard Agent Skills + Node | Self-contained `SKILL.md` in the host's documented directory |
| Command MCP | `node /absolute/path/bin/prompt-fusion.mjs mcp --model` |
| MCP Streamable HTTP | `serve --model`, then `/mcp`; stateless JSON responses |
| HTTP/OpenAPI tools | `POST /v1/enhance`, `GET /openapi.json` |
| Shell tools | CLI stdin, JSON or file |
| Plain chat only | Manual copy, not native plugin installation |

```sh
node bin/prompt-fusion.mjs install --target AnyAgent --skills-dir /absolute/host-skills --dry-run
node bin/prompt-fusion.mjs install --target AnyAgent --skills-dir /absolute/host-skills
node bin/prompt-fusion.mjs config --target generic --model
node bin/prompt-fusion.mjs serve --host 127.0.0.1 --port 8765 --model
node bin/prompt-fusion.mjs config --target http --server-url https://YOUR_HOST/mcp
```

Presets are conveniences, not a brand allowlist. Codex, Claude Code, Antigravity, OpenClaw, OpenCode, pi, Hermes, Kimi Code CLI and WorkBuddy use their documented paths or config shapes. Grok Bot, the researched Muse project and future hosts can use a matching neutral interface. **Protocol and fixture tests do not establish native compatibility for every vendor application.** See [the matrix](docs/PLATFORMS.md).

External binding requires an explicit token. Provide your own HTTPS gateway, reachable network and secret storage. No automatic public deployment, TLS/OAuth server, legacy HTTP+SSE or browser CORS frontend is included. A phone's or cloud machine's localhost is not your desktop.

## Results and limits

- Defaults: `smart/deep/structured/auto`. `engine:model-rewrite` identifies the model pipeline; a valid review may retain clear wording. `engine:unchanged` with warnings identifies missing models or an unsuccessful enhancement.
- `audit` records calls, stages and checks, not a quality score. `originalPreserved` is only an exact-substring property; `reorganized` is only a change flag. Neither proves fidelity.
- Prompt content is data. The core has no tools for executing code, shell commands, messages or publication.
- Input48KiB, output80KiB, each explicit context8KiB, strict JSON/UTF-8/options, bounded concurrency and cancellation. A failed check does not silently truncate or overwrite the draft.
- One JSON correction retry per stage shares the total deadline. Mechanical literal checks and model review have false positives/negatives; no universal semantic guarantee is claimed.
- Context and previous drafts are explicit opt-ins. No telemetry or implicit long-term memory. Credential-pattern checks are not a complete redaction system.

## Verify and reproduce

```sh
npm run build
npm test
npm run check
npm run test:report
npm pack --dry-run
node scripts/sdk-smoke.mjs --sdk-root /absolute/node_modules/@modelcontextprotocol/sdk
node scripts/score-evaluation.mjs evals/semantic-rounds/semantic-round-03
```

Historical 0.4.0 quality scores and current release engineering evidence are distinct. Twelve historical and twelve transfer inputs were tested with four candidates and two anonymous reversed orders. Both set means must reach95, every case90, with zero critical errors. Round 10 overall means: feiwell **94.63**, ChosenXu **96.65**, Fishsb **97.75**, Prompt Fusion **99.46**. All ten rounds, outages and failed attempts remain visible in the [recorded report](docs/evaluation/RESULTS.md). Unequal model budgets and repeated tuning on the same benchmark limit generalization; this is not a universal superiority claim. The older approximately61 author review uses a different scale and remains as [history](docs/QUALITY_AUDIT.md).

## Uninstall, licensing and contact

Disable/remove DSH through its plugin settings. Preview Skill removal with `uninstall --skill-dir EXACT_DIRECTORY --dry-run`; receipts and hashes protect edited user files. Remove only MCP entries you added. Stop the foreground `serve` process to stop its service.

Runtime implementation is independent, inspired by feiwell, ChosenXu and Fishsb. Separate evaluation records reproduce attributed upstream prompts under their retained licenses. Acknowledgment does not invent contributor status or endorsement. [Third-party notices](THIRD_PARTY_NOTICES.md).

### Production and attribution

The product name remains **Prompt Fusion**. Its short Chinese name is **禾杨灵词**.

Produced by **禾杨智绘工作室（绍兴市柯桥区禾杨智绘软件开发工作室）**; developed and maintained by **Merziller (子墨)**.

禾杨智绘工作室（绍兴市柯桥区禾杨智绘软件开发工作室）出品 · Merziller 开发

Copyright 2026 绍兴市柯桥区禾杨智绘软件开发工作室 (禾杨智绘) & Merziller (子墨)

These attribution notices do not modify Apache-2.0 or upstream ownership. See [authors and public contacts](AUTHORS.md), [NOTICE](NOTICE) and the [license](LICENSE).

WeChat **Merziller** · QQ **1411574209** · **k26789228@gmail.com**, explicitly confirmed for public project use.
