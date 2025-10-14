#Requires -Version 5.1
#Requires -Modules Pester

<#
.SYNOPSIS
    Runs Pester tests for PowerShell scripts
.DESCRIPTION
    Executes all Pester test files in the tests/powershell directory
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

# Find tests directory
$testsPath = Join-Path -Path $PSScriptRoot -ChildPath '.'

Write-Host "Running Pester tests from: $testsPath" -ForegroundColor Cyan

# Check if Pester is available
$pesterModule = Get-Module -Name Pester -ListAvailable | Sort-Object Version -Descending | Select-Object -First 1

if (-not $pesterModule) {
    Write-Error "Pester module not found. Install it with: Install-Module -Name Pester -Force -SkipPublisherCheck"
    exit 1
}

Write-Host "Using Pester version: $($pesterModule.Version)" -ForegroundColor Green

# Configure Pester
$config = New-PesterConfiguration
$config.Run.Path = $testsPath
$config.Run.Exit = $true
$config.Output.Verbosity = 'Detailed'
$config.TestResult.Enabled = $true
$config.TestResult.OutputPath = Join-Path -Path $PSScriptRoot -ChildPath '..\test-results\pester-results.xml'

# Run tests
Invoke-Pester -Configuration $config
