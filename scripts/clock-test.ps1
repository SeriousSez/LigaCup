$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5099'

$password = (dotnet user-secrets list --project "$PSScriptRoot\..\LigaCup.API" |
    Where-Object { $_ -like 'Admin:Password*' } | ForEach-Object { ($_ -split ' = ')[1] })

$auth = Invoke-RestMethod "$base/api/auth/login" -Method Post -ContentType 'application/json' `
    -Body (@{ username = 'Sez'; password = $password } | ConvertTo-Json)
$headers = @{ Authorization = "Bearer $($auth.token)" }

function Clock($slug, $matchId) {
    $detail = Invoke-RestMethod "$base/api/tournaments/$slug"
    ($detail.matches | Where-Object { $_.id -eq $matchId }).clock
}

Write-Host 'Creating a short-format tournament (2 x 2 minutes)...' -ForegroundColor Cyan
$slug = Invoke-RestMethod "$base/api/admin/tournaments" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{
    name = 'Clock Test'; slug = $null; description = $null; season = 2026
    format = 'GroupsOnly'; status = 'InProgress'
    pointsForWin = 3; pointsForDraw = 1; pointsForLoss = 0
    groupRounds = 1; teamsAdvancingPerGroup = 0
    includeBestThirdPlaced = $false; hasThirdPlacePlayOff = $false
    trackPlayers = $false; trackCards = $false
    periodCount = 2; periodDurationMinutes = 2; breakDurationMinutes = 1
    trackMatchClock = $true; allowTimeouts = $true; useStoppageTime = $true
    tiebreakers = @('GoalDifference')
} | ConvertTo-Json)

$id = (Invoke-RestMethod "$base/api/tournaments/$slug").tournament.id
$summary = (Invoke-RestMethod "$base/api/tournaments/$slug").tournament
Write-Host "  periods=$($summary.periodCount) x $($summary.periodDurationMinutes)min, timeouts=$($summary.allowTimeouts), stoppage=$($summary.useStoppageTime)"

foreach ($name in @('Alpha', 'Beta')) {
    Invoke-RestMethod "$base/api/admin/tournaments/$id/teams" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{
        name = $name; shortName = $null; colorHex = $null; logoUrl = $null; manager = $null; groupId = $null; pointsAdjustment = 0
    } | ConvertTo-Json) | Out-Null
}

Invoke-RestMethod "$base/api/admin/tournaments/$id/fixtures" -Method Post -Headers $headers -ContentType 'application/json' `
    -Body (@{ includeGroupStage = $true; includeKnockoutStage = $false; replaceExisting = $true } | ConvertTo-Json) | Out-Null

$matchId = ((Invoke-RestMethod "$base/api/tournaments/$slug").matches)[0].id

Write-Host 'Before kickoff the clock must be stopped at 0.' -ForegroundColor Cyan
$c = Clock $slug $matchId
Write-Host "  running=$($c.isRunning) minute=$($c.displayMinute)"
if ($c.isRunning -or $c.displayMinute -ne 0) { throw 'Clock should be idle before kickoff.' }

Write-Host 'Pressing Live starts the clock...' -ForegroundColor Cyan
Invoke-RestMethod "$base/api/live/matches/$matchId/status" -Method Put -Headers $headers -ContentType 'application/json' -Body (@{ status = 'Live' } | ConvertTo-Json) | Out-Null
$c = Clock $slug $matchId
if (-not $c.isRunning) { throw 'Clock should be running after pressing Live.' }
Write-Host "  running=$($c.isRunning) period=$($c.period)"

Start-Sleep -Seconds 3
$c = Clock $slug $matchId
Write-Host "  after 3s: elapsedSeconds banked=$($c.periodElapsedSeconds), started=$($c.clockStartedUtc)"

Write-Host 'Half time must freeze the clock...' -ForegroundColor Cyan
Invoke-RestMethod "$base/api/live/matches/$matchId/status" -Method Put -Headers $headers -ContentType 'application/json' -Body (@{ status = 'HalfTime' } | ConvertTo-Json) | Out-Null
$frozen = Clock $slug $matchId
Start-Sleep -Seconds 3
$stillFrozen = Clock $slug $matchId
Write-Host "  banked before=$($frozen.periodElapsedSeconds) after 3s=$($stillFrozen.periodElapsedSeconds) running=$($stillFrozen.isRunning)"
if ($stillFrozen.isRunning) { throw 'Clock must not run during half time.' }
if ($stillFrozen.periodElapsedSeconds -ne $frozen.periodElapsedSeconds) { throw 'Half time advanced the clock.' }

Write-Host 'Second half starts a new period...' -ForegroundColor Cyan
Invoke-RestMethod "$base/api/live/matches/$matchId/status" -Method Put -Headers $headers -ContentType 'application/json' -Body (@{ status = 'Live' } | ConvertTo-Json) | Out-Null
$c = Clock $slug $matchId
Write-Host "  period=$($c.period) minute=$($c.displayMinute) (period 2 starts at minute 2)"
if ($c.period -ne 2) { throw 'Expected period 2 after the interval.' }
if ($c.displayMinute -lt 2) { throw 'Second half should continue from the end of the first period.' }

Write-Host 'A timeout freezes the clock mid-period...' -ForegroundColor Cyan
Invoke-RestMethod "$base/api/live/matches/$matchId/status" -Method Put -Headers $headers -ContentType 'application/json' -Body (@{ status = 'Paused' } | ConvertTo-Json) | Out-Null
$paused = Clock $slug $matchId
Start-Sleep -Seconds 2
$stillPaused = Clock $slug $matchId
if ($stillPaused.isRunning) { throw 'Clock must not run while paused.' }
if ($stillPaused.periodElapsedSeconds -ne $paused.periodElapsedSeconds) { throw 'Pause advanced the clock.' }
Write-Host "  banked stays at $($stillPaused.periodElapsedSeconds)s, running=$($stillPaused.isRunning)"

Write-Host 'Resuming keeps the same period...' -ForegroundColor Cyan
Invoke-RestMethod "$base/api/live/matches/$matchId/status" -Method Put -Headers $headers -ContentType 'application/json' -Body (@{ status = 'Live' } | ConvertTo-Json) | Out-Null
$c = Clock $slug $matchId
if ($c.period -ne 2) { throw 'Resuming from a pause must not start a new period.' }
Write-Host "  period=$($c.period) running=$($c.isRunning)"

Write-Host 'Setting added time...' -ForegroundColor Cyan
Invoke-RestMethod "$base/api/live/matches/$matchId/stoppage" -Method Put -Headers $headers -ContentType 'application/json' -Body (@{ stoppageMinutes = 3 } | ConvertTo-Json) | Out-Null
$c = Clock $slug $matchId
Write-Host "  stoppageMinutes=$($c.stoppageMinutes)"
if ($c.stoppageMinutes -ne 3) { throw 'Added time was not stored.' }

Invoke-RestMethod "$base/api/admin/tournaments/$id" -Method Delete -Headers $headers | Out-Null
Write-Host 'Clock test passed.' -ForegroundColor Green
