# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-XX

### Added
- **Command Catalog**: 50+ curated PowerShell commands across 5 categories
- **Least-Privilege Elevation**: Smart separation of admin/non-admin commands
- **JSONL Streaming**: Real-time structured output with progress indicators
- **Audit Trail**: Complete execution history with timestamped artifacts
- **Export Formats**: JSON, CSV, and HTML report generation
- **Custom Command Packs**: Support for user-defined command collections
- **Security Features**:
  - Optional sensitive data redaction in UI
  - Command allowlisting
  - No silent elevation
  - Local-only storage
- **Execution Modes**:
  - Headless mode with JSONL streaming
  - Terminal mode for VS Code integrated terminal
- **Multi-Shell Support**: Auto-detect or manual selection of PowerShell 5.1/7+
- **Settings System**: Comprehensive configuration options with live updates
- **History Management**: Searchable command history with retention policies
- **WebView UI**: Modern React-based dashboard with VS Code UI toolkit
- **Performance Monitoring**: Built-in latency and execution time tracking
- **CI/CD Pipeline**: Automated testing and release validation

### Security
- Implemented secure command execution model
- Added input validation for all user-provided data
- Enforced least-privilege principle throughout
- Created comprehensive threat model documentation

### Documentation
- Complete API documentation
- Security model and threat analysis
- Contribution guidelines
- Troubleshooting guide

## [0.1.0] - 2024-01-01 (Pre-release)

### Added
- Initial MVP implementation
- Basic command catalog (45 commands)
- Simple elevation support
- Basic UI with command selection
- Minimal export functionality

---

## Roadmap

### Future Enhancements
- [ ] Cloud sync for settings and history
- [ ] Command scheduling and automation
- [ ] Integration with Azure PowerShell
- [ ] Advanced filtering and search
- [ ] Command templates with variables
- [ ] Batch execution profiles
- [ ] Real-time collaboration features

### Known Issues
- UAC prompts may be hidden behind VS Code window
- ExecutionPolicy restrictions in some enterprise environments
- Limited support for PowerShell Core on Linux/macOS (Windows-only currently)

## Support

For issues and feature requests, please visit:
https://github.com/luc-systems/ps-command-dashboard/issues