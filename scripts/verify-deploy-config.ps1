# Runs the workflow's config generation locally so a broken script is caught before a deploy.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

$defaultWebOrigin = 'https://ligacup.sezginsahin.dk'
$defaultApiOrigin = 'https://ligacup.api.sezginsahin.dk'

$webOrigin = if ([string]::IsNullOrWhiteSpace($env:WEB_ORIGIN)) { $defaultWebOrigin } else { $env:WEB_ORIGIN }
$apiOrigin = if ([string]::IsNullOrWhiteSpace($env:API_ORIGIN)) { $defaultApiOrigin } else { $env:API_ORIGIN }
$apiOrigin = $apiOrigin.TrimEnd('/')
$apiHost = ([Uri]$apiOrigin).Host

Write-Host "Web origin : $webOrigin"
Write-Host "API origin : $apiOrigin"
Write-Host "AllowedHosts: $apiHost"

$config = @{
    Database          = @{ Provider = 'Sqlite' }
    ConnectionStrings = @{ LigaCupSqlite = 'Data Source=App_Data/ligacup.db' }
    Jwt               = @{ Issuer = 'LigaCup'; Audience = 'LigaCup.Clients'; Key = 'x' * 40; ExpiryMinutes = 720 }
    Admin             = @{ Username = 'Sez'; Password = 'placeholder'; Email = 'placeholder' }
    Cors              = @{ AllowedOrigins = @($webOrigin) }
    Logging           = @{ LogLevel = @{ Default = 'Warning'; 'LigaCup' = 'Information' } }
    AllowedHosts      = $apiHost
}

$json = $config | ConvertTo-Json -Depth 6
$parsed = $json | ConvertFrom-Json
if ($parsed.Cors.AllowedOrigins -ne $webOrigin) { throw 'CORS origin did not round-trip.' }
if ($parsed.AllowedHosts -ne $apiHost) { throw 'AllowedHosts did not round-trip.' }
Write-Host 'appsettings.Production.json generation is valid.' -ForegroundColor Green

$lines = @(
    'export const environment = {',
    '    production: true,',
    "    apiBaseUrl: '$apiOrigin',",
    '};'
)

$target = Join-Path $root 'ligacup-web\src\environments\environment.production.ts'
Set-Content -Path $target -Value $lines -Encoding UTF8
Write-Host "Wrote $target" -ForegroundColor Green
Get-Content $target
