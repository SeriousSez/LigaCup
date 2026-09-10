$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5099'

function Show([string]$label, $value) {
    Write-Host "  $label" -ForegroundColor Gray -NoNewline
    Write-Host " $value"
}

Write-Host 'Signing in...' -ForegroundColor Cyan
$auth = Invoke-RestMethod "$base/api/auth/login" -Method Post -ContentType 'application/json' `
    -Body (@{ username = 'admin'; password = 'ligacup-local-dev' } | ConvertTo-Json)
$headers = @{ Authorization = "Bearer $($auth.token)" }
Show 'user' $auth.username

Write-Host 'Creating tournament...' -ForegroundColor Cyan
$slug = Invoke-RestMethod "$base/api/admin/tournaments" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{
        name                   = 'Liga Cup Smoke Test'
        slug                   = $null
        description            = 'Automated end to end check'
        season                 = 2026
        format                 = 'GroupsThenKnockout'
        status                 = 'InProgress'
        pointsForWin           = 3
        pointsForDraw          = 1
        pointsForLoss          = 0
        groupRounds            = 1
        teamsAdvancingPerGroup = 2
        includeBestThirdPlaced = $false
        hasThirdPlacePlayOff   = $true
        trackPlayers           = $true
        trackCards             = $true
        matchDurationMinutes   = 90
        tiebreakers            = @('GoalDifference', 'GoalsScored', 'HeadToHeadPoints', 'TeamName')
    } | ConvertTo-Json)
Show 'slug' $slug

$detail = Invoke-RestMethod "$base/api/tournaments/$slug"
$id = $detail.tournament.id

Write-Host 'Adding groups and teams...' -ForegroundColor Cyan
$groupA = Invoke-RestMethod "$base/api/admin/tournaments/$id/groups" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{ name = 'Group A'; sortOrder = 0 } | ConvertTo-Json)
$groupB = Invoke-RestMethod "$base/api/admin/tournaments/$id/groups" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{ name = 'Group B'; sortOrder = 1 } | ConvertTo-Json)

$teams = @{}
foreach ($entry in @(
        @{ name = 'Real Sofa'; group = $groupA.id }, @{ name = 'Atletico Garage'; group = $groupA.id },
        @{ name = 'FC Kitchen'; group = $groupA.id }, @{ name = 'Deportivo Driveway'; group = $groupA.id },
        @{ name = 'Inter Balcony'; group = $groupB.id }, @{ name = 'Sporting Shed'; group = $groupB.id },
        @{ name = 'Bayern Basement'; group = $groupB.id }, @{ name = 'AC Attic'; group = $groupB.id })) {
    $team = Invoke-RestMethod "$base/api/admin/tournaments/$id/teams" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{
            name = $entry.name; shortName = $null; colorHex = $null; logoUrl = $null; manager = $null
            groupId = $entry.group; pointsAdjustment = 0
        } | ConvertTo-Json)
    $teams[$entry.name] = $team.id
}
Show 'teams' $teams.Count

Write-Host 'Adding a player...' -ForegroundColor Cyan
$player = Invoke-RestMethod "$base/api/admin/tournaments/players" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{
        teamId = $teams['Real Sofa']; name = 'Sezgin'; shirtNumber = 10; position = 'ST'; isActive = $true
    } | ConvertTo-Json)

Write-Host 'Generating fixtures...' -ForegroundColor Cyan
$generated = Invoke-RestMethod "$base/api/admin/tournaments/$id/fixtures" -Method Post -Headers $headers -ContentType 'application/json' `
    -Body (@{ includeGroupStage = $true; includeKnockoutStage = $true; replaceExisting = $true } | ConvertTo-Json)
Show 'fixtures' $generated.generated

$detail = Invoke-RestMethod "$base/api/tournaments/$slug"
$groupMatches = @($detail.matches | Where-Object { $_.stage -eq 'Group' })
Show 'group matches' $groupMatches.Count
Show 'knockout ties' (@($detail.bracket).Count)

Write-Host 'Playing a match live...' -ForegroundColor Cyan
$match = $groupMatches[0]
Invoke-RestMethod "$base/api/live/matches/$($match.id)/status" -Method Put -Headers $headers -ContentType 'application/json' -Body (@{ status = 'Live' } | ConvertTo-Json) | Out-Null
Invoke-RestMethod "$base/api/live/matches/$($match.id)/score/home/1" -Method Post -Headers $headers | Out-Null
$after = Invoke-RestMethod "$base/api/live/matches/$($match.id)/score/home/1" -Method Post -Headers $headers
Show 'live score' "$($after.homeTeamName) $($after.homeScore)-$($after.awayScore) $($after.awayTeamName) at minute $($after.liveMinute)"

Invoke-RestMethod "$base/api/live/matches/$($match.id)/status" -Method Put -Headers $headers -ContentType 'application/json' -Body (@{ status = 'Finished' } | ConvertTo-Json) | Out-Null

Write-Host 'Checking the table updated itself...' -ForegroundColor Cyan
$detail = Invoke-RestMethod "$base/api/tournaments/$slug"
$table = $detail.tables | Where-Object { $_.groupName -eq 'Group A' }
$table.rows | ForEach-Object { Show "$($_.position). $($_.teamName)" "P$($_.played) W$($_.won) D$($_.drawn) L$($_.lost) GD$($_.goalDifference) Pts$($_.points)" }

$leader = $table.rows[0]
if ($leader.points -ne 3 -or $leader.played -ne 1) { throw "Expected the winner to sit on 3 points from 1 game, got $($leader.points) from $($leader.played)." }

Write-Host 'Recording a goal against a player...' -ForegroundColor Cyan
$second = $groupMatches | Where-Object { $_.homeTeamId -eq $teams['Real Sofa'] -or $_.awayTeamId -eq $teams['Real Sofa'] } | Select-Object -First 1
Invoke-RestMethod "$base/api/live/matches/$($second.id)/events" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{
        teamId = $teams['Real Sofa']; playerId = $player.id; type = 'Goal'; minute = 23; note = $null
    } | ConvertTo-Json) | Out-Null

$detail = Invoke-RestMethod "$base/api/tournaments/$slug"
$detail.topScorers | ForEach-Object { Show 'scorer' "$($_.playerName) ($($_.teamName)) $($_.goals) goals" }
if (@($detail.topScorers).Count -lt 1) { throw 'Expected the goal to appear in the scorer list.' }

Write-Host 'Seeding the knockout bracket from the tables...' -ForegroundColor Cyan
$seeded = Invoke-RestMethod "$base/api/admin/tournaments/$id/knockout/seed" -Method Post -Headers $headers
Show 'ties seeded' $seeded.seeded

$detail = Invoke-RestMethod "$base/api/tournaments/$slug"
$detail.bracket | ForEach-Object { Show $_.stageName "$($_.match.homeTeamName) v $($_.match.awayTeamName)" }

Write-Host 'Cleaning up...' -ForegroundColor Cyan
Invoke-RestMethod "$base/api/admin/tournaments/$id" -Method Delete -Headers $headers | Out-Null

Write-Host 'Smoke test passed.' -ForegroundColor Green
