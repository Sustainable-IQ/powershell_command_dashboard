# VS Code PowerShell Command Dashboard - Technical Specification

**Author:** Luc
**Date:** October 13, 2025
**Project Level:** L2 (MVP → v1)
**Project Type:** VS Code Extension + Headless Elevated Runner (PowerShell)
**Development Context:** Solo dev → small team; Windows 10/11; PowerShell 5.1 & 7+; offline-friendly, no persistent services.

---

## Source Tree Structure

```
ps-dashboard/
├─ package.json                 # extension manifest deps/scripts
├─ package-lock.json / pnpm-lock.yaml
├─ tsconfig.json
├─ .vscode/
│  ├─ launch.json              # extension & webview debug configs
│  └─ tasks.json
├─ src/                        # extension (Node/TypeScript)
│  ├─ extension.ts             # activate(), register commands, message bus
│  ├─ ipc/
│  │  ├─ runManager.ts         # orchestrates runs (non-elev & elev)
│  │  ├─ processRunner.ts      # child proc spawn for non-elev
│  │  ├─ elevatedRunner.ts     # Start-Process -Verb RunAs + handoff
│  │  └─ resultReader.ts       # incremental parse of JSONL results
│  ├─ catalog/
│  │  ├─ schema.ts             # Zod schema for command manifests
│  │  ├─ loadCatalog.ts        # loads & validates JSON
│  │  └─ packs/                # built-in packs
│  │     ├─ inventory.json
│  │     ├─ networking.json
│  │     ├─ startup.json
│  │     └─ privacy.json
│  ├─ telemetry/
│  │  └─ telemetry.ts          # opt-in, counts only (no command text)
│  └─ util/
│     ├─ paths.ts              # temp dirs, run IDs
│     ├─ shellDetect.ts        # pwsh vs powershell detection
│     └─ quoting.ts            # safe templating/quoting
├─ webview/                    # React UI compiled to web assets
│  ├─ app.tsx                  # root
│  ├─ components/
│  │  ├─ Catalog.tsx           # list w/ categories, search, checkboxes
│  │  ├─ Preview.tsx           # exact commands shown
│  │  ├─ RunToolbar.tsx        # Run / Run Elevated / Copy / DryRun
│  │  ├─ Results.tsx           # table, details drawer
│  │  └─ Settings.tsx
│  ├─ state/
│  │  └─ store.ts              # Zustand or Redux
│  ├─ style.css
│  └─ vite.config.ts
├─ powershell/                 # helper scripts used by elevated runner
│  ├─ run-batch.ps1            # wrapper: run items, capture JSON results
│  └─ lib.ps1                  # shared helpers (serialize, try/catch)
├─ media/                      # icons, banner
├─ out/                        # compiled extension (gitignored)
├─ CHANGELOG.md
├─ SECURITY.md
└─ README.md
```

---

## Technical Approach

**Guiding principles:** least privilege, transparency, debuggability.

1. **Dual Execution Model**

   * **Non‑elevated**: spawn a PowerShell process (pwsh preferred, fallback to Windows PowerShell) and run selected commands; stream stdout/stderr; map exit codes; parse optional JSON records.
   * **Elevated**: when any item requires admin, generate a temp script and launch a separate **elevated** PowerShell via `Start-Process -Verb RunAs`. The elevated process writes **JSONL** (one JSON object per command) + text log to `%TEMP%`. The extension tails/reads results and renders them.

2. **Allowlist Catalog**

   * Commands are declared in signed JSON manifests. No arbitrary free‑form shell from the UI. Parameters are typed and validated.

3. **Structured Results**

   * Each command returns a `RunResult` object with `id, status, startedAt, endedAt, exitCode, message, raw, json`. Serialized as JSONL to support long‑running streams.

4. **Safety & Preview**

   * UI always shows exact text to run. For destructive ops, require confirm (type `CONFIRM`). If supported, add `-WhatIf` toggle.

5. **IPC Simplicity**

   * File‑based handoff (temp script + JSONL results) keeps complexity low and is easy to debug under policy constraints. No persistent services.

---

## Implementation Stack

* **Extension:** TypeScript, VS Code Extension API, Node 18 LTS.
* **Webview UI:** React + Vite, VS Code Webview UI Toolkit, Zustand for state.
* **PowerShell:** PowerShell 7+ recommended; Windows PowerShell 5.1 supported.
* **Validation:** Zod (manifest schema), Ajv optional.
* **Testing:** Vitest/Jest (TS), Playwright (webview), vscode-test (integration). Pester for PowerShell.
* **Build/Release:** `vsce` or `@vscode/vsce` for packaging, GitHub Actions CI, code signing.
* **Lint/Format:** ESLint + Prettier; EditorConfig.

---

## Technical Details

### Command Catalog Schema (Zod/JSON)

```json
{
  "id": "get-process-summary",
  "label": "List Processes (summary)",
  "category": "Inventory",
  "description": "Lists processes with PID, name, company, start time.",
  "commandText": "Get-Process | Select-Object Id,ProcessName,Company,StartTime",
  "requiresAdmin": false,
  "riskLevel": "info",
  "os": ["win10","win11"],
  "shell": ["pwsh","powershell"],
  "params": [
    {"name": "nameFilter", "type": "string", "optional": true}
  ],
  "tags": ["process","diagnostics"]
}
```

* Support either `commandText` (inline) or `scriptPath` (bundled helper) but never both.
* Param templating uses a safe renderer that quotes and escapes values; no direct interpolation from the UI.

### Run Orchestration

* **Non‑Elevated**: `child_process.spawn(shell, ["-NoProfile","-ExecutionPolicy","Bypass","-File", tempScript])`

  * Create `tempScript.ps1` that imports `powershell/lib.ps1` and executes selected items in order.
  * Pipe stdout/stderr; also write JSONL to `results.jsonl` for structure. Render incrementally.
* **Elevated**: `Start-Process -Verb RunAs -FilePath <shell> -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File <tempScript>"`

  * The wrapper (`run-batch.ps1`) iterates items and uses `Invoke-Command` blocks with try/catch to capture `ExitCode`, `ErrorRecord`, timing, and optional object output via `ConvertTo-Json -Depth 6 -Compress`.

### Result Object (per command)

```json
{
  "id":"get-process-summary",
  "status":"success|failed|skipped",
  "exitCode":0,
  "startedAt":"2025-10-13T13:22:04.123Z",
  "endedAt":"2025-10-13T13:22:05.004Z",
  "message":"36 items",
  "raw":"<captured text>",
  "json": { "count": 36 }
}
```

### Elevation Flow

1. Detect admin items; show dialog with summary and exact commands.
2. If user approves, write `batch-<runId>.ps1` and launch RunAs.
3. Elevated process writes `results-<runId>.jsonl` and `log-<runId>.txt` under `%TEMP%\ps-dashboard\<runId>` and exits with aggregate exit code (non‑zero if any failed).
4. Extension watches the folder; as lines appear in JSONL, update the UI.
5. On completion, move artifacts to user‑configured archive directory.

### Shell Detection

* Prefer `pwsh` if present (`Get-Command pwsh`), else `powershell.exe`. Allow override in Settings.

### Security Controls

* No hidden elevation. Always prompt with a human summary of *why* admin is needed.
* All commands are allowlisted and signed in the extension package.
* Parameter templating ensures quoting; reject dangerous characters for known contexts.
* Optional `-WhatIf` routes where supported.
* Telemetry (if enabled) collects only counts (e.g., category used), never command text or output.

### Settings

* `runner.defaultShell` ("pwsh" | "powershell").
* `runner.mode` ("headless" | "terminal").
* `elevation.enabled` (default true).
* `results.archivePath` & retention (days).
* `ui.compactMode`, `ui.highContrast`.
* `telemetry.enabled` (default false).

---

## Development Setup

**Prereqs**

* Node 18 LTS, Git, VS Code, PowerShell 7+ recommended, Windows PowerShell 5.1 available.
* Windows 10/11.

**Install**

```bash
pnpm install   # or npm ci
pnpm build     # builds extension and webview
```

**Debug**

* `F5` → launches Extension Development Host.
* Two launch configs: (1) Extension, (2) Webview (HMR via Vite).
* Use the mock catalog in `src/catalog/packs/*.json`.

**Scripts**

* `pnpm build`, `pnpm watch`, `pnpm test`, `pnpm lint`, `pnpm package`.

---

## Implementation Guide

1. **Scaffold Extension**

   * Create activation command `psDashboard.open`.
   * Webview setup with message channel (postMessage ↔ onDidReceiveMessage).

2. **Catalog & Schema**

   * Implement Zod schema; load built‑in packs; surface validation errors in UI.

3. **UI MVP**

   * Categories, search, multi‑select, preview pane that shows exact text.
   * Run toolbar: Run, Run Elevated (disabled until needed), Dry‑Run, Copy.

4. **Non‑Elevated Runner**

   * Implement `processRunner.ts`: create temp folder, write script, spawn shell, stream output, build `RunResult`s.

5. **Elevated Runner**

   * Implement `run-batch.ps1` + `elevatedRunner.ts` with RunAs handoff, JSONL and text logs, retry + copy fallback.

6. **Results & Export**

   * Results table with filters; details drawer with raw & JSON tabs; export artifacts.

7. **Profiles**

   * Save/load selection + parameter defaults; store in workspace `.vscode/ps-dashboard-profiles.json`.

8. **Hardening**

   * Quoting tests, -WhatIf where supported, confirmations for destructive items, code signing plan.

9. **Docs & Examples**

   * README with screenshots, security model, troubleshooting (UAC, execution policy, corp GPO).

---

## Testing Approach

* **Unit (TS):** catalog schema, quoting/templating, shell detection, result parsing.
* **Unit (PS):** Pester tests for `run-batch.ps1` and `lib.ps1`.
* **Integration:** spawn real `pwsh` on a CI Windows runner; execute a small safe pack; verify JSONL stream.
* **Webview E2E:** Playwright tests for selection → preview → run → results.
* **vscode-test:** activate extension, open dashboard, run mock catalog.
* **Performance:** measure spawn latency; ensure UI stays responsive under long output.
* **Security:** attempt injection via parameters; verify blocking/escaping; confirm elevation prompts appear.

---

## Deployment Strategy

* **Versioning:** SemVer; `0.x` for MVP; `1.0` when elevation & profiles stabilize.
* **Build:** GitHub Actions builds on `main` and tags; artifacts signed; `vsce publish` on release.
* **Channels:** Marketplace stable; optional pre‑release channel.
* **Telemetry:** Off by default; feature‑flagged; docs explain exactly what’s collected.
* **Rollback:** Keep previous `.vsix` artifacts; document manual downgrade.
* **Support:** GitHub Issues templates; SECURITY.md for vuln reports.

---

*This tech spec is for Level 0-2 projects (BMad Method v6). It provides the technical details needed for implementation. Level 3+ projects use the separate architecture workflow for comprehensive technical design.*
