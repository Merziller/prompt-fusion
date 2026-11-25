# Prompt Fusion

An open-source, preservation-first prompt enhancer by **Merziller**, licensed under Apache-2.0. Zero runtime dependencies. Offline and free by default. Enhancement never executes the embedded task.

[中文](README.md) · [Platform matrix](docs/PLATFORMS.md) · [Source audit](docs/SOURCE_AUDIT.md) · [Verification](docs/VERIFICATION.md) · [Release status](docs/RELEASE.md)

The exact original is kept as the output prefix. Reviewed, subordinate guidance is appended; code, paths, numbers, quotes and constraints are never rewritten. Optional model assistance can only select reviewed rule IDs. Free-form answers, invented requirements and malformed selections are rejected with explicit offline fallback. This conservative approach is not a claim of improved performance on every downstream task.

Modes: base, lite, standard, smart, publish. Domains: general, code, design, office, collaboration, research and writing. English and Chinese guidance is available. Other detected scripts use preservation-only behavior rather than automatic translation. Repeated enhancement does not stack guidance.

## Run

Node.js >=22.19.0; no dependency installation required.

```sh
git clone https://github.com/Merziller/prompt-fusion.git
cd prompt-fusion
node bin/prompt-fusion.mjs enhance "Refactor the existing code without changing its public API" --domain code
node bin/prompt-fusion.mjs enhance --json < request.json
node bin/prompt-fusion.mjs mcp
node bin/prompt-fusion.mjs install --target codex --scope project --root /absolute/project --dry-run
node bin/prompt-fusion.mjs config --target codex --out codex-mcp.snippet.toml
```

Input JSON: `{"input":"Improve the existing design brief without inventing testimonials.","domain":"design","mode":"standard"}`. Output includes original/enhanced text, selected rules, engine, warnings and preservation metadata. Voice cleanup is a separate suggestion, never silently applied.

## Integrations

DSH native bundle targets 0.2.2-rc.5: composer preview, explicit apply, guarded undo, optional context and one-draft memory, optional hotkeys and speech transcription through the selected official host service. Applying appends through the native insertion API; place the caret at the draft end. Intervening edits invalidate preview/application. No automatic send or publication.

Portable Skills and/or stdio MCP configurations are supplied for Codex, Claude Code, Antigravity, OpenClaw, OpenCode, pi and Hermes. **Documentation verification, generated configuration tests and native host execution are separate statuses.** See the [matrix](docs/PLATFORMS.md). Unavailable hosts are explicitly not marked tested. Zcode was excluded with the requester's agreement. Installation never overwrites an existing Skill or edits host configuration automatically.

Microphone access is explicit. The selected recognizer and its host-local/cloud location are displayed before recording. Silence stop: 1–5 seconds; recording limit: 120 seconds. Audio stays in request memory in this plugin; cloud recognizers receive it when selected. Physical microphone/provider tests are separately identified. Transcript insertion requires review.

## Optional models and data

Use `--model` with `FUSION_BASE_URL`, `FUSION_MODEL` and optional `FUSION_API_KEY` for an explicitly configured OpenAI-compatible endpoint. HTTPS is required except loopback HTTP. Offline mode performs no model call; external services may charge under their own terms. DSH smart uses the currently selected host model. Context and prior-draft memory are opt-in; no automatic workspace or session scanning. Common credential patterns are rejected in supplied context, but this is not comprehensive secret detection.

Limits: input 48KiB UTF-8, context 8KiB/4 entries, output 80KiB, model selection 8KiB, default timeout 30s. Core provider lists are capped at four with one overall deadline. Invalid input/options, cancellation, timeout, malformed model output and stale drafts have explicit error/warning codes. `fallback:false` makes model failure an error.

## Develop

```sh
npm run build
npm test
npm run check
npm run test:report
npm pack --dry-run
```

The repository includes complete core, CLI, MCP, browser voice implementation, DSH adapters, installer, tests and build scripts. Native-host availability and known limitations are recorded in [verification](docs/VERIFICATION.md). Tests authored and run by the same execution agent are not presented as independent review.

Inspired by the open-source work of feiwell, ChosenXu and Fishsb. Their runtime code, prompt templates and icons were not copied; original authors are acknowledged, not listed as actual project contributors. Exact pinned sources and preserved notices: [third-party notices](THIRD_PARTY_NOTICES.md).

Public contact: WeChat **Merziller**, QQ **1411574209**, email **k26789228@gmail.com**, explicitly confirmed by the requester for this project. See [authors](AUTHORS.md).
