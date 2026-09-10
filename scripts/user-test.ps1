$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5099'

$password = (dotnet user-secrets list --project "$PSScriptRoot\..\LigaCup.API" |
    Where-Object { $_ -like 'Admin:Password*' } | ForEach-Object { ($_ -split ' = ')[1] })

function Login($identifier, $secret) {
    Invoke-RestMethod "$base/api/auth/login" -Method Post -ContentType 'application/json' `
        -Body (@{ username = $identifier; password = $secret } | ConvertTo-Json)
}

function Show([string]$label, $value) {
    Write-Host "  $label" -ForegroundColor Gray -NoNewline
    Write-Host " $value"
}

# Windows PowerShell 5.1 has no HttpResponseException, so the status is read off the raw response.
function Expect-Failure([scriptblock]$action, [string]$label) {
    $failed = $false
    $status = 'unknown'

    try {
        & $action | Out-Null
    }
    catch {
        $failed = $true
        if ($_.Exception.PSObject.Properties.Name -contains 'Response' -and $_.Exception.Response) {
            try { $status = [int]$_.Exception.Response.StatusCode } catch { $status = 'unreadable' }
        }
    }

    if (-not $failed) { throw "Expected '$label' to be rejected, but it succeeded." }
    Show "$label rejected with" $status
}

function Get-Users($headers) {
    Invoke-RestMethod "$base/api/admin/users" -Headers $headers
}

Write-Host 'Signing in with the username...' -ForegroundColor Cyan
$byUsername = Login 'Sez' $password
Show 'role' $byUsername.role

Write-Host 'Signing in with the email address...' -ForegroundColor Cyan
Show 'user' (Login 'moyumbnm@hotmail.com' $password).username

Write-Host 'Signing in with different casing...' -ForegroundColor Cyan
Show 'user' (Login 'SEZ' $password).username

$headers = @{ Authorization = "Bearer $($byUsername.token)" }

Write-Host 'Creating an editor and a viewer...' -ForegroundColor Cyan
foreach ($account in @(
        @{ username = 'testeditor'; role = 'Editor' },
        @{ username = 'testviewer'; role = 'Viewer' })) {
    $existing = (Get-Users $headers) | Where-Object { $_.username -eq $account.username }
    if ($existing) { Invoke-RestMethod "$base/api/admin/users/$($existing.id)" -Method Delete -Headers $headers | Out-Null }

    $created = Invoke-RestMethod "$base/api/admin/users" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{
            username = $account.username; email = "$($account.username)@example.com"; password = 'test-password-123'; role = $account.role
        } | ConvertTo-Json)
    Show 'created' "$($created.username) as $($created.role)"
}

Write-Host 'Input is validated...' -ForegroundColor Cyan
Expect-Failure { Invoke-RestMethod "$base/api/admin/users" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{
            username = 'shorty'; email = $null; password = 'abc'; role = 'Viewer'
        } | ConvertTo-Json) } 'short password'

Expect-Failure { Invoke-RestMethod "$base/api/admin/users" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{
            username = 'sez'; email = $null; password = 'another-password'; role = 'Viewer'
        } | ConvertTo-Json) } 'duplicate username'

Write-Host 'An editor may score but not manage users...' -ForegroundColor Cyan
$editor = Login 'testeditor' 'test-password-123'
$editorHeaders = @{ Authorization = "Bearer $($editor.token)" }
Expect-Failure { Get-Users $editorHeaders } 'editor listing users'

$tournaments = Invoke-RestMethod "$base/api/tournaments"
if ($tournaments.Count -gt 0) {
    $detail = Invoke-RestMethod "$base/api/tournaments/$($tournaments[0].slug)"
    $matchId = $detail.matches[0].id
    Invoke-RestMethod "$base/api/live/matches/$matchId/score/home/1" -Method Post -Headers $editorHeaders | Out-Null
    Invoke-RestMethod "$base/api/live/matches/$matchId/score/home/-1" -Method Post -Headers $editorHeaders | Out-Null
    Show 'editor scoring' 'allowed'

    Write-Host 'A viewer may not change anything...' -ForegroundColor Cyan
    $viewer = Login 'testviewer' 'test-password-123'
    $viewerHeaders = @{ Authorization = "Bearer $($viewer.token)" }
    Expect-Failure { Invoke-RestMethod "$base/api/live/matches/$matchId/score/home/1" -Method Post -Headers $viewerHeaders } 'viewer scoring'
    Expect-Failure { Get-Users $viewerHeaders } 'viewer listing users'
}

Write-Host 'The last administrator is protected...' -ForegroundColor Cyan
$me = (Get-Users $headers) | Where-Object { $_.username -eq 'Sez' }
Expect-Failure { Invoke-RestMethod "$base/api/admin/users/$($me.id)" -Method Put -Headers $headers -ContentType 'application/json' `
        -Body (@{ email = $me.email; role = 'Viewer'; isActive = $true } | ConvertTo-Json) } 'demoting the last admin'
Expect-Failure { Invoke-RestMethod "$base/api/admin/users/$($me.id)" -Method Delete -Headers $headers } 'deleting yourself'

Write-Host 'Resetting a password and signing in with it...' -ForegroundColor Cyan
$target = (Get-Users $headers) | Where-Object { $_.username -eq 'testviewer' }
Invoke-RestMethod "$base/api/admin/users/$($target.id)/password" -Method Put -Headers $headers -ContentType 'application/json' `
    -Body (@{ password = 'changed-password-9' } | ConvertTo-Json) | Out-Null
Show 'signed in as' (Login 'testviewer' 'changed-password-9').username

Write-Host 'A deactivated user cannot sign in...' -ForegroundColor Cyan
Invoke-RestMethod "$base/api/admin/users/$($target.id)" -Method Put -Headers $headers -ContentType 'application/json' `
    -Body (@{ email = $target.email; role = 'Viewer'; isActive = $false } | ConvertTo-Json) | Out-Null
Expect-Failure { Login 'testviewer' 'changed-password-9' } 'deactivated sign in'

Write-Host 'Cleaning up...' -ForegroundColor Cyan
foreach ($name in @('testeditor', 'testviewer')) {
    $user = (Get-Users $headers) | Where-Object { $_.username -eq $name }
    if ($user) { Invoke-RestMethod "$base/api/admin/users/$($user.id)" -Method Delete -Headers $headers | Out-Null }
}

Write-Host 'User management test passed.' -ForegroundColor Green
