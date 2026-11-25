# Prompt Fusion

**An agent-neutral prompt-rule core and integration layer.** By Merziller, Apache-2.0, zero runtime dependencies. DSH one-button UI, portable Skills, CLI, MCP stdio, MCP Streamable HTTP and REST/OpenAPI share one core. Brand presets are convenience paths, not an allowlist.

**Quality disclosure:** the current core preserves the original request and adds reviewed rules. It is not a semantic rewriter. In the new subjective four-plugin review, released 0.2 scored about61/100, below the other three. Version0.3 expands access and does not claim to fix that defect. See [quality audit](docs/QUALITY_AUDIT.md).

[中文](README.md) · [Universal access](docs/UNIVERSAL_ACCESS.md) · [Platform evidence](docs/PLATFORMS.md) · [Verification](docs/VERIFICATION.md) · [Release status](docs/RELEASE.md) · [Sources and licenses](THIRD_PARTY_NOTICES.md)

## Run and integrate

Node.js >=22.19.0. No runtime dependency installation:

```sh
git clone https://github.com/Merziller/prompt-fusion.git
cd prompt-fusion
node bin/prompt-fusion.mjs enhance "Clarify this existing brief without changing the stack" --intensity deep --layout structured
node bin/prompt-fusion.mjs enhance --json < request.json
node bin/prompt-fusion.mjs mcp
node bin/prompt-fusion.mjs serve --host 127.0.0.1 --port 8765
node bin/prompt-fusion.mjs install --target AnyAgent --skills-dir /absolute/skills --dry-run
node bin/prompt-fusion.mjs config --target generic
node bin/prompt-fusion.mjs config --target http --server-url https://YOUR_HOST/mcp
```

Any host with a compatible Skill, MCP, HTTP or command interface can use the corresponding adapter. Apps exposing only chat input support manual copy, not automatic plugin installation. Future brand labels need no core change when installing standard Skills to an explicit directory.

Kimi and WorkBuddy presets are included. Grok Bot's command connector runs on its cloud computer. The researched Muse project is Zer0Qing/Muse for Android, using remote MCP; its native `.skill.json` is not standard `SKILL.md`. Doubao Work's public plugin help was located but its returned body did not establish a custom transport/config format. **Protocol tests are not native vendor-app tests.** See the matrix for primary sources and qualified statuses.

The HTTP service uses stateless JSON responses at `POST /mcp`, not legacy SSE. REST is `POST /v1/enhance`; OpenAPI3.1 is `GET /openapi.json`. Default binding is loopback. External binding requires an explicit bearer token of at least24 characters; production HTTPS comes from the operator's gateway. No automatic public deployment, TLS server, OAuth implementation or browser CORS frontend is included. A phone/cloud machine's localhost is separate from the developer's desktop.

## DSH

One Enhance button becomes Stop, then Undo enhancement. No mode/domain/depth/context selectors or microphone button; use DSH's own speech input. Results enter the draft without sending it. Native references use append-only insertion; draft revisions, later edits and session switches guard stale writes.

```sh
dsh plugin --profile desktop add https://github.com/Merziller/prompt-fusion/releases/download/v0.3.1/prompt-fusion-0.3.1.tgz
```

Target DSH0.2.2-rc.5. Historical local installation/tool calls succeeded. Replacing an existing Windows development link with a remote tarball encountered EPERM and is not marked passed. Authenticated GUI/DesktopIPC and other native apps have separate untested statuses.

DSH defaults to smart/auto/deep/structured. Its selected model only selects reviewed rules; offline fallback remains available. **The selected model provider may charge.** The project itself is free. No history/workspace/files are automatically collected.

## Behavior and limits

The exact original is retained. `layout:append` is the default API form; `structured` arranges surrounding sections. Preservation/reorganization metadata does not prove semantic rewriting or downstream improvement. Domain regexes can misclassify; the audit documents reproduced cases.

The core never executes the embedded task. Input48KiB UTF-8, output80KiB, model-selection response8KiB, explicit context8KiB. Invalid fields/JSON/UTF-8, cancellation, timeout and malformed model plans have errors/warnings. Chinese/English rules are provided; other detected scripts retain the input. HTTP requests have128KiB and8-concurrent limits. Config generation never embeds tokens or overwrites host files. Receipt/hash-based uninstall retains edited or extra files for review.

CLI model access is explicit through `--model` and `FUSION_BASE_URL`, `FUSION_MODEL`, optional `FUSION_API_KEY`. Offline source/build/tests require no subscription or paid module; self-selected model/hosting services can have external costs.

## Verify

```sh
npm run build
npm test
npm run check
npm run test:report
npm pack --dry-run
node scripts/sdk-smoke.mjs --sdk-root /absolute/node_modules/@modelcontextprotocol/sdk
```

This round has161 local regressions. Official SDK1.32.2 interoperated with stdio, HTTP and bearer HTTP for initialize/list/call/invalid-input. The optional SDK stays outside runtime dependencies. CI/package receipts and native limitations are recorded separately. No independent reviewer or fresh upstream-model/downstream quality trial is claimed.

Disable/remove DSH through its plugin settings. Use `uninstall --skill-dir EXACT_DIRECTORY` for an unmodified portable Skill; review dry-run first. Remove only MCP config entries you added. Stop the explicit `serve` process to stop the service.

Inspired by feiwell, ChosenXu and Fishsb; upstream runtime code/templates/icons were not copied. Authors are acknowledged, not falsely listed as contributors. Original licenses/NOTICE are retained.

WeChat **Merziller** · QQ **1411574209** · **k26789228@gmail.com**, explicitly confirmed for public project use. [Authors](AUTHORS.md).
