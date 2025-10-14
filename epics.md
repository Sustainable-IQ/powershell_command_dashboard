# VS Code PowerShell Command Dashboard - Epic Breakdown

**Author:** Luc
**Date:** October 13, 2025
**Project Level:** L2 (MVP → v1)
**Target Scale:** Individual power users → Small teams (initial 50–200 users; design scales to thousands)

---

## Epic Overview

This project ships in three phased releases:

* **MVP (Weeks 1–4):** E1 Catalog & Packs, E2 Webview UI (core selection + preview), E3 Non‑Elevated Runner.
* **v1 (Weeks 5–8):** E4 Elevated Runner & IPC, E5 Results/Logs/Export, E6 Profiles.
* **v1.1 (Weeks 9–10):** E7 Security & Policy Hardening, E8 Settings/Extensibility, E9 QA/Docs/Marketplace.

**Objectives**

1. Enable repeatable, safe execution of curated PowerShell commands with full transparency.
2. Provide reliable elevation without elevating the VS Code terminal.
3. Persist results for audit and learning; enable shareable command packs.

**Key Dependencies**

* Windows 10/11; PowerShell 5.1 & 7+; VS Code ≥ 1.85.
* UAC enabled; ability to spawn `Start-Process -Verb RunAs`.
* Code signing for release builds.

**Top Risks & Mitigations**

* **UAC/GPO blocks elevation** → Provide copy fallback; clear remediation; retry flow.
* **Execution policy blocks scripts** → Use `-ExecutionPolicy Bypass` for temp scripts; document signing in v1.1.
* **Long‑running commands freeze UI** → Headless runner, JSONL streaming, cancel/timeout support.
* **Parameter injection** → Strict templating & quoting; schema validation.

**Success Metrics**

* ≥ 90% non‑admin runs succeed within 3s overhead; ≥ 80% users complete one elevated batch in Week 1.
* < 1% tool‑attributable failures; ≥ 3 shipped packs with ≥ 10 commands each.

---

## Epic Details

### E1 — Command Catalog & Packs

**Goal:** Define a signed, validated allowlist of commands grouped into initial packs (Inventory, Networking, Startup, Privacy).
**Scope:** JSON schema, loader/validator, 30–50 initial commands, risk/admin metadata.
**Out of Scope:** Arbitrary script execution; remote orchestration.

**Key Stories**

* As a user, I can browse categorized commands with clear labels and descriptions.
* As a maintainer, I can validate a pack against a schema before shipping.

**Acceptance Criteria**

* Zod schema enforced at load; invalid manifests fail with actionable errors.
* Each command declares `requiresAdmin`, `riskLevel`, `shell`, and `os`.

**Dependencies:** None.
**Metrics:** Catalog load time < 100ms; ≥ 40 commands MVP.
**Risks:** Inconsistent command output → prefer object output where feasible.
**Estimate:** 5–7 SP.

---

### E2 — Webview UI

**Goal:** Discoverability and selection with preview of exact commands.
**Scope:** Categories, search/filter, checkbox selection, preview pane, keyboard accessibility.

**Key Stories**

* As a user, I can multi‑select commands and see exactly what will run.
* As a keyboard user, I can navigate the dashboard without a mouse.

**Acceptance Criteria**

* Preview shows concatenated batch text; admin items visibly flagged.
* WCAG‑aligned roles/labels; tab order validated.

**Dependencies:** E1.
**Metrics:** Initial render < 300ms; search latency < 50ms for 200 items.
**Risks:** Webview state loss on reload → persist selection in extension state.
**Estimate:** 8–10 SP.

---

### E3 — Non‑Elevated Runner

**Goal:** Reliable execution in headless PowerShell with structured results.
**Scope:** Temp script generation, spawn, stdout/stderr capture, JSONL results, cancel.

**Key Stories**

* As a user, I can run a batch non‑elevated and see per‑command status in real time.
* As a developer, I can reproduce runs using the saved artifacts.

**Acceptance Criteria**

* JSONL stream emits one record per command with `status`, `exitCode`, `timing`.
* Failure of one command doesn’t abort the batch by default (configurable).

**Dependencies:** E1, E2.
**Metrics:** Spawn overhead < 300ms; memory stable during long runs.
**Risks:** Execution policy → use `-ExecutionPolicy Bypass` for temp scripts.
**Estimate:** 8–10 SP.

---

### E4 — Elevated Runner & IPC

**Goal:** Safe UAC elevation for admin batches with results returned to UI.
**Scope:** RunAs launch, temp script handoff, results/log retrieval, retry & copy fallback.

**Key Stories**

* As a user, I can approve elevation once and see elevated results flow into the dashboard.
* As a user, if elevation fails, I can copy the commands or retry.

**Acceptance Criteria**

* Elevation dialog lists admin items and rationale; explicit consent required.
* Results appear in UI via JSONL within 1s of first record written.

**Dependencies:** E3.
**Metrics:** ≥ 95% elevated launches succeed on vanilla Win11.
**Risks:** GPO blocks RunAs → fallback path prominent.
**Estimate:** 10–13 SP.

---

### E5 — Results, Logs, Export

**Goal:** Actionable results with history and export.
**Scope:** Results table, detail drawer (raw & parsed), export JSON/text, run history.

**Key Stories**

* As a user, I can view per‑command details and export a report for later analysis.
* As a user, I can filter to only failures to retry quickly.

**Acceptance Criteria**

* Exports include batch metadata and artifacts paths.
* History persists across sessions with retention policy.

**Dependencies:** E3/E4.
**Metrics:** Export completes < 1s for 1MB output.
**Risks:** Large raw outputs → truncation with link to artifact file.
**Estimate:** 5–8 SP.

---

### E6 — Profiles (Save/Load)

**Goal:** Save reusable batches (“packs”) with parameter defaults.
**Scope:** Create, edit, delete, run a profile; workspace‑scoped storage.

**Key Stories**

* As a user, I can save my selection as a named profile and run it later with one click.

**Acceptance Criteria**

* Profiles serialize command IDs + parameter values; loading re‑applies selection.
* Conflicts handled when catalog changes (graceful skip + warning).

**Dependencies:** E1/E2/E3.
**Metrics:** Load profile < 150ms.
**Risks:** Drift between profiles and catalog → migration notes.
**Estimate:** 5–7 SP.

---

### E7 — Security & Policy Hardening

**Goal:** Ship safe defaults and protections against misuse.
**Scope:** Parameter validation/quoting, destructive‑action confirms, signing plan, telemetry gate.

**Key Stories**

* As a security‑conscious user, I see explicit confirmations for risky commands.

**Acceptance Criteria**

* Type‑to‑confirm for destructive items; telemetry off by default; no PII captured.
* Signing pipeline documented (and used for releases).

**Dependencies:** E1–E6.
**Metrics:** 0 high‑severity findings in pre‑release review.
**Risks:** Over‑strict validation blocks legit params → allow safe overrides with warnings.
**Estimate:** 5–8 SP.

---

### E8 — Settings & Extensibility

**Goal:** Configure shells, defaults, retention; allow custom packs.
**Scope:** Settings UI, shell selection, retention policy, extension points for external packs.

**Key Stories**

* As an advanced user, I can point the dashboard at custom pack files in my repo.

**Acceptance Criteria**

* Settings sync with VS Code; custom pack path validated on load.

**Dependencies:** E1/E2.
**Metrics:** Settings read < 50ms; validation errors surfaced inline.
**Risks:** Ambiguous precedence between built‑in vs custom → clear merge strategy.
**Estimate:** 3–5 SP.

---

### E9 — QA, Docs, Marketplace

**Goal:** Validate quality, ship docs, and publish.
**Scope:** Test matrix (Win10/11; PS 5.1/7+), troubleshooting guide, marketplace assets.

**Key Stories**

* As a new user, I can install from Marketplace and follow a quickstart to first success.

**Acceptance Criteria**

* Playwright + vscode‑test suites pass in CI; Pester tests pass; signed VSIX.
* Marketplace listing with screenshots, supported scenarios, and security model.

**Dependencies:** All prior epics.
**Metrics:** 100% passing CI; ≤ 1 critical issue after first release.
**Risks:** Flaky CI on Windows → pin runners and versions.
**Estimate:** 5–7 SP.
