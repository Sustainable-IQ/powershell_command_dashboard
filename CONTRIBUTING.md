# Contributing to PowerShell Command Dashboard

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 18+ and pnpm 8+
- VS Code 1.85+
- PowerShell 7+ (recommended) or Windows PowerShell 5.1
- Git for Windows

### Getting Started

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR-USERNAME/ps-command-dashboard.git
   cd ps-command-dashboard
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Build the Extension**
   ```bash
   pnpm run build
   ```

4. **Open in VS Code**
   ```bash
   code .
   ```

5. **Launch Development Instance**
   - Press `F5` to launch a new VS Code window with the extension loaded
   - Open Command Palette → "Open PowerShell Command Dashboard"

## Project Structure

```
├── src/                 # Extension source code
│   ├── catalog/        # Command catalog and validation
│   ├── runner/         # PowerShell execution engine
│   ├── settings/       # Configuration management
│   └── extension.ts    # Main extension entry
├── webview/            # React-based UI
│   ├── components/     # UI components
│   └── app.tsx        # Main webview app
├── packs/              # Built-in command packs
├── tests/              # Test suites
│   ├── *.test.ts      # Vitest unit tests
│   └── powershell/    # Pester tests
└── scripts/            # Build and automation scripts
```

## Testing

### Run All Tests
```bash
pnpm test                 # Unit tests (Vitest)
pnpm run test:pester     # PowerShell tests (Pester)
```

### Watch Mode
```bash
pnpm run test:watch      # Auto-run tests on changes
```

### E2E Testing
```bash
pnpm run test:integration # VS Code integration tests
```

## Adding Command Packs

1. Create a new JSON file in `packs/`
2. Follow the schema in `src/catalog/schema.ts`
3. Run validation: `pnpm run validate-packs`
4. Add tests in `tests/catalog.test.ts`

Example pack structure:
```json
{
  "id": "my-pack",
  "name": "My Commands",
  "version": "1.0.0",
  "commands": [
    {
      "id": "my-cmd",
      "label": "My Command",
      "category": "system",
      "command": "Get-Process",
      "requiresAdmin": false,
      "riskLevel": "low",
      "tags": ["process"]
    }
  ]
}
```

## Code Style

- TypeScript with strict mode
- Prettier for formatting
- ESLint for linting
- Use async/await over promises
- Add JSDoc comments for public APIs

### Format Code
```bash
pnpm run format
pnpm run lint
```

## Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make Changes**
   - Write tests for new functionality
   - Update documentation if needed
   - Ensure CI passes locally

3. **Commit with Conventional Commits**
   ```bash
   git commit -m "feat: add new command pack loader"
   git commit -m "fix: handle UAC timeout correctly"
   git commit -m "docs: update README examples"
   ```

4. **Push and Create PR**
   - Push to your fork
   - Create PR against `main` branch
   - Fill out PR template
   - Wait for review

## PR Guidelines

### DO
- Keep PRs focused and small
- Add tests for new features
- Update CHANGELOG.md
- Follow existing patterns
- Test on Windows 10 and 11

### DON'T
- Mix features and fixes in one PR
- Break existing APIs without discussion
- Add external dependencies without approval
- Include sensitive data or secrets

## Security

- Never log sensitive data (passwords, tokens)
- Validate all user inputs
- Use least-privilege principle
- Report security issues via SECURITY.md

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag v1.0.0`
4. Push tag: `git push --tags`
5. CI will build and create release

## Questions?

- Open a [Discussion](https://github.com/luc-systems/ps-command-dashboard/discussions)
- Check existing [Issues](https://github.com/luc-systems/ps-command-dashboard/issues)
- Review [Documentation](./README.md)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.