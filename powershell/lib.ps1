#Requires -Version 5.1

<#
.SYNOPSIS
    Shared library functions for PowerShell Command Dashboard
.DESCRIPTION
    Provides helper functions for structured output, error handling,
    and JSONL serialization used by run-batch.ps1
#>

# Strict mode for better error detection
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue' # Continue to next command on error

<#
.SYNOPSIS
    Converts an object to a single-line JSON string (JSONL format)
#>
function ConvertTo-JsonLine {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true, ValueFromPipeline = $true)]
        [object]$InputObject,

        [int]$Depth = 6
    )

    process {
        try {
            $json = $InputObject | ConvertTo-Json -Depth $Depth -Compress -ErrorAction Stop
            return $json
        }
        catch {
            Write-Error "Failed to serialize object to JSON: $_"
            return "{}"
        }
    }
}

<#
.SYNOPSIS
    Creates a result object for a command execution
#>
function New-CommandResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$CommandId,

        [Parameter(Mandatory = $true)]
        [ValidateSet('success', 'failed', 'skipped')]
        [string]$Status,

        [Parameter(Mandatory = $true)]
        [datetime]$StartedAt,

        [Parameter(Mandatory = $true)]
        [datetime]$EndedAt,

        [int]$ExitCode = 0,

        [string]$Message = '',

        [string]$RawOutput = '',

        [object]$JsonOutput = $null
    )

    $result = [PSCustomObject]@{
        id        = $CommandId
        status    = $Status
        exitCode  = $ExitCode
        startedAt = $StartedAt.ToUniversalTime().ToString('o')
        endedAt   = $EndedAt.ToUniversalTime().ToString('o')
        message   = $Message
        raw       = $RawOutput
        json      = $JsonOutput
    }

    return $result
}

<#
.SYNOPSIS
    Invokes a PowerShell command and captures structured output
#>
function Invoke-CommandSafe {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$CommandId,

        [Parameter(Mandatory = $true)]
        [string]$CommandText,

        [string]$ResultPath
    )

    $startTime = Get-Date
    $rawOutput = ''
    $jsonOutput = $null
    $exitCode = 0
    $status = 'success'
    $message = ''

    try {
        Write-Verbose "Executing command: $CommandId"

        # Execute the command and capture output
        $output = Invoke-Expression -Command $CommandText -ErrorAction Stop 2>&1

        # Capture raw text output
        if ($output) {
            $rawOutput = $output | Out-String

            # Try to parse as JSON if it looks like JSON
            if ($rawOutput.Trim() -match '^\s*[\{\[]') {
                try {
                    $jsonOutput = $rawOutput | ConvertFrom-Json -ErrorAction Stop
                }
                catch {
                    # Not valid JSON, keep as raw text
                    Write-Verbose "Output is not valid JSON: $_"
                }
            }
        }

        $message = "Completed successfully"
        $exitCode = 0
        $status = 'success'
    }
    catch {
        Write-Error "Command failed: $_"
        $rawOutput = $_.Exception.Message
        $message = "Error: $($_.Exception.Message)"
        $exitCode = 1
        $status = 'failed'
    }

    $endTime = Get-Date

    # Create result object
    $result = New-CommandResult `
        -CommandId $CommandId `
        -Status $status `
        -StartedAt $startTime `
        -EndedAt $endTime `
        -ExitCode $exitCode `
        -Message $message `
        -RawOutput $rawOutput `
        -JsonOutput $jsonOutput

    # Write result to JSONL file if path provided
    if ($ResultPath) {
        try {
            $jsonLine = $result | ConvertTo-JsonLine
            Add-Content -Path $ResultPath -Value $jsonLine -Encoding UTF8 -ErrorAction Stop
            Write-Verbose "Result written to: $ResultPath"
        }
        catch {
            Write-Error "Failed to write result to file: $_"
        }
    }

    return $result
}

<#
.SYNOPSIS
    Writes a log message to a text log file
#>
function Write-RunLog {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message,

        [Parameter(Mandatory = $true)]
        [string]$LogPath,

        [ValidateSet('INFO', 'WARN', 'ERROR')]
        [string]$Level = 'INFO'
    )

    $timestamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    $logLine = "[$timestamp] [$Level] $Message"

    try {
        Add-Content -Path $LogPath -Value $logLine -Encoding UTF8 -ErrorAction Stop
    }
    catch {
        Write-Error "Failed to write to log file: $_"
    }
}

<#
.SYNOPSIS
    Confirms a directory exists, creating it if necessary
#>
function Confirm-Directory {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -Path $Path -PathType Container)) {
        try {
            New-Item -Path $Path -ItemType Directory -Force -ErrorAction Stop | Out-Null
            Write-Verbose "Created directory: $Path"
        }
        catch {
            Write-Error "Failed to create directory '$Path': $_"
            throw
        }
    }
}

# Export functions for use in other scripts
# Note: When dot-sourcing this file (. .\lib.ps1), all functions are automatically available.
# Export-ModuleMember is only needed if this were a .psm1 module file.
