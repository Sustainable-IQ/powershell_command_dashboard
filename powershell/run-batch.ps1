#Requires -Version 5.1

<#
.SYNOPSIS
    Executes a batch of PowerShell commands and writes structured JSONL results
.DESCRIPTION
    This script is invoked by the VS Code extension to run command batches.
    It can run in both non-elevated and elevated (UAC) modes.
    Results are written to a JSONL file (one JSON object per line) for streaming.
.PARAMETER BatchManifestPath
    Path to JSON file containing the batch definition with command IDs and text
.PARAMETER ResultsPath
    Path where JSONL results will be written
.PARAMETER LogPath
    Path where text log will be written
.PARAMETER Elevated
    If specified, indicates this is running in an elevated session
.EXAMPLE
    .\run-batch.ps1 -BatchManifestPath "C:\temp\batch-123.json" -ResultsPath "C:\temp\results-123.jsonl" -LogPath "C:\temp\log-123.txt"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BatchManifestPath,

    [Parameter(Mandatory = $true)]
    [string]$ResultsPath,

    [Parameter(Mandatory = $true)]
    [string]$LogPath,

    [switch]$Elevated
)

# Strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

# Import helper library
$libPath = Join-Path -Path $PSScriptRoot -ChildPath 'lib.ps1'
if (-not (Test-Path -Path $libPath)) {
    Write-Error "Helper library not found: $libPath"
    exit 1
}

. $libPath

# Initialize log
try {
    $logDir = Split-Path -Path $LogPath -Parent
    Confirm-Directory -Path $logDir

    $resultsDir = Split-Path -Path $ResultsPath -Parent
    Confirm-Directory -Path $resultsDir

    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $elevatedLabel = if ($Elevated) { "ELEVATED" } else { "NON-ELEVATED" }
    Write-RunLog -Message "=== PowerShell Command Dashboard Run Started ($elevatedLabel) ===" -LogPath $LogPath -Level INFO
    Write-RunLog -Message "Batch manifest: $BatchManifestPath" -LogPath $LogPath -Level INFO
    Write-RunLog -Message "Results file: $ResultsPath" -LogPath $LogPath -Level INFO
    Write-RunLog -Message "PowerShell version: $($PSVersionTable.PSVersion)" -LogPath $LogPath -Level INFO
}
catch {
    Write-Error "Failed to initialize log: $_"
    exit 1
}

# Load batch manifest
try {
    Write-RunLog -Message "Loading batch manifest..." -LogPath $LogPath -Level INFO

    if (-not (Test-Path -Path $BatchManifestPath)) {
        throw "Batch manifest file not found: $BatchManifestPath"
    }

    $batchContent = Get-Content -Path $BatchManifestPath -Raw -Encoding UTF8
    $batch = $batchContent | ConvertFrom-Json

    if (-not $batch.commands) {
        throw "Batch manifest does not contain 'commands' array"
    }

    $commandCount = $batch.commands.Count
    Write-RunLog -Message "Loaded $commandCount command(s) from manifest" -LogPath $LogPath -Level INFO
}
catch {
    Write-RunLog -Message "Failed to load batch manifest: $_" -LogPath $LogPath -Level ERROR
    Write-Error $_
    exit 1
}

# Execute commands
$successCount = 0
$failedCount = 0
$skippedCount = 0

try {
    foreach ($cmd in $batch.commands) {
        $cmdId = $cmd.id
        $cmdText = $cmd.commandText

        if (-not $cmdId -or -not $cmdText) {
            Write-RunLog -Message "Skipping invalid command entry (missing id or commandText)" -LogPath $LogPath -Level WARN
            $skippedCount++
            continue
        }

        Write-RunLog -Message "Executing: $cmdId" -LogPath $LogPath -Level INFO

        # Execute command and capture result
        $result = Invoke-CommandSafe `
            -CommandId $cmdId `
            -CommandText $cmdText `
            -ResultPath $ResultsPath

        if ($result.status -eq 'success') {
            $successCount++
            Write-RunLog -Message "Success: $cmdId" -LogPath $LogPath -Level INFO
        }
        elseif ($result.status -eq 'failed') {
            $failedCount++
            Write-RunLog -Message "Failed: $cmdId - $($result.message)" -LogPath $LogPath -Level ERROR
        }
        else {
            $skippedCount++
            Write-RunLog -Message "Skipped: $cmdId" -LogPath $LogPath -Level WARN
        }
    }
}
catch {
    Write-RunLog -Message "Batch execution error: $_" -LogPath $LogPath -Level ERROR
    Write-Error $_
    exit 1
}

# Write summary
$summary = @"
=== Batch Execution Complete ===
Total commands: $commandCount
Successful: $successCount
Failed: $failedCount
Skipped: $skippedCount
"@

Write-RunLog -Message $summary -LogPath $LogPath -Level INFO

# Exit with non-zero if any command failed
$exitCode = if ($failedCount -gt 0) { 1 } else { 0 }

Write-RunLog -Message "Exiting with code: $exitCode" -LogPath $LogPath -Level INFO
exit $exitCode
