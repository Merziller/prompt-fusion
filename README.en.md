# Prompt Fusion

**One Enhance button. Automatic domain, deep guidance and structured prompts.** By **Merziller**, Apache-2.0, zero runtime dependencies. Enhancement processes the prompt as data and never executes its embedded task.

[中文](README.md) · [Platforms](docs/PLATFORMS.md) · [Sources](docs/SOURCE_AUDIT.md) · [Verification](docs/VERIFICATION.md) · [Release status](docs/RELEASE.md)

## One-click DSH workflow

Write your draft and click **Enhance** beside the input. The result is inserted directly, without sending the message. There are no mode/domain/depth selectors, settings panel or duplicate microphone button. Continue using DSH's own speech input.

The workflow uses automatic domain detection, deep guidance and ordered task/execution/verification/fidelity sections. The original request is retained exactly; task-specific reviewed guidance addresses relevant plugins, UI, APIs, data, plans, research and collaboration without inventing facts or hard requirements. Native reference chips use append-only insertion to retain their positions.

The same button becomes **Stop** during enhancement and **Undo enhancement** afterwards. Typing, sending or switching sessions invalidates stale work. Subsequent edits are not overwritten. No automatic workspace/history access or persistent draft memory is used.

DSH defaults to the selected host model for reviewed-rule selection, with offline fallback. **The model provider may charge for this call**; the project itself is free. Deep structure cannot be silently downgraded by model selection. This is a conservative organizer, not an unrestricted rewriting model or a demonstrated guarantee of improved downstream performance. Chinese and English guidance are supported; other detected scripts retain the original text.

## Install and run

DSH target: 0.2.2-rc.5. Actual release and catalog-review status are in the [release record](docs/RELEASE.md). A submitted PR is not a marketplace listing.

```sh
dsh plugin --profile desktop add https://github.com/Merziller/prompt-fusion/releases/download/v0.2.0/prompt-fusion-0.2.0.tgz
```

Local directory installation/reloading was verified. Replacing an existing Windows development link with a remote tarball encountered EPERM; that native replacement path is not marked passed. Do not manually overwrite profile directories. Refresh the existing DSH page if the old panel remains cached.

Node.js >=22.19.0. No runtime dependency installation is required:

```sh
git clone https://github.com/Merziller/prompt-fusion.git
cd prompt-fusion
node bin/prompt-fusion.mjs enhance "Refactor existing code without changing its API" --intensity deep --layout structured
node bin/prompt-fusion.mjs enhance --json < request.json
node bin/prompt-fusion.mjs mcp
node bin/prompt-fusion.mjs install --target codex --scope project --root /absolute/project --dry-run
node bin/prompt-fusion.mjs config --target codex --out codex-mcp.snippet.toml
```

JSON example: `{"input":"Improve this design brief without inventing testimonials.","domain":"auto","mode":"smart","intensity":"deep","layout":"structured"}`.

CLI/MCP retain advanced controls. Default API `layout:append` preserves the exact prefix; `layout:structured` preserves the exact request inside ordered sections. Results include original/enhanced text, rule IDs, engine, warnings and preservation/reorganization metadata. Repeated enhancement does not stack guidance. Errors use stderr/nonzero exit codes or MCP tool errors.

Portable Skills and necessary configurations target Codex, Claude Code, Antigravity, OpenClaw, OpenCode, pi and Hermes. **Mechanism research, executable fixtures and native host loading are separate statuses.** See the [matrix](docs/PLATFORMS.md). Zcode was excluded with the requester's agreement. Installation does not overwrite Skills or rewrite host settings.

## Models, privacy and limits

Offline core, source, build and tests are free. CLI explicitly enables a configured model with `--model`, `FUSION_BASE_URL`, `FUSION_MODEL` and optional `FUSION_API_KEY`. HTTPS is required except loopback HTTP. Without providers, offline organization remains available.

Explicit context, prior-draft references, dictionaries and separate transcript-cleanup suggestions remain advanced API features, not DSH input controls. No microphone starts in the background. API reference data has an 8KiB budget and common credential-pattern checks, not comprehensive redaction.

Limits: input48KiB UTF-8, output80KiB, model-selection response8KiB, default model timeout30s. Invalid inputs, unknown options, cancellation, timeouts, malformed model plans and stale drafts are handled explicitly. No execution tools are supplied to the model.

## Develop

```sh
npm run build
npm test
npm run check
npm run test:report
npm pack --dry-run
```

The latest local regression run passed 138 tests, including the single control, absent settings/voice widgets, automatic defaults, direct insertion, stop/undo, concurrent edits, reference preservation and structure fidelity. Native/CI evidence and untested environments are documented separately. No independent reviewer is claimed.

Disable/remove the DSH bundle in plugin settings; remove portable Skills only at the recorded installation directory. Remove only the MCP entries you manually added. The CLI is not a background service when stopped.

Inspired by feiwell, ChosenXu and Fishsb. Their runtime source, templates and icons were not copied; original authors are acknowledged rather than listed as actual project contributors. Pinned sources and retained licenses: [third-party notices](THIRD_PARTY_NOTICES.md).

WeChat **Merziller** · QQ **1411574209** · **k26789228@gmail.com**, explicitly confirmed for public project use. [Authors](AUTHORS.md).
