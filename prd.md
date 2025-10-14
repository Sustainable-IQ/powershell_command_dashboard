# VS Code PowerShell Command Dashboard (PRD)

**Author:** Luc
**Date:** October 13, 2025
**Project Level:** L2 (MVP → v1)
**Project Type:** VS Code Extension + Headless Elevated Runner (PowerShell)
**Target Scale:** Individual power users → Small teams (Windows 10/11). MVP targets ~50–200 users; design scales to thousands.

---

## Description, Context and Goals

A VS Code extension that provides a dashboard to run curated PowerShell commands in batches. Users select commands via checkboxes, preview the exact text to be executed, and run them either:

* **Non‑elevated** inside VS Code (integrated terminal or headless child process), or
* **Elevated** via a separate PowerShell process launched with UAC (results returned to the dashboard).

The tool favors **least privilege**, **transparency**, and **auditability**, covering ~80% of diagnostic and hygiene tasks without elevation while offering a reliable, debuggable path for the remaining 20%.

### Deployment Intent

* Ship as a signed VS Code extension in the Visual Studio Marketplace.
* Open-source repository (MIT or similar), with CI for builds, tests, and signing.
* No background services; elevation is per-batch and explicit.

### Context

Power users and engineers often run repeatable sets of PowerShell commands for diagnostics, privacy sweeps, and system hygiene. Today this is ad‑hoc and error‑prone. VS Code is a common hub, but elevation of the **existing** integrated terminal is not possible. The product solves this with a dual-execution model (non‑elevated inline + elevated out‑of‑process) while keeping a clear user‑visible preview of every command.

### Goals

* **G1 – 80/20 coverage:** Run common inventory, networking, privacy, and startup triage commands with no elevation.
* **G2 – Trust and transparency:** Always show the exact commands; support dry‑run/preview.
* **G3 – Safe elevation:** Run admin‑required batches through UAC with results captured back into the UI.
* **G4 – Auditability:** Persist run logs and machine‑readable results (JSON).
* **G5 – Composability:** Save/load command “profiles” (packs) by intent.
* **G6 – Debuggability:** If anything fails, the user can reproduce outside the tool (Copy fallback, clear error surfaces).

**Success metrics (indicative):**

* 90% of non‑admin commands complete in < 3s per batch (excluding command runtime).
* < 1% run failures attributable to the tool (not the commands).
* > 80% of users run at least one elevated batch successfully in week 1.

---

## Requirements

### Functional Requirements

**FR‑1 Command Catalog & Schema**

* JSON manifest describing each command: `id`, `label`, `category`, `description`, `commandText | scriptPath`, `requiresAdmin`, `riskLevel (info|moderate|destructive)`, `os`, `shell (WindowsPowerShell|pwsh)`, `tags`, `preview` notes, `deps`.
* Support parameters with safe templating and quoting.

**FR‑2 UI: Discover & Select**

* Webview with categories (Inventory, Networking, Startup/Persistence, Privacy, Security).
* Search/filter, multi‑select checkboxes, “Select all in category.”
* Admin‑required commands display a red **Admin** badge; destructive commands display a warning icon.

**FR‑3 Preview**

* Side panel shows exact command text for selected items.
* Toggle **Dry Run** (prints commands instead of executing when supported).
* Validation pass: check `Get-Command` availability; soft‑fail with guidance.

**FR‑4 Non‑Elevated Execution**

* Execute selected commands in a dedicated headless PowerShell child process (default) or send to integrated terminal (user setting).
* Stream stdout/stderr; collect exit codes; normalize to per‑command result objects.

**FR‑5 Elevated Execution**

* If any selection `requiresAdmin: true`, prompt: **Run Elevated** / **Skip Admin** / **Copy**.
* On approve, write batch to a temp script and launch elevated PowerShell via `Start-Process -Verb RunAs`.
* Elevated process writes structured results (JSON) and human log (text) to temp files; extension reads and renders them.

**FR‑6 Results & Logs**

* Results table with per‑command status (Success/Failed/Skipped), duration, and short message.
* Details view with raw output, parsed object (if JSON), and remediation hints.
* Export run report (JSON + text).
* Maintain local run history.

**FR‑7 Profiles (“Packs”)**

* Save/load named selections with parameter defaults.
* Ship with built‑in packs (e.g., “Privacy Sweep”, “Networking Triage”, “Startup Audit”).

**FR‑8 Settings**

* Choose shell (Windows PowerShell vs PowerShell 7+).
* Choose default execution path (headless vs terminal).
* Default export location, retention policy, and whether to auto‑open results.
* Telemetry (off by default; if enabled, anonymized counts only).

**FR‑9 Copy Fallback**

* One‑click copy for any selected commands (combined or per‑item) for manual paste into an Admin shell if elevation is blocked.

**FR‑10 Accessibility & Keyboard Navigation**

* Fully navigable via keyboard; proper roles/labels; high‑contrast support.

### Non‑Functional Requirements

**NFR‑1 Security**

* No silent elevation; explicit user consent with clear summary.
* No arbitrary string concatenation without quoting; parameters validated.
* Extension and any helper artifacts are code‑signed.
* Least privilege by default; elevation only per batch; no persistent services.

**NFR‑2 Privacy**

* Logs stored locally.
* No command content or outputs leave the machine unless the user exports.
* Telemetry off by default; if enabled, no PII or command text.

**NFR‑3 Reliability**

* If the elevated process or IPC fails, user sees actionable recovery (retry, open location of temp files, copy fallback).
* Recoverable from partial results; never blocks VS Code.

**NFR‑4 Performance**

* Extension overhead to spawn non‑elevated headless run: < 300 ms median.
* UI remains responsive during long runs; render incremental results.

**NFR‑5 Operability & Debuggability**

* Verbose mode writes detailed traces (spawned command line, exit codes, file paths).
* Clear error codes and remediations for common policy blocks (UAC, execution policy, GPO).

**NFR‑6 Compatibility**

* Windows 10/11; Windows PowerShell 5.1 and PowerShell 7+.
* Works without admin rights for non‑admin commands.

**NFR‑7 Accessibility**

* WCAG 2.1 AA for core flows inside webview.

---

## User Journeys

**UJ‑1 First Run**
User installs the extension → opens dashboard → sees built‑in packs and categories → selects a few inventory commands → preview shows exact text → Run (non‑elevated) → results table appears with statuses and logs.

**UJ‑2 Elevated Batch**
User selects items including `Stop-Service Spooler` and a firewall rule → UI shows Admin badges → clicks **Run** → dialog summarizes admin items → **Run Elevated** → UAC consent → run completes → results + raw output rendered.

**UJ‑3 Elevation Blocked**
UAC denied by policy → banner explains failure → user clicks **Copy Admin Commands** → pastes into an Admin shell → returns to dashboard and attaches the resulting log.

**UJ‑4 Build a Profile**
User composes “Privacy Sweep” (DNS flush, browser DNS clear guidance, startup audit) → saves as profile → runs weekly → exports JSON and shares with team.

**UJ‑5 Troubleshoot a Failure**
A command fails (missing module) → result detail shows `Get-Command` check and remediation → user installs module and re‑runs only failed items.

---

## UX Design Principles

* **Transparency:** Always show the exact commands.
* **Least Privilege:** Default to non‑elevated; elevate only when necessary and explicit.
* **Reversibility:** Dry‑run and confirmation gates for risky actions.
* **Clarity:** Plain language summaries, concise errors, obvious next steps.
* **Composure:** UI stays responsive; long operations stream progress.
* **Accessibility:** Keyboard‑first; screen‑reader friendly.

---

## Epics

**E1 – Command Catalog & Packs**
*AC:* JSON schema defined; built‑in packs shipped; validation CLI verifies manifests.

**E2 – Webview UI**
*AC:* Category list, search, multi‑select, preview pane, result table, keyboard navigation.

**E3 – Non‑Elevated Runner**
*AC:* Headless PowerShell runner with structured per‑command results; setting to send to integrated terminal.

**E4 – Elevated Runner & IPC**
*AC:* UAC flow; temp script generation; results returned via JSON; retry + copy fallback path.

**E5 – Results, Logs, Export**
*AC:* Run history; export JSON/text; detailed view with raw output.

**E6 – Profiles (Save/Load)**
*AC:* Create, edit, delete profiles; parameter defaults; run a profile in one click.

**E7 – Security & Policy**
*AC:* Signing; parameter escaping; risk labels; confirmations for destructive actions.

**E8 – Settings & Extensibility**
*AC:* Shell selection; defaults; retention; telemetry toggle; extension points for custom packs.

**E9 – QA, Docs, Marketplace**
*AC:* Test matrix (Win10/11; PS 5.1/7+); troubleshooting guide; marketplace listing.

**Epic Note:** Deliver in phases — **MVP** (E1–E3, subset of packs), **v1** (E4–E6), **v1.1** (E7–E9).

---

## Out of Scope

* Persistent elevated background services or daemons.
* Remote execution/orchestration across multiple machines (future).
* Non‑Windows OS support in MVP.
* Arbitrary script repo execution without manifest (keep to allowlist philosophy).
* Collecting or sending command outputs externally by default.

---

## Next Steps

1. Approve command categories, initial pack contents, and risk taxonomy.
2. Wireframes: dashboard, preview, results, elevation dialog.
3. Define JSON schema for command catalog; create validation script.
4. Scaffold VS Code extension (webview + message bus); implement non‑elevated runner.
5. Implement elevated runner (UAC, temp script/result JSON, retry/copy fallback).
6. Build results table, export, and run history.
7. Implement profiles; ship initial packs.
8. Security review (quoting, signing, telemetry off-by-default).
9. Test on Win10/11 with PowerShell 5.1 and 7+; publish MVP.

---

## Document Status

* [ ] Goals and context validated with stakeholders
* [ ] All functional requirements reviewed
* [ ] User journeys cover all major personas
* [ ] Epic structure approved for phased delivery
* [ ] Ready for architecture phase

*Note: See technical-decisions.md for captured technical context*

---

*This PRD adapts to project level L2 — providing appropriate detail without overburden.*
