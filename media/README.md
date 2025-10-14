# Media Assets

This directory contains visual assets for the PowerShell Command Dashboard extension.

## Required Files

- `icon.png` - Extension icon (128x128px)
- `banner.png` - Marketplace banner (1200x622px)
- `screenshot-dashboard.png` - Dashboard view
- `screenshot-results.png` - Results view with JSONL output
- `screenshot-elevation.png` - UAC elevation prompt

## Placeholder Generation

Until proper assets are created, generate placeholders:

```powershell
# Create simple placeholder images using .NET
Add-Type -AssemblyName System.Drawing

function New-PlaceholderImage {
    param($Width, $Height, $Text, $OutputPath)

    $bitmap = New-Object System.Drawing.Bitmap($Width, $Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.FillRectangle([System.Drawing.Brushes]::DarkBlue, 0, 0, $Width, $Height)

    $font = New-Object System.Drawing.Font("Arial", 20)
    $brush = [System.Drawing.Brushes]::White
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    $rect = New-Object System.Drawing.RectangleF(0, 0, $Width, $Height)
    $graphics.DrawString($Text, $font, $brush, $rect, $format)

    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
}

# Generate placeholders
New-PlaceholderImage -Width 128 -Height 128 -Text "PS" -OutputPath ".\icon.png"
New-PlaceholderImage -Width 1200 -Height 622 -Text "PowerShell Dashboard" -OutputPath ".\banner.png"
New-PlaceholderImage -Width 800 -Height 600 -Text "Dashboard View" -OutputPath ".\screenshot-dashboard.png"
New-PlaceholderImage -Width 800 -Height 600 -Text "Results View" -OutputPath ".\screenshot-results.png"
New-PlaceholderImage -Width 800 -Height 600 -Text "Elevation" -OutputPath ".\screenshot-elevation.png"
```

## Design Guidelines

- Use VS Code's color palette
- Include PowerShell branding elements
- Keep designs clean and professional
- Ensure readability at small sizes