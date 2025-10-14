# Development Setup Guide

## Quick Start

### Prerequisites

Ensure you have the following installed:

- **Node.js** 18 LTS or higher ([Download](https://nodejs.org/))
- **pnpm** package manager: `npm install -g pnpm`
- **PowerShell 7+** (recommended): [Download](https://github.com/PowerShell/PowerShell/releases)
- **VS Code** 1.85 or higher: [Download](https://code.visualstudio.com/)
- **Git**: [Download](https://git-scm.com/)

### Installation Steps

1. **Navigate to project directory**
   ```bash
   cd powershell_command_dashboard
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Build the project**
   ```bash
   pnpm run build
   ```

4. **Run tests** (optional but recommended)
   ```bash
   # TypeScript tests
   pnpm test

   # PowerShell tests (requires Pester module)
   pnpm run test:pester
   ```

5. **Launch extension in development mode**
   - Open the project in VS Code
   - Press `F5` to launch Extension Development Host
   - In the new window, open Command Palette (`Ctrl+Shift+P`)
   - Run: **"Open PowerShell Command Dashboard"**

### Development Workflow

#### Watch Mode (Auto-rebuild on changes)

```bash
pnpm run watch
```

This runs both TypeScript and Vite watchers in parallel.

#### Manual Build

```bash
# Build everything
pnpm run build

# Build extension only
pnpm run build:extension

# Build webview only
pnpm run build:webview
```

#### Linting and Formatting

```bash
# Lint
pnpm run lint

# Format
pnpm run format
```

### Project Structure

```
powershell_command_dashboard/
├── src/                    # Extension code (TypeScript)
│   ├── extension.ts        # Entry point
│   ├── catalog/            # Command catalog schema & loader
│   │   ├── schema.ts
│   │   ├── loadCatalog.ts
│   │   └── packs/          # Built-in command packs (JSON)
│   └── util/               # Utilities (paths, shell detection)
├── webview/                # React UI
│   ├── app.tsx             # Root component
│   ├── components/         # UI components
│   └── state/              # Zustand store
├── powershell/             # PowerShell helper scripts
│   ├── run-batch.ps1       # Batch runner
│   └── lib.ps1             # Shared functions
├── tests/                  # Test files
│   ├── catalog.test.ts     # TypeScript unit tests
│   └── powershell/         # Pester tests
└── out/                    # Compiled output (gitignored)
```

### Debugging

#### Extension Debugging

1. Set breakpoints in TypeScript files under `src/`
2. Press `F5` to launch Extension Development Host
3. Breakpoints will be hit when you interact with the extension

#### Webview Debugging

1. Launch Extension Development Host (`F5`)
2. Open the dashboard
3. Right-click in the webview and select **"Open Webview Developer Tools"**
4. Use browser DevTools to inspect React components

### Common Issues

#### "PowerShell not found"

Ensure `pwsh` or `powershell` is in your PATH:

```bash
where pwsh
where powershell
```

Install PowerShell 7+ if missing: https://github.com/PowerShell/PowerShell/releases

#### "Pester module not found"

Install Pester:

```powershell
Install-Module -Name Pester -Force -SkipPublisherCheck
```

#### "Build fails with TypeScript errors"

Clean and rebuild:

```bash
rm -rf out dist node_modules
pnpm install
pnpm run build
```

#### "Webview shows blank screen"

1. Check browser console in Webview Developer Tools
2. Ensure `pnpm run build:webview` completed successfully
3. Check that `dist/webview.js` exists

### Testing PowerShell Scripts Manually

You can test the PowerShell helpers independently:

```powershell
# Test lib.ps1 functions
. .\powershell\lib.ps1

$result = Invoke-CommandSafe -CommandId "test" -CommandText "Get-Process | Select-Object -First 5"
$result | ConvertTo-Json

# Test run-batch.ps1 with a manifest
# (Requires creating a batch manifest JSON file first)
```

### Next Steps

- **MVP Development**: See [epics.md](epics.md) Epic E3 for implementing the non-elevated runner
- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines
- **Architecture**: See [tech_spec.md](tech_spec.md) for technical details

### Getting Help

- **Issues**: Report bugs at [GitHub Issues](https://github.com/luc-systems/ps-command-dashboard/issues) (placeholder)
- **Docs**: See [prd.md](prd.md), [tech_spec.md](tech_spec.md), [epics.md](epics.md)

---

**Status**: MVP scaffolding complete (2025-10-13)
