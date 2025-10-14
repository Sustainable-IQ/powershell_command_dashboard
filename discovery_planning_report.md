Discovery & Planning Report
VS Code PowerShell Command Dashboard
1. Document Inventory
Found:
prd.md — Product Requirements Document (Oct 13, 2025)
tech_spec.md — Technical Specification (Oct 13, 2025)
epics.md — Epic Breakdown (Oct 13, 2025)
UX_tech_spec.md — UX/UI Specification (Oct 13, 2025)
dashboard_features.md — Dashboard Features Deep Dive
Missing:
README.md
CONTRIBUTING.md
SECURITY.md
CHANGELOG.md
2. Project Understanding
Mission: A VS Code extension providing a transparent, auditable dashboard for running curated PowerShell commands in batches. Targets Windows 10/11 power users and engineers executing diagnostic, privacy, and hygiene tasks with least-privilege defaults. Primary Users: Power users, systems builders, developers/analysts who need repeatable PowerShell workflows without ad-hoc terminal scripting. Key Features: Multi-select command catalog with preview; dual execution model (non-elevated headless runner + elevated UAC process); JSONL streaming results; post-run verification checks; profiles/packs for reuse; export/history for audit. Execution Model:
Non-elevated: spawn headless PowerShell child process, stream stdout/stderr, capture JSONL per-command results
Elevated: Start-Process -Verb RunAs with temp script handoff; results written to temp JSON/log files; extension reads and renders
Verification: "Verify After Run" toggle executes post-checks (e.g., verify service stopped, firewall rule exists) with visual pass/fail indicators. Success Metrics: 90% non-admin runs complete <3s overhead; <1% tool-attributable failures; >80% users complete elevated batch in week 1. Non-Functional Constraints: No silent elevation; no PII/command text in telemetry (off by default); code-signed; works under execution policy via -ExecutionPolicy Bypass for temp scripts; keyboard-first A11y (WCAG 2.1 AA).
3. Assumptions & Open Questions
Assumptions:
PowerShell 7+ preferred; Windows PowerShell 5.1 compatibility required
UAC enabled; GPO may block elevation → copy fallback path critical
No remote orchestration (single machine only)
Commands are allowlisted; no arbitrary script execution from UI
File-based IPC (temp scripts/JSONL) sufficient; no persistent services
Extension runs in VS Code ≥1.85 on Windows 10/11 only (MVP)
CI will run on Windows GitHub runners with signing step
Initial catalog ~40–50 commands across 5 categories
Telemetry opt-in; when enabled, only anonymized counts (no command text/output)
Questions:
Blocking:
Code Signing: Which certificate authority/signing identity will be used for VSIX and PowerShell scripts? Timeline for procurement?
Temp File Security: Should temp scripts/results under %TEMP% be ACL'd to current user only, or rely on default %TEMP% permissions?
Non-Blocking: 3. Marketplace Publisher: What publisher ID will be used for Visual Studio Marketplace? 4. Initial Pack Scope: Are the ~40 commands in dashboard_features.md:76-136 approved for MVP, or should subset be prioritized? 5. Telemetry Backend: If telemetry is enabled, where do anonymized counts get sent? (Can defer to v1.1) 6. Custom Packs Merge: When user provides custom pack path, does it replace or extend built-in packs?
4. Work Plan & TODOs (Prioritized)
Epic E1 — Command Catalog & Packs
Goals / AC:
JSON schema enforced at load (Zod); invalid manifests fail with actionable errors
≥40 commands shipped for MVP across 5 categories
Each command declares requiresAdmin, riskLevel, shell, os, params, optional verifyAfterRun
Catalog load time <100ms
Tasks:
[MVP] Define Zod schema for command manifest (tech_spec.md:107-125)
[MVP] Implement catalog/schema.ts with types and validation
[MVP] Implement catalog/loadCatalog.ts to discover and merge built-in + custom packs
[MVP] Create built-in pack JSONs (inventory, networking, startup, privacy) with ~10 commands each
[MVP] Write unit tests for schema validation (invalid JSON, missing required fields, type mismatches)
[v1] Add parameter templating with safe quoting in util/quoting.ts
[v1] Extend schema for verifyAfterRun check definitions
[v1.1] CLI tool to validate pack files offline (pnpm validate-packs)
Deliverables:
src/catalog/schema.ts
src/catalog/loadCatalog.ts
src/catalog/packs/*.json (inventory, networking, startup, privacy)
src/util/quoting.ts
Test suite: tests/catalog.test.ts
Dependencies / Risks:
No blockers for MVP
Risk: Command output inconsistency → prefer Select-Object and ConvertTo-Json where feasible
Mitigation: Document output expectations in pack schema
Epic E2 — Webview UI
Goals / AC:
Three-pane layout: category rail + command list + preview pane
Search/filter, multi-select, admin badges, risk labels
Preview shows exact concatenated command text
Keyboard navigation (tab order, focus trap in dialogs, / search shortcut)
Initial render <300ms; search <50ms for 200 items
Tasks:
[MVP] Scaffold React app with Vite (tech_spec.md:42-53)
[MVP] Install VS Code Webview UI Toolkit, configure theme tokens
[MVP] Build Catalog.tsx component: category list, command cards with checkboxes
[MVP] Build Preview.tsx component: read-only code block showing exact commands
[MVP] Build RunToolbar.tsx: Run / Copy buttons; disable Run Elevated until admin item selected
[MVP] Implement Zustand store for selection state
[MVP] Message bus (webview ↔ extension) for catalog load, selection sync, run trigger
[v1] Build Results.tsx: table with status/duration/message; details drawer
[v1] Build ElevationDialog.tsx: list admin items, rationale, confirm input for destructive
[v1] Add search bar (debounced, Ctrl+/ focus shortcut)
[v1] Add filters: risk, privilege, output type
[v1.1] Build Settings.tsx panel
[v1.1] Build ProfilesManager.tsx
[v1.1] A11y audit: keyboard nav, ARIA labels, focus management, contrast checks
Deliverables:
webview/app.tsx (root)
webview/components/Catalog.tsx, Preview.tsx, RunToolbar.tsx, Results.tsx, ElevationDialog.tsx, Settings.tsx
webview/state/store.ts
webview/style.css
webview/vite.config.ts
Dependencies / Risks:
Depends on: E1 (catalog schema)
Risk: Webview state loss on reload → persist selection in extension state or window.localStorage analog
Mitigation: Sync selection to extension on every change; restore on webview rehydration
Epic E3 — Non-Elevated Runner
Goals / AC:
Spawn headless PowerShell child process (pwsh preferred, fallback to powershell.exe)
Execute batch script with -NoProfile -ExecutionPolicy Bypass
Stream stdout/stderr; emit JSONL per-command results
Per-command timing, exitCode, status (success/failed/skipped)
Spawn overhead <300ms; memory stable during long runs
Tasks:
[MVP] Implement util/shellDetect.ts: detect pwsh vs powershell, allow settings override
[MVP] Implement util/paths.ts: generate temp dirs, run IDs, artifact paths
[MVP] Implement ipc/processRunner.ts: spawn child process, capture stdout/stderr, parse JSONL
[MVP] Implement ipc/resultReader.ts: incremental JSONL parser (handle partial lines)
[MVP] Create PowerShell wrapper powershell/lib.ps1: helpers for structured output, try/catch
[MVP] Create powershell/run-batch.ps1: iterate commands, invoke, serialize results to JSONL
[MVP] Implement ipc/runManager.ts: orchestrate run (select runner, handle cancellation)
[MVP] Add cancellation support (terminate child process on user cancel)
[MVP] Unit tests: shell detection, JSONL parsing, quoting/templating
[v1] Integration test: spawn real pwsh, execute safe pack, verify JSONL output
Deliverables:
src/ipc/runManager.ts
src/ipc/processRunner.ts
src/ipc/resultReader.ts
src/util/shellDetect.ts
src/util/paths.ts
powershell/run-batch.ps1
powershell/lib.ps1
Test suite: tests/processRunner.test.ts, tests/powershell/run-batch.Tests.ps1 (Pester)
Dependencies / Risks:
Depends on: E1 (catalog schema), E2 (message bus)
Risk: Execution policy blocks temp scripts → use -ExecutionPolicy Bypass per tech_spec.md:132
Risk: Long-running commands freeze UI → use headless spawn, incremental JSONL rendering
Mitigation: Document that -ExecutionPolicy Bypass is used; advise signing scripts for v1.1
Epic E4 — Elevated Runner & IPC
Goals / AC:
Detect admin-required commands; show elevation dialog with summary
Launch elevated PowerShell via Start-Process -Verb RunAs
Elevated process writes results to temp JSON/log files
Extension tails/reads results; updates UI within 1s of first record
≥95% elevated launches succeed on vanilla Win11
Retry and copy fallback paths for UAC denials
Tasks:
[v1] Implement ipc/elevatedRunner.ts: generate temp script, invoke RunAs, poll for result files
[v1] Extend powershell/run-batch.ps1 to support elevated mode (write JSONL to known path, exit with aggregate code)
[v1] Implement file watcher for incremental result reading (tail JSONL as lines appear)
[v1] Build elevation dialog UI (list admin items, show rationale, confirm for destructive)
[v1] Implement retry logic (relaunch RunAs on transient failure)
[v1] Implement copy fallback: one-click copy admin commands to clipboard
[v1] Add verbose logging: spawned command line, temp script path, exit codes
[v1] Handle GPO/UAC denial: banner with actionable recovery options
[v1] Integration test: mock UAC approval (or skip on CI); verify JSONL returned
[v1.1] Add security ACLs on temp script/result files (restrict to current user)
Deliverables:
src/ipc/elevatedRunner.ts
Updated powershell/run-batch.ps1 (elevated mode)
Elevation dialog component
Test suite: tests/elevatedRunner.test.ts
Dependencies / Risks:
Depends on: E3 (runner infra, JSONL parsing)
Risk: GPO blocks RunAs → copy fallback is critical path
Risk: Temp files readable by other users → ACL them in v1.1
Risk: UAC prompt hidden behind VS Code → user education in docs
Mitigation: Clear error messages; troubleshooting guide for GPO blocks
Epic E5 — Results, Logs, Export
Goals / AC:
Results table: status, command label, duration, message (sortable/filterable)
Details drawer: tabs for Summary / Raw / JSON
Export run report (JSON + text)
Run history persists across sessions with retention policy
Export completes <1s for 1MB output
Tasks:
[v1] Implement Results.tsx component: table with status chips, sortable columns
[v1] Implement details drawer with raw output and parsed JSON tabs
[v1] Add filter controls: show only failed, show only admin, show only completed
[v1] Implement export function: serialize run metadata + artifacts to JSON/text
[v1] Implement local history storage (extension globalState or workspace storage)
[v1] Add retention policy (auto-delete runs older than N days, configurable)
[v1] Add "Open artifacts folder" button
[v1] Add "Retry failed" action (reselect failed items)
[v1.1] Add CSV export option
[v1.1] Add "Attach external log" feature for manual elevation fallback
Deliverables:
Updated webview/components/Results.tsx
Export logic in extension
History manager module
Test suite: export format validation
Dependencies / Risks:
Depends on: E3/E4 (run results available)
Risk: Large raw outputs → truncate with link to artifact file
Mitigation: Truncate display at 10k lines; always write full output to artifact file
Epic E6 — Profiles (Save/Load)
Goals / AC:
Save current selection + parameter values as named profile
Load profile: restore selection and params
Profiles stored in workspace .vscode/ps-dashboard-profiles.json
Load profile <150ms
Handle catalog drift gracefully (skip missing commands, warn user)
Tasks:
[v1] Define profile schema (name, commandIds, params, metadata)
[v1] Implement save profile: serialize selection + params
[v1] Implement load profile: reapply selection, populate params
[v1] Build ProfilesManager UI: list, create, edit, delete, run
[v1] Implement "Run profile" one-click action
[v1] Handle drift: if command ID not found, skip and log warning
[v1] Ship 3 built-in profiles: "Privacy Sweep", "Networking Triage", "Startup Audit"
[v1.1] Add profile versioning/migration for catalog changes
[v1.1] Add profile export/import for team sharing
Deliverables:
Profile schema and manager module
webview/components/ProfilesManager.tsx
Built-in profiles JSON
Test suite: profile save/load, drift handling
Dependencies / Risks:
Depends on: E1 (catalog), E2 (selection state)
Risk: Catalog changes break profiles → migration notes, version field
Mitigation: Graceful skip + warning; document profile schema stability
Epic E7 — Security & Policy Hardening
Goals / AC:
Parameter validation and quoting (no SQL/command injection)
Destructive commands require typing "CONFIRM"
-WhatIf toggle where supported
Telemetry off by default; if enabled, no PII/command text
Code signing pipeline documented and used for releases
0 high-severity findings in pre-release review
Tasks:
[v1.1] Implement parameter validation: reject dangerous chars, enforce types
[v1.1] Implement safe quoting in util/quoting.ts (escape single quotes, backticks)
[v1.1] Add "type CONFIRM" guard for destructive commands
[v1.1] Add -WhatIf toggle in preview/run toolbar (for supported commands)
[v1.1] Implement telemetry module: counts only, no command text, opt-in
[v1.1] Document signing process: certificate, signtool, vsce package signing
[v1.1] Add PowerShell script signing (Authenticode) for run-batch.ps1 and lib.ps1
[v1.1] Security audit: test parameter injection, verify ACLs on temp files
[v1.1] Write SECURITY.md: vuln reporting, responsible disclosure
[v1.1] Unit tests: quoting edge cases, parameter rejection
Deliverables:
src/util/quoting.ts (safe templating)
src/telemetry/telemetry.ts (opt-in, counts only)
SECURITY.md
Signing documentation
Test suite: tests/quoting.test.ts, tests/security.test.ts
Dependencies / Risks:
Depends on: all prior epics (hardening existing features)
Risk: Over-strict validation blocks legit params → allow overrides with warnings
Risk: Certificate procurement delays → defer signing to post-MVP if needed
Mitigation: Test against real-world params; document unsafe override escape hatch
Epic E8 — Settings & Extensibility
Goals / AC:
Configure shell (pwsh vs powershell), execution mode (headless vs terminal)
Configure retention policy, export location, auto-open results
Telemetry toggle
Allow custom pack paths (user-provided JSON files)
Settings sync with VS Code; validation errors surfaced inline
Settings read <50ms
Tasks:
[v1.1] Define settings schema in package.json contributes.configuration
[v1.1] Build Settings.tsx UI panel
[v1.1] Implement settings read/write via VS Code workspace config
[v1.1] Add shell selection dropdown (detect available shells)
[v1.1] Add custom pack path setting with file picker
[v1.1] Implement pack merge logic: built-in + custom packs
[v1.1] Add retention policy setting (days)
[v1.1] Add telemetry toggle with explainer text
[v1.1] Validate custom pack on load; surface errors in UI
[v1.1] Unit tests: settings validation, pack merge precedence
Deliverables:
Settings definitions in package.json
webview/components/Settings.tsx
Settings module in extension
Test suite: tests/settings.test.ts
Dependencies / Risks:
Depends on: E1 (catalog load), E7 (telemetry)
Risk: Ambiguous precedence (built-in vs custom) → document merge strategy clearly
Mitigation: Last-wins for command ID; warn on duplicates
Epic E9 — QA, Docs, Marketplace
Goals / AC:
Test matrix: Win10/11, PowerShell 5.1/7+
Playwright + vscode-test suites pass in CI
Pester tests for PowerShell scripts
Signed VSIX artifact
Marketplace listing with screenshots, security model, troubleshooting
100% passing CI; ≤1 critical issue after first release
Tasks:
[v1.1] Set up GitHub Actions CI: Windows runners, install pwsh, run tests
[v1.1] Write Playwright E2E tests: selection → preview → run → results
[v1.1] Write vscode-test integration: activate extension, open dashboard, run mock catalog
[v1.1] Write Pester tests for run-batch.ps1 and lib.ps1
[v1.1] Add performance benchmarks: spawn latency, UI render time
[v1.1] Write README.md: quickstart, feature list, screenshots, security model
[v1.1] Write CONTRIBUTING.md: dev setup, testing, PR guidelines
[v1.1] Write CHANGELOG.md: SemVer, release notes template
[v1.1] Create marketplace assets: icon, banner, screenshots
[v1.1] Write troubleshooting guide: UAC blocks, execution policy, GPO
[v1.1] Publish to Marketplace with vsce publish
[v1.1] Set up issue templates in GitHub repo
Deliverables:
.github/workflows/ci.yml
tests/e2e/*.spec.ts (Playwright)
tests/integration/*.test.ts (vscode-test)
tests/powershell/*.Tests.ps1 (Pester)
README.md, CONTRIBUTING.md, CHANGELOG.md, SECURITY.md
Marketplace listing
Signed .vsix artifact
Dependencies / Risks:
Depends on: all prior epics (testing everything)
Risk: Flaky Windows CI → pin runner versions, retry flaky tests
Risk: Signing cert not ready → defer signing to post-MVP, publish unsigned pre-release
Mitigation: Use stable runner images; document known CI quirks
5. Critical Path & Milestones
Critical Path:
E1 (Catalog/Schema) → E2 (UI/Webview) → E3 (Non-Elevated Runner) → E4 (Elevated Runner) → E5 (Results/Export) → E6 (Profiles) → E7 (Security Hardening) → E8 (Settings) → E9 (QA/Docs/Release)
Milestones:
MVP (Weeks 1–4):
Exit Criteria: E1, E2, E3 complete; ≥40 commands in catalog; non-elevated runs succeed; basic UI functional; can select, preview, run, see results.
Deliverables: Functional extension (unsigned) for local install; no elevation support yet.
v1 (Weeks 5–8):
Exit Criteria: E4, E5, E6 complete; elevated runs work with UAC prompt; results table with export; profiles save/load; 3 built-in profiles shipped.
Deliverables: Feature-complete extension (unsigned); ready for internal testing.
v1.1 (Weeks 9–10):
Exit Criteria: E7, E8, E9 complete; signed VSIX; CI passing; docs complete; marketplace listing live; telemetry opt-in; settings panel; security audit passed.
Deliverables: Public release on VS Code Marketplace; README, CONTRIBUTING, SECURITY docs; GitHub issue templates.
6. Test Strategy
Unit Tests (TypeScript/Vitest):
Catalog schema validation (Zod): invalid JSON, missing fields, type mismatches
Quoting/templating: inject attempts, safe escaping, edge cases (quotes, backticks)
Shell detection: pwsh available, fallback to powershell
JSONL parsing: incremental reads, partial lines, malformed records
Settings validation: merge precedence, invalid custom pack paths
Unit Tests (PowerShell/Pester):
run-batch.ps1: iterate commands, handle try/catch, emit JSONL
lib.ps1: serialization helpers, safe invoke wrappers
Integration Tests (vscode-test + real PowerShell):
Activate extension, open dashboard, load catalog
Spawn real pwsh process, execute safe pack (non-admin), verify JSONL output
Simulate UAC approval (mock or skip on CI), verify elevated results returned
Test cancellation: terminate child process mid-run
Webview E2E (Playwright):
Select commands via checkboxes → verify preview pane updates
Click Run → verify results table appears with status chips
Filter results (show only failed) → verify table updates
Export results → verify JSON/text files created
Accessibility:
Keyboard navigation: tab through all controls, activate Run button via Enter
Screen reader: verify ARIA labels, live regions for status updates
High contrast: verify token usage, 4.5:1 contrast ratios
Performance:
Catalog load: <100ms for 200 commands
Spawn non-elevated runner: <300ms overhead
Webview initial render: <300ms
Export 1MB output: <1s
Security:
Attempt parameter injection via UI (quotes, semicolons, backticks) → verify blocking/escaping
Verify elevation prompt appears for admin commands (no silent elevation)
Confirm telemetry off by default; when enabled, no command text collected
Verify temp files are ACL'd to current user (v1.1)
7. Ready-to-Create Files & Folders
ps-dashboard/
├─ package.json
├─ package-lock.json (or pnpm-lock.yaml)
├─ tsconfig.json
├─ .vscode/
│  ├─ launch.json
│  └─ tasks.json
├─ .github/
│  └─ workflows/
│     └─ ci.yml
├─ src/
│  ├─ extension.ts
│  ├─ ipc/
│  │  ├─ runManager.ts
│  │  ├─ processRunner.ts
│  │  ├─ elevatedRunner.ts
│  │  └─ resultReader.ts
│  ├─ catalog/
│  │  ├─ schema.ts
│  │  ├─ loadCatalog.ts
│  │  └─ packs/
│  │     ├─ inventory.json
│  │     ├─ networking.json
│  │     ├─ startup.json
│  │     └─ privacy.json
│  ├─ telemetry/
│  │  └─ telemetry.ts
│  └─ util/
│     ├─ paths.ts
│     ├─ shellDetect.ts
│     └─ quoting.ts
├─ webview/
│  ├─ app.tsx
│  ├─ components/
│  │  ├─ Catalog.tsx
│  │  ├─ Preview.tsx
│  │  ├─ RunToolbar.tsx
│  │  ├─ Results.tsx
│  │  ├─ ElevationDialog.tsx
│  │  ├─ Settings.tsx
│  │  └─ ProfilesManager.tsx
│  ├─ state/
│  │  └─ store.ts
│  ├─ style.css
│  └─ vite.config.ts
├─ powershell/
│  ├─ run-batch.ps1
│  └─ lib.ps1
├─ tests/
│  ├─ catalog.test.ts
│  ├─ processRunner.test.ts
│  ├─ elevatedRunner.test.ts
│  ├─ quoting.test.ts
│  ├─ security.test.ts
│  ├─ settings.test.ts
│  ├─ integration/
│  │  └─ extension.test.ts
│  ├─ e2e/
│  │  └─ dashboard.spec.ts
│  └─ powershell/
│     ├─ run-batch.Tests.ps1
│     └─ lib.Tests.ps1
├─ media/
│  ├─ icon.png
│  └─ banner.png
├─ out/ (gitignored)
├─ dist/ (gitignored)
├─ node_modules/ (gitignored)
├─ .gitignore
├─ .editorconfig
├─ .eslintrc.json
├─ .prettierrc
├─ README.md
├─ CONTRIBUTING.md
├─ SECURITY.md
└─ CHANGELOG.md
8. Next Actions
When you confirm, I will execute these actions:
Initialize Node/TS project: Create package.json, tsconfig.json, .gitignore, .editorconfig, ESLint/Prettier configs; install dependencies (VS Code extension API, React, Vite, Vitest, Zod).
Scaffold extension entry point: Create src/extension.ts with activation command psDashboard.open, stub webview setup, and message channel.
Create catalog schema: Implement src/catalog/schema.ts (Zod schema) and src/catalog/loadCatalog.ts (load/validate JSON packs).
Stub PowerShell helpers: Create powershell/run-batch.ps1 and powershell/lib.ps1 with outlined structure (no full implementation yet).
Scaffold webview: Create webview/app.tsx, webview/vite.config.ts, and component stubs (Catalog.tsx, Preview.tsx, RunToolbar.tsx).
