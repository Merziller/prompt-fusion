## Add Merziller/prompt-fusion

Adds one entry, `data/plugins/Merziller__prompt-fusion.yml`, under UI. Public repository: https://github.com/Merziller/prompt-fusion . Apache-2.0, zero runtime dependencies, complete source and prebuilt GitHub Release tarball. `dsh.bundle`, patch and client module ID match. Topic: `dsh-plugin`.

Updated to **v0.2.0** after actual user feedback: one small inline Enhance button replaces the settings panel. Domain selection and deep guidance are automatic. The same button stops or undoes enhancement. No duplicated voice button, mode selectors or context panel. Results preserve the original input verbatim and add reviewed, subordinate structure and relevant task guidance. Selected-model assistance only selects rule IDs; offline fallback is available. No automatic sending or execution of the embedded task. CLI, stdio MCP and portable Agent Skills share the core.

Validation: 138/138 tests on Windows/Node24.19.0; actual DSH0.2.2-rc.5 local bundle reload and v0.2 model-assisted structured tool call. Endpoints use official connection routes. The actual generated one-button bundle is exercised by a hook/slot contract fixture, including stop, undo, stale edits and reference-chip preservation. Authenticated GUI clicks, DesktopIPC and other agents' native loaders remain NOT_RUN/BLOCKED. Prior v0.1 OS/Node CI matrix passed all six jobs; v0.2 run receipts are reported separately in docs/RELEASE.md. Existing Windows development-link replacement from a remote tarball hit pnpm EPERM and is not claimed as successful.

Source/license audit acknowledges feiwell, ChosenXu and Fishsb as upstream inspiration, not actual contributors. Their required license/notice texts are retained. This is an independent implementation, not a meta-package installing the three plugins.

Repository created **2026-11-25 19:18:43 UTC**. The documented one-day condition first becomes satisfied at **2026-11-26 19:18:43 UTC** (2026-11-27 03:18:43 Asia/Shanghai). No date/history backdating. Submission does not claim acceptance; awaiting catalog checks and maintainer merge.

Only this new catalog entry is changed; generated READMEs and existing entries remain untouched.

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
