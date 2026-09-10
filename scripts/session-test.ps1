$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5099'

$password = (dotnet user-secrets list --project "$PSScriptRoot\..\LigaCup.API" |
    Where-Object { $_ -like 'Admin:Password*' } | ForEach-Object { ($_ -split ' = ')[1] })

function Show([string]$label, $value) {
    Write-Host "  $label" -ForegroundColor Gray -NoNewline
    Write-Host " $value"
}

function Invoke-Refresh($token) {
    Invoke-RestMethod "$base/api/auth/refresh" -Method Post -ContentType 'application/json' `
        -Body (@{ refreshToken = $token } | ConvertTo-Json)
}

function Assert-Rejected([scriptblock]$action, [string]$label) {
    $failed = $false
    $status = 'unknown'
    try { & $action | Out-Null }
    catch {
        $failed = $true
        if ($_.Exception.PSObject.Properties.Name -contains 'Response' -and $_.Exception.Response) {
            try { $status = [int]$_.Exception.Response.StatusCode } catch { $status = 'unreadable' }
        }
    }
    if (-not $failed) { throw "Expected '$label' to be rejected, but it succeeded." }
    Show "$label rejected with" $status
}

Write-Host 'Signing in...' -ForegroundColor Cyan
$login = Invoke-RestMethod "$base/api/auth/login" -Method Post -ContentType 'application/json' `
    -Body (@{ username = 'Sez'; password = $password } | ConvertTo-Json)
Show 'access token expires' $login.expiresUtc
Show 'refresh token issued' ($login.refreshToken.Length -gt 0)

Write-Host 'Refreshing rotates the token...' -ForegroundColor Cyan
$rotated = Invoke-Refresh $login.refreshToken
Show 'new access token' ($rotated.token -ne $login.token)
Show 'new refresh token' ($rotated.refreshToken -ne $login.refreshToken)

Write-Host 'A used refresh token cannot be replayed...' -ForegroundColor Cyan
Assert-Rejected { Invoke-Refresh $login.refreshToken } 'replayed refresh token'

Write-Host 'The rotated token still works and the session continues...' -ForegroundColor Cyan
$again = Invoke-Refresh $rotated.refreshToken
Show 'signed in as' $again.username

Write-Host 'Logging out revokes the session...' -ForegroundColor Cyan
Invoke-RestMethod "$base/api/auth/logout" -Method Post -ContentType 'application/json' `
    -Body (@{ refreshToken = $again.refreshToken } | ConvertTo-Json) | Out-Null
Assert-Rejected { Invoke-Refresh $again.refreshToken } 'revoked refresh token'

Write-Host 'Nonsense tokens are rejected...' -ForegroundColor Cyan
Assert-Rejected { Invoke-Refresh 'not-a-real-token' } 'unknown refresh token'

Write-Host 'Refresh token test passed.' -ForegroundColor Green
