# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.x.x   | :white_check_mark: |

## Reporting a Vulnerability

**Do not report security vulnerabilities via public GitHub issues.**

Instead, please report them via email to: ---- ADD EMAIL (TO DO)

### What to Include

- Description of the vulnerability
- Steps to reproduce (proof-of-concept)
- Potential impact and attack scenarios
- Suggested mitigation (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Fix Timeline**: Depends on severity (critical issues prioritized)
- **Disclosure**: Coordinated disclosure after patch is released

## Security Model

### Design Principles

1. **No Silent Elevation**: UAC prompts require explicit user consent; rationale shown
2. **Allowlist Only**: Only pre-defined commands in signed pack files can be executed
3. **Least Privilege**: Non-admin commands run without elevation by default
4. **Parameter Validation**: All inputs validated and quoted to prevent injection
5. **Local-Only**: No command text or output leaves the machine unless user exports
6. **Telemetry Off**: No usage data collected unless explicitly enabled (counts only)

### Threat Model

**In Scope:**
- Command injection via parameters
- Elevation bypass (UAC circumvention)
- Credential/secret exposure in logs
- Arbitrary script execution
- Privilege escalation

**Out of Scope (by design):**
- Social engineering (user approves commands they see)
- OS-level vulnerabilities (PowerShell, Windows)
- Physical access attacks

### Known Limitations

- **MVP/v1**: Temp scripts written to `%LOCALAPPDATA%\ps-dashboard\runs\<runId>` rely on default NTFS permissions
  - **Mitigation (v1.1)**: Explicit ACLs to restrict access to current user
- **Execution Policy**: Extension uses `-ExecutionPolicy Bypass` for temp scripts
  - **Rationale**: Avoids permanent policy changes; scripts are generated, not user-supplied
  - **Mitigation**: Scripts are signed in v1.1

### Security Features (Roadmap)

- **[MVP]** Parameter quoting and validation
- **[v1]** Destructive command confirmation (type "CONFIRM")
- **[v1]** `-WhatIf` dry-run support where available
- **[v1.1]** Authenticode signing for PowerShell scripts
- **[v1.1]** NTFS ACLs on temp artifacts
- **[v1.1]** Telemetry module (opt-in, anonymized counts only)

## Security Audits

- **Internal Review**: Completed before MVP release
- **External Audit**: Planned for v1.1

## Dependencies

We monitor dependencies for known vulnerabilities via:
- Dependabot (GitHub)
- `npm audit` / `pnpm audit` in CI

Critical vulnerabilities are patched within 48 hours.

## Secure Development Practices

- **Code Review**: All PRs reviewed by maintainers
- **Least Privilege Testing**: Tested in non-admin contexts
- **CI Checks**: Lint, tests, and audit run on every commit
- **Secrets Management**: No secrets in source; signing certs stored securely

---

**Last Updated**: 2025-10-13
**Contact**: security@luc-systems.dev (placeholder)
