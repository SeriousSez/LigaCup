$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5099'

$auth = Invoke-RestMethod "$base/api/auth/login" -Method Post -ContentType 'application/json' `
    -Body (@{ username = 'admin'; password = 'ligacup-local-dev' } | ConvertTo-Json)
$headers = @{ Authorization = "Bearer $($auth.token)" }

$slug = Invoke-RestMethod "$base/api/admin/tournaments" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{
        name = 'Liga Cup'; slug = $null; description = 'The annual back garden showdown'; season = 2026
        format = 'GroupsThenKnockout'; status = 'InProgress'
        pointsForWin = 3; pointsForDraw = 1; pointsForLoss = 0
        groupRounds = 1; teamsAdvancingPerGroup = 2
        includeBestThirdPlaced = $false; hasThirdPlacePlayOff = $true
        trackPlayers = $true; trackCards = $true; matchDurationMinutes = 90
        tiebreakers = @('GoalDifference', 'GoalsScored', 'HeadToHeadPoints', 'TeamName')
    } | ConvertTo-Json)

$id = (Invoke-RestMethod "$base/api/tournaments/$slug").tournament.id

$groups = @{}
foreach ($name in @('Group A', 'Group B')) {
    $groups[$name] = (Invoke-RestMethod "$base/api/admin/tournaments/$id/groups" -Method Post -Headers $headers `
            -ContentType 'application/json' -Body (@{ name = $name; sortOrder = $groups.Count } | ConvertTo-Json)).id
}

$roster = @(
    @{ name = 'Real Sofa'; short = 'SOF'; group = 'Group A'; players = @('Emre', 'Kaan', 'Deniz') },
    @{ name = 'Atletico Garage'; short = 'GAR'; group = 'Group A'; players = @('Baris', 'Yusuf') },
    @{ name = 'FC Kitchen'; short = 'KIT'; group = 'Group A'; players = @('Mert', 'Arda') },
    @{ name = 'Deportivo Driveway'; short = 'DRW'; group = 'Group A'; players = @('Onur') },
    @{ name = 'Inter Balcony'; short = 'BAL'; group = 'Group B'; players = @('Selim', 'Kerem') },
    @{ name = 'Sporting Shed'; short = 'SHD'; group = 'Group B'; players = @('Tolga') },
    @{ name = 'Bayern Basement'; short = 'BAS'; group = 'Group B'; players = @('Efe', 'Can') },
    @{ name = 'AC Attic'; short = 'ATT'; group = 'Group B'; players = @('Umut') }
)

$teams = @{}
$players = @{}
foreach ($entry in $roster) {
    $team = Invoke-RestMethod "$base/api/admin/tournaments/$id/teams" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{
            name = $entry.name; shortName = $entry.short; colorHex = $null; logoUrl = $null; manager = $null
            groupId = $groups[$entry.group]; pointsAdjustment = 0
        } | ConvertTo-Json)
    $teams[$entry.name] = $team.id

    foreach ($playerName in $entry.players) {
        $player = Invoke-RestMethod "$base/api/admin/tournaments/players" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{
                teamId = $team.id; name = $playerName; shirtNumber = $null; position = $null; isActive = $true
            } | ConvertTo-Json)
        $players["$($entry.name)|$playerName"] = $player.id
    }
}

Invoke-RestMethod "$base/api/admin/tournaments/$id/fixtures" -Method Post -Headers $headers -ContentType 'application/json' `
    -Body (@{ includeGroupStage = $true; includeKnockoutStage = $true; replaceExisting = $true } | ConvertTo-Json) | Out-Null

$detail = Invoke-RestMethod "$base/api/tournaments/$slug"
$groupMatches = @($detail.matches | Where-Object { $_.stage -eq 'Group' })

# Play out most of the group stage so the tables have something to show.
$scores = @(@(2, 1), @(0, 0), @(3, 1), @(1, 2), @(2, 2), @(4, 0), @(1, 0), @(2, 3), @(0, 1), @(3, 3))
for ($i = 0; $i -lt $scores.Count -and $i -lt $groupMatches.Count; $i++) {
    $m = $groupMatches[$i]
    Invoke-RestMethod "$base/api/live/matches/$($m.id)/score" -Method Put -Headers $headers -ContentType 'application/json' `
        -Body (@{ homeScore = $scores[$i][0]; awayScore = $scores[$i][1]; homePenalties = $null; awayPenalties = $null } | ConvertTo-Json) | Out-Null
    Invoke-RestMethod "$base/api/live/matches/$($m.id)/status" -Method Put -Headers $headers -ContentType 'application/json' `
        -Body (@{ status = 'Finished' } | ConvertTo-Json) | Out-Null
}

# Leave one match in progress so the live view has something moving.
if ($groupMatches.Count -gt $scores.Count) {
    $liveMatch = $groupMatches[$scores.Count]
    Invoke-RestMethod "$base/api/live/matches/$($liveMatch.id)/status" -Method Put -Headers $headers -ContentType 'application/json' `
        -Body (@{ status = 'Live' } | ConvertTo-Json) | Out-Null
    Invoke-RestMethod "$base/api/live/matches/$($liveMatch.id)/score/home/1" -Method Post -Headers $headers | Out-Null
}

# A few goalscorers for the top scorer table.
$scorerMatch = $groupMatches[0]
foreach ($goal in @(
        @{ team = 'Real Sofa'; player = 'Emre'; minute = 12 },
        @{ team = 'Real Sofa'; player = 'Kaan'; minute = 55 },
        @{ team = 'Real Sofa'; player = 'Emre'; minute = 78 })) {
    if ($scorerMatch.homeTeamId -eq $teams[$goal.team] -or $scorerMatch.awayTeamId -eq $teams[$goal.team]) {
        Invoke-RestMethod "$base/api/live/matches/$($scorerMatch.id)/events" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{
                teamId = $teams[$goal.team]; playerId = $players["$($goal.team)|$($goal.player)"]; type = 'Goal'; minute = $goal.minute; note = $null
            } | ConvertTo-Json) | Out-Null
    }
}

Invoke-RestMethod "$base/api/admin/tournaments/$id/knockout/seed" -Method Post -Headers $headers | Out-Null

Write-Host "Seeded '$slug'." -ForegroundColor Green
