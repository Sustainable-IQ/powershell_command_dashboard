# Troubleshooting Guide

## Common Issues and Solutions

### UAC Elevation Issues

#### Problem: UAC prompt is hidden behind VS Code window
**Solution:**
1. Alt+Tab to find the UAC dialog
2. Or configure Windows to always show UAC on top:
   - Open Local Security Policy
   - Navigate to Local Policies → Security Options
   - Set "User Account Control: Switch to the secure desktop" to Enabled

#### Problem: Elevation fails with "Operation cancelled by user"
**Solution:**
- Increase timeout: Settings → `psDashboard.elevation.waitTimeoutMs` → 120000 (2 minutes)
- Ensure no Group Policy blocks elevation
- Try running VS Code as Administrator (not recommended for daily use)

### ExecutionPolicy Errors

#### Problem: "Scripts are disabled on this system"
**Solution:**
The extension bypasses ExecutionPolicy temporarily. If still blocked:
1. Check Group Policy: `gpedit.msc` → Computer Configuration → Administrative Templates → Windows PowerShell
2. Use Terminal mode: Settings → `psDashboard.execution.mode` → `terminal`
3. Copy commands manually: Use the "Copy" button in the dashboard

### PowerShell Version Issues

#### Problem: "The term 'pwsh' is not recognized"
**Solution:**
1. Install PowerShell 7+: https://github.com/PowerShell/PowerShell/releases
2. Or configure to use Windows PowerShell: Settings → `psDashboard.shell.preferred` → `powershell`

#### Problem: Commands fail with syntax errors
**Solution:**
- Some commands require PowerShell 7+
- Check command requirements in the dashboard
- Update PowerShell or use compatible commands

### Group Policy Restrictions

#### Problem: "This operation has been cancelled due to restrictions"
**Solution:**
1. Check with your IT administrator
2. Review Group Policy settings:
   ```powershell
   gpresult /h gpresult.html
   start gpresult.html
   ```
3. Use the Copy feature to run commands in approved terminals

### Antivirus/Security Software

#### Problem: Extension files blocked or quarantined
**Solution:**
1. Add VS Code extensions folder to AV exclusions:
   - Path: `%USERPROFILE%\.vscode\extensions\`
2. Check Windows Defender:
   ```powershell
   Get-MpThreat
   Get-MpPreference
   ```
3. Review security logs for blocked operations

#### Problem: PowerShell processes terminated immediately
**Solution:**
- Check if security software blocks PowerShell child processes
- Try Terminal mode instead of Headless mode
- Add exception for VS Code in security software

### File System Issues

#### Problem: "Access denied" when saving artifacts
**Solution:**
1. Check folder permissions:
   ```powershell
   icacls "$env:LOCALAPPDATA\ps-dashboard"
   ```
2. Ensure adequate disk space
3. Try alternative path in settings

#### Problem: Command packs not loading
**Solution:**
1. Verify file paths in settings
2. Check JSON syntax:
   ```powershell
   Get-Content "path\to\pack.json" | ConvertFrom-Json
   ```
3. Review Output panel for validation errors

### Performance Issues

#### Problem: Dashboard UI is slow or unresponsive
**Solution:**
1. Reduce search debounce: Settings → `psDashboard.ui.search.debounceMs` → 200
2. Lower history limit: Settings → `psDashboard.history.maxEntries` → 50
3. Clear old artifacts:
   ```powershell
   Remove-Item "$env:LOCALAPPDATA\ps-dashboard\runs\*" -Recurse -Force
   ```

#### Problem: PowerShell commands execute slowly
**Solution:**
1. Check for profile scripts slowing startup:
   ```powershell
   Test-Path $PROFILE
   Measure-Command { pwsh -NoProfile -Command "exit" }
   ```
2. Disable unnecessary PowerShell modules
3. Use PowerShell 7+ for better performance

### Network-Related Issues

#### Problem: Commands requiring internet access fail
**Solution:**
1. Check proxy settings:
   ```powershell
   [System.Net.WebRequest]::DefaultWebProxy.GetProxy("https://microsoft.com")
   ```
2. Configure proxy in PowerShell if needed
3. Ensure firewall allows PowerShell network access

### Extension Issues

#### Problem: Extension fails to activate
**Solution:**
1. Check VS Code version (requires 1.85+)
2. Reload VS Code window: `Ctrl+Shift+P` → "Developer: Reload Window"
3. Check extension logs: View → Output → Select "PowerShell Command Dashboard"
4. Reinstall extension

#### Problem: Webview doesn't load
**Solution:**
1. Check Developer Tools: Help → Toggle Developer Tools → Console
2. Clear VS Code cache:
   ```powershell
   Remove-Item "$env:APPDATA\Code\Cache\*" -Recurse -Force
   ```
3. Disable conflicting extensions temporarily

## Getting Help

### Diagnostic Information
Collect this information when reporting issues:

```powershell
# System info
$PSVersionTable
[Environment]::OSVersion
Get-CimInstance Win32_OperatingSystem | Select-Object Caption, BuildNumber

# VS Code info
code --version
code --list-extensions

# Extension logs
Get-Content "$env:LOCALAPPDATA\ps-dashboard\logs\*.log" -Tail 50
```

### Support Channels

1. **GitHub Issues**: https://github.com/luc-systems/ps-command-dashboard/issues
2. **Discussions**: https://github.com/luc-systems/ps-command-dashboard/discussions
3. **Security Issues**: See [SECURITY.md](SECURITY.md)

### Quick Fixes Checklist

- [ ] VS Code updated to latest version
- [ ] Extension updated to latest version
- [ ] PowerShell 7+ installed
- [ ] Running on Windows 10/11
- [ ] Sufficient disk space available
- [ ] No Group Policy restrictions
- [ ] Antivirus not blocking operations
- [ ] Tried both Headless and Terminal modes
- [ ] Checked Output panel for errors