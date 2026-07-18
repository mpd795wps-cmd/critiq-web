$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if (-not (Test-Path -LiteralPath "package.json")) {
    throw "package.json was not found."
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$editorConfig = @"
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true

[*.{js,jsx,ts,tsx,json,css,md}]
indent_style = space
indent_size = 2
"@

$gitAttributes = @"
* text=auto
*.js text eol=lf
*.jsx text eol=lf
*.ts text eol=lf
*.tsx text eol=lf
*.json text eol=lf
*.css text eol=lf
*.md text eol=lf
*.ps1 text eol=crlf
"@

[System.IO.File]::WriteAllText(
    (Join-Path $projectRoot ".editorconfig"),
    $editorConfig,
    $utf8NoBom
)

[System.IO.File]::WriteAllText(
    (Join-Path $projectRoot ".gitattributes"),
    $gitAttributes,
    $utf8NoBom
)

Write-Host "CRITIQ setup completed." -ForegroundColor Green