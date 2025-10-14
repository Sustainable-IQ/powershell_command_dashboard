Dashboard Features — Deep Dive (explicit)
1) Layout & regions

Left rail — Categories & filters: Inventory, Networking, Startup/Persistence, Privacy, Security (each shows item counts + “Select All in Category”).

Center — Command list: rows/cards with checkbox, label, short description, badges (Admin, Risk, Tags). Inline parameter chips where applicable.

Right — Preview & details: read-only block showing the exact concatenated PowerShell for the current selection. Tabs: Preview · Selection Summary. Toggle: Dry-Run.

Sticky bottom toolbar: Run, Run Elevated (only when needed), Copy, Save as Profile, Export, Clear Selection. A small pill shows “N selected / M require Admin / est. runtime”.

2) Controls (buttons, filters, dropdowns)

Search (debounced; Ctrl+/ to focus).

Filters:

Risk: Info / Moderate / Destructive (multi-select)

Privilege: All / Non-Admin only / Admin only

Type: Read-only / Read-write

Output: JSON-capable only

Sort: Label · Category · Risk · Recently used.

View: Compact vs Comfortable density.

Parameters panel: validated inline inputs (text/select/number) with sensible defaults.

Validation toggle: Verify After Run → executes post-checks automatically.

3) Progress & feedback

Overall progress bar: Running 3/12 (+ cancel).

Per-command chips: Queued → Running → Success / Failed / Skipped.

Streaming results: rows appear as they complete (JSONL under the hood).

Post-run actions: Retry failed, Export, Open artifacts folder.

4) Admin & safety UX

Admin badge (red) on items requiring elevation.

Elevation dialog lists admin items + rationale; explicit consent; shows the elevated script path it will run.

Destructive guard: requires typing CONFIRM; -WhatIf toggle where supported.

5) Follow-up validation (post-checks)

When Verify After Run is enabled, each command’s paired check runs and reports:

✅ green: state matches expectation

⚪ gray: not applicable

❌ red: mismatch (details shown)

Examples

Stop Spooler (Admin) → verify Get-Service Spooler | Select Status = Stopped.

Add Outbound Block Rule (Admin) → verify Get-NetFirewallRule -DisplayName '<name>' exists & enabled.

Set DNS Servers (Admin) → verify Get-DnsClientServerAddress -InterfaceAlias '<if>' contains chosen IPs.

Disable SMB1 (Admin) → verify (Get-WindowsOptionalFeature -Online -FeatureName SMB1Protocol).State -eq 'Disabled'.

Clear DNS Cache → verify ipconfig /displaydns is near-empty (informational).

RDP Deny Connections (Admin) → verify registry fDenyTSConnections = 1.

6) Initial command set (checkbox items)
Inventory (read-only unless stated)

List Processes — Get-Process | Select Id,ProcessName,Company,StartTime

List Services — Get-Service | Select Name,Status,StartType

Drivers Summary — Get-CimInstance Win32_SystemDriver | Select Name,State,StartMode

Installed Updates — Get-HotFix | Select HotFixID,InstalledOn,Description

System Logs (recent) — Get-WinEvent -LogName System -MaxEvents 200

Disk Usage (top folders; scoped path picker)

Networking (read-only unless stated)

IP Configuration — ipconfig /all / Get-NetIPConfiguration

TCP Connections — Get-NetTCPConnection (with owning PID)

Adapters — Get-NetAdapter

Routes — Get-NetRoute

Neighbors/ARP — Get-NetNeighbor

DNS Cache — ipconfig /displaydns

Test Connectivity (param) — Test-NetConnection -ComputerName <host> -CommonTCPPort HTTPS

Startup / Persistence

Startup Commands — Get-CimInstance Win32_StartupCommand

Scheduled Tasks — Get-ScheduledTask | Where-Object State -ne 'Disabled'

Run Keys (User) — HKCU:\Software\Microsoft\Windows\CurrentVersion\Run

Run Keys (Machine, read-only) — HKLM:\Software\Microsoft\Windows\CurrentVersion\Run

Privacy / Security

Clear DNS Cache — Clear-DnsClientCache

Defender Status — Get-MpComputerStatus

(Admin) Update Defender Signatures — Update-MpSignature

(Admin) Quick Scan — Start-MpScan -ScanType QuickScan

SMB1 Status — Get-WindowsOptionalFeature -Online -FeatureName SMB1Protocol

(Admin) Disable SMB1 — Disable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol

(Admin) Deny RDP Connections — set fDenyTSConnections=1 (+ firewall adjust)

(Admin) Add Outbound Block Rule — New-NetFirewallRule …

(Admin) Configure DoH — Add-DnsClientDohServerAddress + Set-DnsClientServerAddress

Items marked (Admin) trigger the elevation flow when selected.

7) Grouping logic

Primary: functional category (Inventory, Networking, Startup, Privacy, Security).

Secondary facets: risk level, privilege requirement, output type (text/JSON), recency of use (MRU).

8) Empty states & errors

No selection: suggest built-in profile (e.g., Privacy Sweep).

Elevation denied: banner with Retry Elevation and Copy Admin Commands.

Command unavailable: show Get-Command result + remediation tip.

9) Key labels

Buttons: Run · Run Elevated · Dry-Run · Copy · Save as Profile · Export · Clear Selection · Retry Failed

Badges: Admin · Destructive · Info · Moderate

States: Queued · Running · Success · Failed · Skipped
