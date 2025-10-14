# VS Code PowerShell Command Dashboard UX/UI Specification

*Generated on October 13, 2025 by Luc*

## Executive Summary

A VS Code extension that exposes a PowerShell command dashboard as a webview. Users browse curated commands (grouped into packs), multi‑select via checkboxes, preview the exact command text, and run batches. Non‑admin commands run inline; admin‑required batches trigger a UAC‑elevated PowerShell process with results streamed back. The UX emphasizes transparency (always show commands), least privilege (clear Admin badges), and auditability (history and exports).

---

## 1. UX Goals and Principles

### 1.1 Target User Personas

1. **Power User / Systems Builder (Primary)**

   * Needs fast diagnostic sweeps and privacy hygiene.
   * Comfortable with terminals; values previews and copy‑paste fallbacks.

2. **Developer / Analyst (Secondary)**

   * Uses VS Code daily; wants repeatable, documented batches; shares profiles with team.

3. **Security‑Conscious Operator (Tertiary)**

   * Cares about risk gating, explicit confirmations, and logs for evidence.

### 1.2 Usability Goals

* **G1:** Run first non‑admin batch within 60 seconds of install.
* **G2:** Elevate and complete one admin batch with a single confirmation.
* **G3:** Zero surprises — exact commands visible before execution.
* **G4:** Keyboard‑first navigation achievable end‑to‑end.
* **G5:** Export results in < 2 clicks.

### 1.3 Design Principles

* **Transparency:** Plain, verbatim command text; red Admin badge when elevated.
* **Least Privilege:** Default non‑elevated; elevate only per batch with rationale.
* **Composure:** Stream progress; non‑blocking UI; cancellable where possible.
* **Reversibility:** Dry‑run toggle and confirmations for destructive actions.
* **Accessibility:** WCAG 2.1 AA targets inside the webview.

---

## 2. Information Architecture

### 2.1 Site Map

* **Dashboard (root)**

  * Categories (Inventory, Networking, Startup, Privacy, Security)
  * Command List (filterable, selectable)
  * Preview Pane (exact commands)
  * Run Toolbar (Run / Run Elevated / Dry‑Run / Copy)
* **Results & History**

  * Current Run (table + details)
  * Past Runs (list, open/export)
* **Profiles**

  * Saved Sets (create, edit, delete, run)
* **Settings**

  * Shell selection, defaults, retention, telemetry toggle

### 2.2 Navigation Structure

* Left vertical navigation tabs: **Dashboard · Results · Profiles · Settings**
* Within Dashboard: left rail **Categories**, center **Command List**, right **Preview/Details**
* Sticky bottom **Run Toolbar** visible in Dashboard at all times.

---

## 3. User Flows

**Flow 1 — First Run (Non‑Admin)**

1. Open **Dashboard** → 2) Select a few Inventory commands → 3) Preview shows concatenated text → 4) Click **Run** → 5) See live statuses in **Results** → 6) Export.

**Flow 2 — Elevated Batch**

1. Select commands including Admin items → 2) Dialog lists Admin commands + rationale → 3) Click **Run Elevated** → 4) UAC consent → 5) Results stream back with Admin badge on run.

**Flow 3 — Elevation Blocked**

1. Attempt elevation; policy denies → 2) Banner offers **Retry Elevation** or **Copy Admin Commands** → 3) User pastes into external Admin shell → 4) Attach or import log (optional).

**Flow 4 — Create & Use Profile**

1. Select commands; set parameters → 2) **Save as Profile** → 3) Later open **Profiles** → 4) **Run Profile** in one click → 5) Review results.

**Flow 5 — Inspect Failure & Retry**

1. A command fails → 2) Open details drawer → 3) Read remediation → 4) Reselect failed items → 5) **Run** again.

---

## 4. Component Library and Design System

### 4.1 Design System Approach

* Base on **VS Code Webview UI Toolkit** to inherit editor theming and accessibility.
* Custom components use VS Code theme tokens (`--vscode-*`) for colors and sizing.
* Monospace rendering for command previews and raw output.

### 4.2 Core Components

* **CategoryList** (filter counts, select all)
* **CommandCard** (checkbox, label, description, badges: Admin/Risk/Tags)
* **SearchBar** (debounced filter with keyboard focus shortcut `/`)
* **PreviewPane** (read‑only code block of exact concatenated commands)
* **RunToolbar** (Run, Run Elevated, Dry‑Run, Copy; disabled/enabled states; selection summary)
* **ResultsTable** (status, command label, duration, message; sortable/filterable)
* **ResultDetailsDrawer** (tabs: Summary · Raw · JSON)
* **ElevationDialog** (list admin items, rationale, confirm input for destructive)
* **Toast/Alert** (success, warning, error; ARIA live region)
* **ProfilesManager** (list, create/edit, set defaults)
* **SettingsPanel** (shell, defaults, retention, telemetry)
* **EmptyStates** (guidance cards for first‑time use)
* **Skeletons/Spinners** for loading states.

---

## 5. Visual Design Foundation

### 5.1 Color Palette

Use VS Code theme tokens to respect user theme:

* Foreground: `var(--vscode-foreground)`
* Background: `var(--vscode-editor-background)`
* Accents: `var(--vscode-button-background)`, `var(--vscode-focusBorder)`
* Info: `var(--vscode-notificationsInfoIcon-foreground)`
* Warning: `var(--vscode-notificationsWarningIcon-foreground)`
* Error: `var(--vscode-notificationsErrorIcon-foreground)`
* **Admin badge:** `var(--vscode-errorForeground)` on `var(--vscode-inputValidation-errorBackground)`
* **Destructive badge:** `var(--vscode-editorMarkerNavigationError-background)`

### 5.2 Typography

**Font Families:**

* UI: `var(--vscode-font-family)`
* Code/Preview/Raw: `var(--vscode-editor-font-family)`

**Type Scale:**

* H1 20–22px / 600
* H2 16–18px / 600
* Body 13–14px / 400
* Mono (code) 12–13px / 400

### 5.3 Spacing and Layout

* Base unit: 8px grid.
* Gaps: 8 / 12 / 16 / 24.
* Columns: **Left rail** 220–260px, **List** flexible, **Preview** 320–420px.
* Sticky Run Toolbar with 12px padding and shadow token for elevation.

---

## 6. Responsive Design

### 6.1 Breakpoints

* Minimum supported width: 960px (VS Code webview typical).
* Compact mode down to 840px (collapses Preview into a tab).
* Large mode ≥ 1280px (more rows visible; Preview expands).

### 6.2 Adaptation Patterns

* Collapse **PreviewPane** into **Results** tab on narrow widths.
* Convert left **CategoryList** into a dropdown filter under 960px.
* Ensure tables support horizontal scroll with sticky headers.

---

## 7. Accessibility

### 7.1 Compliance Target

WCAG 2.1 AA for core flows.

### 7.2 Key Requirements

* Keyboard‑first navigation across all interactive elements.
* ARIA roles/labels on custom components; `aria-describedby` for risk/admin explanations.
* **Focus management:** trap focus in dialogs; return to invoking control on close.
* **Contrast:** use VS Code tokens; verify ≥ 4.5:1 for text.
* **Announcements:** results status and errors announced via ARIA live region.
* **Reduced motion:** respect `prefers-reduced-motion`.

---

## 8. Interaction and Motion

### 8.1 Motion Principles

* Subtle, functional motion only; never block user actions.
* Use fades and size transitions under 150ms; disable when reduced motion is set.

### 8.2 Key Animations

* Checkbox selection micro‑fade of CommandCard background.
* Drawer open/close (ResultsDetails) with 120ms ease‑out.
* Toast slide‑in from bottom with 120ms ease; auto‑dismiss after 5s (pause on hover).

---

## 9. Design Files and Wireframes

### 9.1 Design Files

* Figma project: **VS Code PS Dashboard**

  * Pages: *Dashboard*, *Results*, *Elevation*, *Profiles*, *Settings*
  * Components: tokenized with VS Code webview styles; documented variants.

### 9.2 Key Screen Layouts

* **Dashboard (Selection)** — three‑pane layout; sticky Run Toolbar; command preview visible.
* **Elevation Dialog** — list of admin items with rationale, confirm step for destructive commands.
* **Results & History** — table of current run with status chips; side drawer for details.

---

## 10. Next Steps

### 10.1 Immediate Actions

1. Low‑fi wireframes for Dashboard, Elevation, Results (one day).
2. Token map from VS Code theme variables (half day).
3. Click‑through prototype in Figma to validate flows (one day).
4. A11y review pass on components (half day).

### 10.2 Design Handoff Checklist

* [ ] Component specs (sizes, states, tokens) documented.
* [ ] Interaction notes (keyboard, focus, errors) attached to frames.
* [ ] Empty states and error banners included.
* [ ] Responsive variants for narrow width.
* [ ] Icons and badges exported.
* [ ] Strings reviewed (plain, concise, action‑oriented).

---

## Appendix

### Related Documents

* PRD: `VS Code PowerShell Command Dashboard — PRD`
* Epics: `VS Code PowerShell Command Dashboard — Epic Breakdown`
* Tech Spec: `VS Code PowerShell Command Dashboard — Technical Spec`
* Architecture: `TBD (captured in Tech Spec initial phase)`

### Version History

| Date             | Version | Changes               | Author |
| ---------------- | ------- | --------------------- | ------ |
| October 13, 2025 | 1.0     | Initial specification | Luc    |
