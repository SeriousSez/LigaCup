using LigaCup.ApplicationService.Contracts;
using LigaCup.ApplicationService.Mapping;
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
            .ThenBy(match => match.Round)
            .ThenBy(match => match.KickoffUtc ?? DateTime.MaxValue)
            .ToList();

        return new TournamentDetailDto(
            DtoMapper.ToSummary(tournament, teams.Count, matches.Count),
            tournament.Groups.OrderBy(group => group.SortOrder).ThenBy(group => group.Name).Select(DtoMapper.ToDto).ToList(),
            teams.Select(DtoMapper.ToDto).ToList(),
            matches.Select(match => DtoMapper.ToDto(match, tournament)).ToList(),
            BuildTables(tournament),
            BuildBracket(tournament),
            BuildTopScorers(tournament),
            tournament.Rules);
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
        var tournament = id is null
            ? new Tournament()
            : await dbContext.Tournaments.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
              ?? throw new KeyNotFoundException($"Tournament {id} was not found.");

        tournament.Name = request.Name.Trim();
        tournament.Slug = Slugify(string.IsNullOrWhiteSpace(request.Slug) ? request.Name : request.Slug);
        tournament.Description = request.Description;
        tournament.Rules = string.IsNullOrWhiteSpace(request.Rules) ? null : request.Rules.Trim();
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
        var player = playerId is null
            ? new Player()
            : await dbContext.Players.FirstOrDefaultAsync(candidate => candidate.Id == playerId, cancellationToken)
              ?? throw new KeyNotFoundException($"Player {playerId} was not found.");

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

        if (request.ReplaceExisting)
        {
            var doomed = tournament.Matches
                .Where(match => (request.IncludeGroupStage && match.Stage == MatchStage.Group)
                    || (request.IncludeKnockoutStage && match.Stage != MatchStage.Group))
                .ToList();

            dbContext.Matches.RemoveRange(doomed);
        }
        else if (tournament.Matches.Count > 0)
        {
            throw new InvalidOperationException("Fixtures already exist. Enable 'replace existing' to regenerate them.");
        }

        var generated = new List<Match>();

        if (request.IncludeGroupStage && tournament.Format != TournamentFormat.KnockoutOnly)
        {
            if (tournament.Format == TournamentFormat.League || tournament.Groups.Count == 0)
            {
                // No groups configured, so treat the whole field as one league.
                var placeholder = new TournamentGroup { Id = 0, TournamentId = tournament.Id, Name = "League" };
                generated.AddRange(FixtureGenerator
                    .GenerateGroupFixtures(tournament, placeholder, tournament.Teams.OrderBy(team => team.SortOrder).ToList())
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

                    generated.AddRange(FixtureGenerator.GenerateGroupFixtures(tournament, group, groupTeams));
                }
            }
        }

        if (request.IncludeKnockoutStage && tournament.Format != TournamentFormat.GroupsOnly)
        {
            var slots = tournament.Format == TournamentFormat.KnockoutOnly
                ? tournament.Teams.Count
                : Math.Max(tournament.Groups.Count, 1) * tournament.TeamsAdvancingPerGroup;

            generated.AddRange(FixtureGenerator.GenerateKnockoutBracket(tournament, slots));
        }

        AssignKickoffTimes(tournament, generated);

        dbContext.Matches.AddRange(generated);
        await dbContext.SaveChangesAsync(cancellationToken);
        return generated.Count;
    }

    private static void AssignKickoffTimes(Tournament tournament, IReadOnlyCollection<Match> matches)
    {
        if (tournament.TournamentDateUtc is null)
        {
            return;
        }

        var slotDuration = tournament.PeriodDurationMinutes + (tournament.MatchIntervalMinutes ?? 0);
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
