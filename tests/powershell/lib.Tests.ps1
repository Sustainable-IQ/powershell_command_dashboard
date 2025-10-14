#Requires -Modules Pester

BeforeAll {
    # Import the module under test
    $libPath = Join-Path -Path $PSScriptRoot -ChildPath '..\..\powershell\lib.ps1'
    . $libPath
}

Describe 'ConvertTo-JsonLine' {
    It 'Should convert object to single-line JSON' {
        $obj = @{ name = 'test'; value = 123 }
        $result = ConvertTo-JsonLine -InputObject $obj

        $result | Should -Not -BeNullOrEmpty
        $result | Should -BeOfType [string]
        $result | Should -Not -Match '\n' # Should be single line
    }

    It 'Should handle arrays' {
        $arr = @(1, 2, 3)
        $result = ConvertTo-JsonLine -InputObject $arr

        $result | Should -Not -BeNullOrEmpty
        $result | Should -BeLike '*[*]*'
    }

    It 'Should handle nested objects' {
        $obj = @{
            parent = @{
                child = 'value'
            }
        }
        $result = ConvertTo-JsonLine -InputObject $obj -Depth 3

        $result | Should -Not -BeNullOrEmpty
        $result | Should -Match 'child'
    }
}

Describe 'New-CommandResult' {
    It 'Should create a valid result object' {
        $start = Get-Date
        $end = $start.AddSeconds(2)

        $result = New-CommandResult `
            -CommandId 'test-cmd' `
            -Status 'success' `
            -StartedAt $start `
            -EndedAt $end `
            -ExitCode 0 `
            -Message 'OK' `
            -RawOutput 'output text'

        $result | Should -Not -BeNullOrEmpty
        $result.id | Should -Be 'test-cmd'
        $result.status | Should -Be 'success'
        $result.exitCode | Should -Be 0
        $result.message | Should -Be 'OK'
        $result.raw | Should -Be 'output text'
    }

    It 'Should format timestamps in ISO 8601' {
        $start = Get-Date
        $end = $start.AddSeconds(1)

        $result = New-CommandResult `
            -CommandId 'test-cmd' `
            -Status 'success' `
            -StartedAt $start `
            -EndedAt $end

        $result.startedAt | Should -Match '^\d{4}-\d{2}-\d{2}T'
        $result.endedAt | Should -Match '^\d{4}-\d{2}-\d{2}T'
    }
}

Describe 'Invoke-CommandSafe' {
    It 'Should execute a simple command successfully' {
        $result = Invoke-CommandSafe `
            -CommandId 'test-cmd' `
            -CommandText 'Write-Output "Hello"'

        $result | Should -Not -BeNullOrEmpty
        $result.status | Should -Be 'success'
        $result.exitCode | Should -Be 0
        $result.raw | Should -BeLike '*Hello*'
    }

    It 'Should capture command failure' {
        $result = Invoke-CommandSafe `
            -CommandId 'test-cmd' `
            -CommandText 'throw "Test error"'

        $result | Should -Not -BeNullOrEmpty
        $result.status | Should -Be 'failed'
        $result.exitCode | Should -Be 1
        $result.message | Should -Match 'Error'
    }

    It 'Should write result to file if path provided' {
        $tempFile = [System.IO.Path]::GetTempFileName()

        try {
            $result = Invoke-CommandSafe `
                -CommandId 'test-cmd' `
                -CommandText 'Write-Output "Test"' `
                -ResultPath $tempFile

            Test-Path $tempFile | Should -Be $true
            $content = Get-Content -Path $tempFile -Raw
            $content | Should -Not -BeNullOrEmpty
            $content | Should -BeLike '*test-cmd*'
        }
        finally {
            if (Test-Path $tempFile) {
                Remove-Item $tempFile -Force
            }
        }
    }
}

Describe 'Confirm-Directory' {
    It 'Should create directory if it does not exist' {
        $tempDir = Join-Path -Path ([System.IO.Path]::GetTempPath()) -ChildPath "pester-test-$(Get-Random)"

        try {
            Test-Path $tempDir | Should -Be $false

            Confirm-Directory -Path $tempDir

            Test-Path $tempDir | Should -Be $true
        }
        finally {
            if (Test-Path $tempDir) {
                Remove-Item $tempDir -Force -Recurse
            }
        }
    }

    It 'Should not fail if directory already exists' {
        $tempDir = [System.IO.Path]::GetTempPath()

        { Confirm-Directory -Path $tempDir } | Should -Not -Throw
    }
}
