using LigaCup.ApplicationService.Contracts;
using LigaCup.ApplicationService.Mapping;
using LigaCup.ApplicationService.Security;
using LigaCup.Domain.Entities;
using LigaCup.Domain.Enums;
using LigaCup.Domain.Scheduling;
using LigaCup.Domain.Standings;
using LigaCup.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace LigaCup.ApplicationService.Services;

public class TournamentService(LigaCupContext dbContext)
{
    public async Task<IReadOnlyList<TournamentSummaryDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var tournaments = await dbContext.Tournaments
            .AsNoTracking()
            .OrderByDescending(tournament => tournament.Season)
            .ThenByDescending(tournament => tournament.CreatedUtc)
            .Select(tournament => new
            {
                Tournament = tournament,
                TeamCount = tournament.Teams.Count,
                MatchCount = tournament.Matches.Count
            })
            .ToListAsync(cancellationToken);

        return tournaments
            .Select(item => DtoMapper.ToSummary(item.Tournament, item.TeamCount, item.MatchCount))
            .ToList();
    }

    public Task<Tournament?> LoadGraphAsync(string slug, CancellationToken cancellationToken = default) =>
        BuildGraphQuery().FirstOrDefaultAsync(tournament => tournament.Slug == slug, cancellationToken);

    public Task<Tournament?> LoadGraphAsync(int id, CancellationToken cancellationToken = default) =>
        BuildGraphQuery().FirstOrDefaultAsync(tournament => tournament.Id == id, cancellationToken);

    private IQueryable<Tournament> BuildGraphQuery() => dbContext.Tournaments
        .AsNoTracking()
        .AsSplitQuery()
        .Include(tournament => tournament.Groups)
        .Include(tournament => tournament.Teams).ThenInclude(team => team.Group)
        .Include(tournament => tournament.Teams).ThenInclude(team => team.Players)
        .Include(tournament => tournament.Matches).ThenInclude(match => match.Group)
        .Include(tournament => tournament.Matches).ThenInclude(match => match.HomeTeam)
        .Include(tournament => tournament.Matches).ThenInclude(match => match.AwayTeam)
        .Include(tournament => tournament.Matches).ThenInclude(match => match.Events).ThenInclude(matchEvent => matchEvent.Team)
        .Include(tournament => tournament.Matches).ThenInclude(match => match.Events).ThenInclude(matchEvent => matchEvent.Player);

    public TournamentDetailDto BuildDetail(Tournament tournament)
    {
        var teams = tournament.Teams.OrderBy(team => team.SortOrder).ThenBy(team => team.Name).ToList();
        var matches = tournament.Matches
            .OrderBy(match => match.Stage)
            .ThenBy(match => match.KickoffUtc ?? DateTime.MaxValue)
            .ThenBy(match => match.Round)
            .ThenBy(match => match.SortOrder)
            .ThenBy(match => match.Id)
            .ToList();

        return new TournamentDetailDto(
            DtoMapper.ToSummary(tournament, teams.Count, matches.Count),
            tournament.Groups.OrderBy(group => group.SortOrder).ThenBy(group => group.Name).Select(DtoMapper.ToDto).ToList(),
            teams.Select(DtoMapper.ToDto).ToList(),
            matches.Select(match => DtoMapper.ToDto(match, tournament)).ToList(),
            BuildTables(tournament),
            BuildBracket(tournament),
            BuildTopScorers(tournament),
            RichHtml.Sanitize(tournament.Rules));
    }

    public IReadOnlyList<GroupTableDto> BuildTables(Tournament tournament)
    {
        var teams = tournament.Teams.ToList();
        var matches = tournament.Matches.ToList();
        var tables = new List<GroupTableDto>();

        if (tournament.Format == TournamentFormat.League || tournament.Groups.Count == 0)
        {
            // Ungrouped tournaments still get a single combined table.
            if (tournament.Format != TournamentFormat.KnockoutOnly && teams.Count > 0)
            {
                var rows = StandingsCalculator.Calculate(tournament, teams, matches);
                tables.Add(new GroupTableDto(null, "League table", rows.Select(DtoMapper.ToDto).ToList()));
            }

            return tables;
        }

        foreach (var group in tournament.Groups.OrderBy(group => group.SortOrder).ThenBy(group => group.Name))
        {
            var rows = StandingsCalculator.Calculate(tournament, teams, matches, group.Id);
            tables.Add(new GroupTableDto(group.Id, group.Name, rows.Select(DtoMapper.ToDto).ToList()));
        }

        return tables;
    }

    public IReadOnlyList<BracketMatchDto> BuildBracket(Tournament tournament) => tournament.Matches
        .Where(match => match.Stage != MatchStage.Group)
        .OrderBy(match => match.Stage)
        .ThenBy(match => match.Round)
        .Select(match => new BracketMatchDto(
            match.Stage,
            DtoMapper.ToStageName(match.Stage),
            DtoMapper.ToDto(match, tournament)))
        .ToList();

    public IReadOnlyList<ScorerDto> BuildTopScorers(Tournament tournament)
    {
        if (!tournament.TrackPlayers)
        {
            return [];
        }

        var teamNames = tournament.Teams.ToDictionary(team => team.Id, team => team.Name);

        return tournament.Matches
            .SelectMany(match => match.Events)
            .Where(matchEvent => matchEvent.PlayerId is not null)
            .Where(matchEvent => matchEvent.Type is MatchEventType.Goal or MatchEventType.PenaltyGoal or MatchEventType.Assist)
            .GroupBy(matchEvent => matchEvent.PlayerId!.Value)
            .Select(group =>
            {
                var first = group.First();
                return new ScorerDto(
                    group.Key,
                    first.Player?.Name ?? "Unknown",
                    first.TeamId,
                    teamNames.TryGetValue(first.TeamId, out var name) ? name : string.Empty,
                    group.Count(matchEvent => matchEvent.Type is MatchEventType.Goal or MatchEventType.PenaltyGoal),
                    group.Count(matchEvent => matchEvent.Type == MatchEventType.Assist));
            })
            .Where(scorer => scorer.Goals > 0 || scorer.Assists > 0)
            .OrderByDescending(scorer => scorer.Goals)
            .ThenByDescending(scorer => scorer.Assists)
            .ThenBy(scorer => scorer.PlayerName)
            .ToList();
    }

    public async Task<Tournament> SaveTournamentAsync(int? id, SaveTournamentRequest request, CancellationToken cancellationToken = default)
    {
        RequestValidation.Text(request.Name, "name", 120, required: true);
        RequestValidation.EnumValue(request.Format, "format");
        RequestValidation.EnumValue(request.Status, "status");
        RequestValidation.EnumValue(request.PlayerRegistrationMode, "playerRegistrationMode");
        foreach (var rule in request.Tiebreakers ?? []) RequestValidation.EnumValue(rule, "tiebreakers");
        RequestValidation.Text(request.Location, "location", 160);
        RequestValidation.Text(request.Description, "description", 2000);
        RequestValidation.Text(request.Rules, "rules", 20000);
        RequestValidation.Text(request.Parking, "parking", 20000);
        var tournament = id is null
            ? new Tournament()
            : await dbContext.Tournaments.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
              ?? throw new KeyNotFoundException($"Tournament {id} was not found.");

        tournament.Name = request.Name.Trim();
        tournament.Slug = Slugify(string.IsNullOrWhiteSpace(request.Slug) ? request.Name : request.Slug);
        tournament.Description = request.Description;
        tournament.Rules = RichHtml.Sanitize(request.Rules);
        tournament.Parking = RichHtml.Sanitize(request.Parking);
        tournament.Location = string.IsNullOrWhiteSpace(request.Location) ? null : request.Location.Trim();
        tournament.TournamentDateUtc = request.TournamentDateUtc;
        tournament.Season = request.Season;
        tournament.Format = request.Format;
        tournament.Status = request.Status;
        tournament.PointsForWin = request.PointsForWin;
        tournament.PointsForDraw = request.PointsForDraw;
        tournament.PointsForLoss = request.PointsForLoss;
        tournament.GroupRounds = Math.Clamp(request.GroupRounds, 1, 4);
        tournament.TeamsAdvancingPerGroup = Math.Max(0, request.TeamsAdvancingPerGroup);
        tournament.IncludeBestThirdPlaced = request.IncludeBestThirdPlaced;
        tournament.HasThirdPlacePlayOff = request.HasThirdPlacePlayOff;
        tournament.TrackPlayers = request.TrackPlayers;
        tournament.PlayerRegistrationMode = request.PlayerRegistrationMode;
        tournament.TrackCards = request.TrackCards;
        tournament.PeriodCount = Math.Clamp(request.PeriodCount, 1, 4);
        tournament.PeriodDurationMinutes = Math.Clamp(request.PeriodDurationMinutes, 1, 90);
        tournament.BreakDurationMinutes = Math.Clamp(request.BreakDurationMinutes, 0, 60);
        tournament.MatchIntervalMinutes = request.MatchIntervalMinutes is null
            ? null
            : Math.Clamp(request.MatchIntervalMinutes.Value, 0, 180);
        tournament.MatchesPerTimeSlot = Math.Clamp(request.MatchesPerTimeSlot, 1, 16);
        tournament.ShowMatchTimesOnly = request.ShowMatchTimesOnly ?? tournament.ShowMatchTimesOnly;
        tournament.HideMatchAddresses = request.HideMatchAddresses ?? tournament.HideMatchAddresses;
        tournament.TrackMatchClock = request.TrackMatchClock;
        tournament.AllowTimeouts = request.AllowTimeouts;
        tournament.UseStoppageTime = request.UseStoppageTime;
        tournament.UpdatedUtc = DateTime.UtcNow;

        if (request.Tiebreakers is { Count: > 0 })
        {
            tournament.TiebreakerOrder = string.Join(',', request.Tiebreakers);
        }

        if (id is null)
        {
            tournament.Slug = await EnsureUniqueSlugAsync(tournament.Slug, cancellationToken);
            dbContext.Tournaments.Add(tournament);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return tournament;
    }

    public async Task<bool> DeleteTournamentAsync(int id, CancellationToken cancellationToken = default)
    {
        var tournament = await dbContext.Tournaments.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (tournament is null)
        {
            return false;
        }

        dbContext.Tournaments.Remove(tournament);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<TournamentGroup> SaveGroupAsync(int tournamentId, int? groupId, SaveGroupRequest request, CancellationToken cancellationToken = default)
    {
        await RequestValidation.Tournament(dbContext, tournamentId, cancellationToken);
        RequestValidation.Text(request.Name, "name", 60, required: true);
        var group = groupId is null
            ? new TournamentGroup { TournamentId = tournamentId }
            : await dbContext.Groups.FirstOrDefaultAsync(candidate => candidate.Id == groupId && candidate.TournamentId == tournamentId, cancellationToken)
              ?? throw new KeyNotFoundException($"Group {groupId} was not found.");

        group.Name = request.Name.Trim();
        group.SortOrder = request.SortOrder;

        if (groupId is null)
        {
            dbContext.Groups.Add(group);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return group;
    }

    public async Task<bool> DeleteGroupAsync(int tournamentId, int groupId, CancellationToken cancellationToken = default)
    {
        var group = await dbContext.Groups
            .FirstOrDefaultAsync(candidate => candidate.Id == groupId && candidate.TournamentId == tournamentId, cancellationToken);

        if (group is null)
        {
            return false;
        }

        dbContext.Groups.Remove(group);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<Team> SaveTeamAsync(int tournamentId, int? teamId, SaveTeamRequest request, CancellationToken cancellationToken = default)
    {
        await RequestValidation.Tournament(dbContext, tournamentId, cancellationToken);
        await RequestValidation.Group(dbContext, tournamentId, request.GroupId, cancellationToken);
        RequestValidation.Text(request.Name, "name", 120, required: true);
        RequestValidation.Text(request.ShortName, "shortName", 10);
        RequestValidation.Text(request.Manager, "manager", 120);
        RequestValidation.Text(request.ColorHex, "colorHex", 9);
        RequestValidation.Text(request.LogoUrl, "logoUrl", 500);
        var team = teamId is null
            ? new Team { TournamentId = tournamentId }
            : await dbContext.Teams.FirstOrDefaultAsync(candidate => candidate.Id == teamId && candidate.TournamentId == tournamentId, cancellationToken)
              ?? throw new KeyNotFoundException($"Team {teamId} was not found.");

        team.Name = request.Name.Trim();
        team.ShortName = request.ShortName?.Trim();
        team.ColorHex = request.ColorHex;
        team.LogoUrl = request.LogoUrl;
        team.Manager = request.Manager;
        team.GroupId = request.GroupId;
        team.PointsAdjustment = request.PointsAdjustment;

        if (teamId is null)
        {
            dbContext.Teams.Add(team);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return team;
    }

    public async Task AssignTeamGroupAsync(int tournamentId, int teamId, int? groupId, CancellationToken cancellationToken = default)
    {
        var team = await dbContext.Teams.FirstOrDefaultAsync(t => t.Id == teamId && t.TournamentId == tournamentId, cancellationToken)
            ?? throw new KeyNotFoundException($"Team {teamId} was not found in this tournament.");
        await RequestValidation.Group(dbContext, tournamentId, groupId, cancellationToken);
        // Deliberately update only membership, never client-supplied copies of team metadata.
        team.GroupId = groupId;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> DeleteTeamAsync(int tournamentId, int teamId, CancellationToken cancellationToken = default)
    {
        var team = await dbContext.Teams
            .FirstOrDefaultAsync(candidate => candidate.Id == teamId && candidate.TournamentId == tournamentId, cancellationToken);

        if (team is null)
        {
            return false;
        }

        var hasMatches = await dbContext.Matches
            .AnyAsync(match => match.HomeTeamId == teamId || match.AwayTeamId == teamId, cancellationToken);

        if (hasMatches)
        {
            throw new InvalidOperationException("Remove the team's fixtures before deleting the team.");
        }

        dbContext.Teams.Remove(team);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<Player> SavePlayerAsync(int? playerId, SavePlayerRequest request, CancellationToken cancellationToken = default)
    {
        await using var transaction = await dbContext.BeginWriteAsync(cancellationToken);
        var targetTeam = await dbContext.Teams.AsNoTracking().FirstOrDefaultAsync(t => t.Id == request.TeamId, cancellationToken);
        RequestValidation.Require(targetTeam is not null, "teamId", "The team does not exist.");
        RequestValidation.Text(request.Name, "name", 120, required: true);
        RequestValidation.Text(request.Position, "position", 40);
        RequestValidation.Require(request.ShirtNumber is null or >= 0, "shirtNumber", "Shirt number cannot be negative.");
        var player = playerId is null
            ? new Player()
            : await dbContext.Players.FirstOrDefaultAsync(candidate => candidate.Id == playerId, cancellationToken)
              ?? throw new KeyNotFoundException($"Player {playerId} was not found.");

        if (playerId is not null && player.TeamId != request.TeamId)
        {
            var originalTournamentId = await dbContext.Teams.Where(t => t.Id == player.TeamId).Select(t => t.TournamentId).SingleAsync(cancellationToken);
            RequestValidation.Require(originalTournamentId == targetTeam!.TournamentId, "teamId", "A player cannot be moved to another tournament.");
            if (await dbContext.MatchEvents.AnyAsync(e => e.PlayerId == player.Id, cancellationToken))
                throw new RequestConflictException("A player with recorded match events cannot be moved to another team.");
        }

        player.TeamId = request.TeamId;
        player.Name = request.Name.Trim();
        player.ShirtNumber = request.ShirtNumber;
        player.Position = request.Position;
        player.IsActive = request.IsActive;

        if (playerId is null)
        {
            dbContext.Players.Add(player);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitOwnedAsync(cancellationToken);
        return player;
    }

    public async Task<bool> DeletePlayerAsync(int playerId, CancellationToken cancellationToken = default)
    {
        var player = await dbContext.Players.FirstOrDefaultAsync(candidate => candidate.Id == playerId, cancellationToken);
        if (player is null)
        {
            return false;
        }

        dbContext.Players.Remove(player);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<int> GenerateFixturesAsync(int tournamentId, GenerateFixturesRequest request, CancellationToken cancellationToken = default)
    {
        var tournament = await dbContext.Tournaments
            .Include(candidate => candidate.Groups)
            .Include(candidate => candidate.Teams)
            .Include(candidate => candidate.Matches)
            .FirstOrDefaultAsync(candidate => candidate.Id == tournamentId, cancellationToken)
            ?? throw new KeyNotFoundException($"Tournament {tournamentId} was not found.");

        RequestValidation.Require(request.FirstHomeTeamId is null || tournament.Teams.Any(t => t.Id == request.FirstHomeTeamId),
            "firstHomeTeamId", "The first home team must belong to this tournament.");
        RequestValidation.Require(request.ByeTeamIds is null || request.ByeTeamIds.All(id => id is null || tournament.Teams.Any(t => t.Id == id)),
            "byeTeamIds", "Bye teams must belong to this tournament.");

        if (request.ReplaceExisting)
        {
            var supportsKnockoutStage = tournament.Format is TournamentFormat.GroupsThenKnockout or TournamentFormat.KnockoutOnly;
            var doomed = tournament.Matches
                .Where(match => (request.IncludeGroupStage && match.Stage == MatchStage.Group)
                    || ((request.IncludeKnockoutStage || !supportsKnockoutStage) && match.Stage != MatchStage.Group))
                .ToList();

            dbContext.Matches.RemoveRange(doomed);
        }

        var firstHomeTeamId = request.FirstHomeTeamId is not null && tournament.Teams.Any(team => team.Id == request.FirstHomeTeamId)
            ? request.FirstHomeTeamId
            : null;
        tournament.FirstHomeTeamId = firstHomeTeamId;

        var generated = new List<Match>();

        List<Match> GenerateGroup(TournamentGroup group, IReadOnlyList<Team> teams)
        {
            try
            {
                return FixtureGenerator.GenerateGroupFixtures(tournament, group, teams, request.ByeTeamIds, firstHomeTeamId, request.TeamsSittingOut);
            }
            catch (ArgumentException error) when (error.ParamName is "byeTeamIds" or "firstHomeTeamId")
            {
                throw new RequestValidationException(error.ParamName, error.Message);
            }
        }

        if (request.IncludeGroupStage && tournament.Format != TournamentFormat.KnockoutOnly)
        {
            if (tournament.Format == TournamentFormat.League || tournament.Groups.Count == 0)
            {
                // No groups configured, so treat the whole field as one league.
                var placeholder = new TournamentGroup { Id = 0, TournamentId = tournament.Id, Name = "League" };
                generated.AddRange(GenerateGroup(placeholder, tournament.Teams.OrderBy(team => team.SortOrder).ToList())
                    .Select(match =>
                    {
                        match.GroupId = null;
                        return match;
                    }));
            }
            else
            {
                foreach (var group in tournament.Groups.OrderBy(group => group.SortOrder))
                {
                    var groupTeams = tournament.Teams
                        .Where(team => team.GroupId == group.Id)
                        .OrderBy(team => team.SortOrder)
                        .ThenBy(team => team.Name)
                        .ToList();

                    generated.AddRange(GenerateGroup(group, groupTeams));
                }
            }
        }

        if (request.IncludeKnockoutStage
            && tournament.Format is TournamentFormat.GroupsThenKnockout or TournamentFormat.KnockoutOnly)
        {
            var slots = tournament.Format == TournamentFormat.KnockoutOnly
                ? tournament.Teams.Count
                : Math.Max(tournament.Groups.Count, 1) * tournament.TeamsAdvancingPerGroup;

            generated.AddRange(FixtureGenerator.GenerateKnockoutBracket(tournament, slots));
        }

        var completedExisting = 0;
        var removedPartialFixtures = new List<Match>();
        if (!request.ReplaceExisting)
        {
            (generated, completedExisting, removedPartialFixtures) = MergeExistingGroupFixtures(tournament.Matches, generated);
        }

        AssignKickoffTimes(tournament, generated);

        dbContext.Matches.RemoveRange(removedPartialFixtures);
        dbContext.Matches.AddRange(generated);
        await dbContext.SaveChangesAsync(cancellationToken);
        return generated.Count + completedExisting;
    }

    private static (List<Match> Remaining, int Completed, List<Match> RemovedPartials) MergeExistingGroupFixtures(
        IEnumerable<Match> existing,
        IEnumerable<Match> generated)
    {
        var partialFixtures = existing
            .Where(match => match.Stage == MatchStage.Group && (match.HomeTeamId is null || match.AwayTeamId is null))
            .ToList();
        var existingPairCounts = existing
            .Where(match => match.Stage == MatchStage.Group && match.HomeTeamId is not null && match.AwayTeamId is not null)
            .GroupBy(match => PairKey(match.HomeTeamId!.Value, match.AwayTeamId!.Value))
            .ToDictionary(group => group.Key, group => group.Count());
        var existingKnockoutKeys = existing
            .Where(match => match.Stage != MatchStage.Group)
            .Select(match => (match.Stage, match.Round))
            .ToHashSet();
        var occupiedTeamIdsByRound = existing
            .Where(match => match.Stage == MatchStage.Group)
            .GroupBy(match => (match.GroupId, match.Round))
            .ToDictionary(
                group => group.Key,
                group => group.SelectMany(match => new[] { match.HomeTeamId, match.AwayTeamId })
                    .Where(teamId => teamId.HasValue)
                    .Select(teamId => teamId!.Value)
                    .ToHashSet());

        var remaining = new List<Match>();
        var removedPartials = new List<Match>();
        var completed = 0;
        foreach (var match in generated)
        {
            if (match.Stage != MatchStage.Group || match.HomeTeamId is null || match.AwayTeamId is null)
            {
                if (match.Stage != MatchStage.Group && !existingKnockoutKeys.Add((match.Stage, match.Round)))
                {
                    continue;
                }

                remaining.Add(match);
                continue;
            }

            var key = PairKey(match.HomeTeamId.Value, match.AwayTeamId.Value);
            if (existingPairCounts.TryGetValue(key, out var count) && count > 0)
            {
                existingPairCounts[key] = count - 1;
                var redundantPartial = partialFixtures.FirstOrDefault(candidate =>
                    candidate.GroupId == match.GroupId &&
                    candidate.Round == match.Round &&
                    (candidate.HomeTeamId is null || candidate.HomeTeamId == match.HomeTeamId) &&
                    (candidate.AwayTeamId is null || candidate.AwayTeamId == match.AwayTeamId));
                if (redundantPartial is not null)
                {
                    partialFixtures.Remove(redundantPartial);
                    removedPartials.Add(redundantPartial);
                }

                continue;
            }

            var roundKey = (match.GroupId, match.Round);
            var occupiedTeamIds = occupiedTeamIdsByRound.GetValueOrDefault(roundKey) ?? [];
            var partialFixture = partialFixtures.FirstOrDefault(candidate =>
                candidate.GroupId == match.GroupId &&
                candidate.Round == match.Round &&
                (candidate.HomeTeamId is null || candidate.HomeTeamId == match.HomeTeamId) &&
                (candidate.AwayTeamId is null || candidate.AwayTeamId == match.AwayTeamId));
            if (partialFixture is not null)
            {
                partialFixtures.Remove(partialFixture);
                partialFixture.HomeTeamId = match.HomeTeamId;
                partialFixture.AwayTeamId = match.AwayTeamId;
                occupiedTeamIds.Add(match.HomeTeamId.Value);
                occupiedTeamIds.Add(match.AwayTeamId.Value);
                occupiedTeamIdsByRound[roundKey] = occupiedTeamIds;
                completed++;
            }
            else if (occupiedTeamIds.Contains(match.HomeTeamId.Value) || occupiedTeamIds.Contains(match.AwayTeamId.Value))
            {
                continue;
            }
            else
            {
                remaining.Add(match);
                occupiedTeamIds.Add(match.HomeTeamId.Value);
                occupiedTeamIds.Add(match.AwayTeamId.Value);
                occupiedTeamIdsByRound[roundKey] = occupiedTeamIds;
            }
        }

        return (remaining, completed, removedPartials);
    }

    private static (int Low, int High) PairKey(int firstTeamId, int secondTeamId) =>
        firstTeamId < secondTeamId ? (firstTeamId, secondTeamId) : (secondTeamId, firstTeamId);

    private static void AssignKickoffTimes(Tournament tournament, IReadOnlyCollection<Match> matches)
    {
        if (tournament.TournamentDateUtc is null)
        {
            return;
        }

        var slotDuration = tournament.ScheduledMatchDurationMinutes + (tournament.MatchIntervalMinutes ?? 0);
        foreach (var roundMatches in matches
            .Where(match => match.Stage == MatchStage.Group)
            .GroupBy(match => match.Round))
        {
            var ordered = roundMatches.ToList();
            for (var index = 0; index < ordered.Count; index++)
            {
                var slot = index / Math.Max(1, tournament.MatchesPerTimeSlot);
                ordered[index].KickoffUtc = tournament.TournamentDateUtc.Value
                    .AddMinutes(((ordered[0].Round - 1) + slot) * slotDuration);
                ordered[index].PitchNumber = index % Math.Max(1, tournament.MatchesPerTimeSlot) + 1;
            }
        }
    }

    private async Task<string> EnsureUniqueSlugAsync(string slug, CancellationToken cancellationToken)
    {
        var candidate = slug;
        var suffix = 2;

        while (await dbContext.Tournaments.AnyAsync(tournament => tournament.Slug == candidate, cancellationToken))
        {
            candidate = $"{slug}-{suffix++}";
        }

        return candidate;
    }

    public static string Slugify(string value)
    {
        var builder = new System.Text.StringBuilder();
        var previousWasDash = false;

        foreach (var character in value.Trim().ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(character))
            {
                builder.Append(character);
                previousWasDash = false;
            }
            else if (!previousWasDash && builder.Length > 0)
            {
                builder.Append('-');
                previousWasDash = true;
            }
        }

        return builder.ToString().Trim('-') is { Length: > 0 } slug ? slug : "tournament";
    }
}
