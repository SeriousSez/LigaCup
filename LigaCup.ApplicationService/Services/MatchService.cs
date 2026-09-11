using LigaCup.ApplicationService.Contracts;
using LigaCup.ApplicationService.Mapping;
using LigaCup.Domain.Entities;
using LigaCup.Domain.Enums;
using LigaCup.Domain.Scheduling;
using LigaCup.Domain.Standings;
using LigaCup.Domain.Timing;
using LigaCup.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace LigaCup.ApplicationService.Services;

/// <summary>
/// Owns every write that can change a live scoreline, and republishes the affected
/// tables and bracket so clients never have to recompute anything themselves.
/// </summary>
public class MatchService(LigaCupContext dbContext, TournamentService tournamentService, ILiveUpdateBroadcaster broadcaster)
{
    public async Task<Match> SaveMatchAsync(int tournamentId, int? matchId, SaveMatchRequest request, CancellationToken cancellationToken = default)
    {
        var match = matchId is null
            ? new Match { TournamentId = tournamentId }
            : await dbContext.Matches.FirstOrDefaultAsync(candidate => candidate.Id == matchId && candidate.TournamentId == tournamentId, cancellationToken)
              ?? throw new KeyNotFoundException($"Match {matchId} was not found.");

        match.GroupId = request.GroupId;
        match.Stage = request.Stage;
        match.Round = request.Round;
        match.HomeTeamId = request.HomeTeamId;
        match.AwayTeamId = request.AwayTeamId;
        match.HomePlaceholder = request.HomePlaceholder;
        match.AwayPlaceholder = request.AwayPlaceholder;
        match.KickoffUtc = request.KickoffUtc;
        match.Venue = request.Venue;
        match.UpdatedUtc = DateTime.UtcNow;

        if (matchId is null)
        {
            dbContext.Matches.Add(match);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await PublishAsync(match.Id, cancellationToken);
        return match;
    }

    public async Task<bool> DeleteMatchAsync(int tournamentId, int matchId, CancellationToken cancellationToken = default)
    {
        var match = await dbContext.Matches
            .FirstOrDefaultAsync(candidate => candidate.Id == matchId && candidate.TournamentId == tournamentId, cancellationToken);

        if (match is null)
        {
            return false;
        }

        dbContext.Matches.Remove(match);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<MatchDto> UpdateScoreAsync(int matchId, UpdateScoreRequest request, CancellationToken cancellationToken = default)
    {
        var match = await LoadTrackedAsync(matchId, cancellationToken);

        match.HomeScore = Math.Max(0, request.HomeScore);
        match.AwayScore = Math.Max(0, request.AwayScore);
        match.HomePenalties = request.HomePenalties;
        match.AwayPenalties = request.AwayPenalties;
        match.UpdatedUtc = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        return await PublishAsync(match.Id, cancellationToken);
    }

    /// <summary>Nudges one side's score, which is what the live console's plus and minus buttons call.</summary>
    public async Task<MatchDto> AdjustScoreAsync(int matchId, bool isHomeTeam, int delta, CancellationToken cancellationToken = default)
    {
        var match = await LoadTrackedAsync(matchId, cancellationToken);

        if (isHomeTeam)
        {
            match.HomeScore = Math.Max(0, match.HomeScore + delta);
        }
        else
        {
            match.AwayScore = Math.Max(0, match.AwayScore + delta);
        }

        match.UpdatedUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        return await PublishAsync(match.Id, cancellationToken);
    }

    public async Task<MatchDto> UpdateStatusAsync(int matchId, MatchStatus status, CancellationToken cancellationToken = default)
    {
        var match = await LoadTrackedAsync(matchId, cancellationToken);
        var tournament = await dbContext.Tournaments
            .AsNoTracking()
            .FirstAsync(candidate => candidate.Id == match.TournamentId, cancellationToken);

        MatchClock.ApplyStatusChange(tournament, match, status, DateTime.UtcNow);
        match.UpdatedUtc = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        if (status == MatchStatus.Finished && match.Stage != MatchStage.Group)
        {
            await AdvanceBracketAsync(match, cancellationToken);
        }

        return await PublishAsync(match.Id, cancellationToken);
    }

    /// <summary>Sets the added time the referee has signalled for the period currently being played.</summary>
    public async Task<MatchDto> UpdateStoppageAsync(int matchId, int stoppageMinutes, CancellationToken cancellationToken = default)
    {
        var match = await LoadTrackedAsync(matchId, cancellationToken);

        match.StoppageMinutes = Math.Clamp(stoppageMinutes, 0, 30);
        match.UpdatedUtc = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        return await PublishAsync(match.Id, cancellationToken);
    }

    public async Task<MatchDto> AddEventAsync(int matchId, SaveMatchEventRequest request, CancellationToken cancellationToken = default)
    {
        var match = await LoadTrackedAsync(matchId, cancellationToken);

        dbContext.MatchEvents.Add(new MatchEvent
        {
            MatchId = match.Id,
            TeamId = request.TeamId,
            PlayerId = request.PlayerId,
            Type = request.Type,
            Minute = Math.Max(0, request.Minute),
            Note = request.Note
        });

        // Goals recorded against a team are the single source of truth for the scoreline,
        // so keep the stored score in step with the event feed.
        if (request.Type is MatchEventType.Goal or MatchEventType.PenaltyGoal)
        {
            if (request.TeamId == match.HomeTeamId)
            {
                match.HomeScore++;
            }
            else if (request.TeamId == match.AwayTeamId)
            {
                match.AwayScore++;
            }
        }
        else if (request.Type == MatchEventType.OwnGoal)
        {
            if (request.TeamId == match.HomeTeamId)
            {
                match.AwayScore++;
            }
            else if (request.TeamId == match.AwayTeamId)
            {
                match.HomeScore++;
            }
        }

        match.UpdatedUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        return await PublishAsync(match.Id, cancellationToken);
    }

    public async Task<MatchDto?> DeleteEventAsync(int matchId, int eventId, CancellationToken cancellationToken = default)
    {
        var matchEvent = await dbContext.MatchEvents
            .FirstOrDefaultAsync(candidate => candidate.Id == eventId && candidate.MatchId == matchId, cancellationToken);

        if (matchEvent is null)
        {
            return null;
        }

        var match = await LoadTrackedAsync(matchId, cancellationToken);

        if (matchEvent.Type is MatchEventType.Goal or MatchEventType.PenaltyGoal)
        {
            if (matchEvent.TeamId == match.HomeTeamId)
            {
                match.HomeScore = Math.Max(0, match.HomeScore - 1);
            }
            else if (matchEvent.TeamId == match.AwayTeamId)
            {
                match.AwayScore = Math.Max(0, match.AwayScore - 1);
            }
        }
        else if (matchEvent.Type == MatchEventType.OwnGoal)
        {
            if (matchEvent.TeamId == match.HomeTeamId)
            {
                match.AwayScore = Math.Max(0, match.AwayScore - 1);
            }
            else if (matchEvent.TeamId == match.AwayTeamId)
            {
                match.HomeScore = Math.Max(0, match.HomeScore - 1);
            }
        }

        dbContext.MatchEvents.Remove(matchEvent);
        match.UpdatedUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        return await PublishAsync(match.Id, cancellationToken);
    }

    /// <summary>
    /// Fills the first knockout round from the finished group tables. Group winners are drawn
    /// against runners-up from a neighbouring group so clubs from the same group meet as late as possible.
    /// </summary>
    public async Task<int> SeedKnockoutFromGroupsAsync(int tournamentId, CancellationToken cancellationToken = default)
    {
        var tournament = await tournamentService.LoadGraphAsync(tournamentId, cancellationToken)
            ?? throw new KeyNotFoundException($"Tournament {tournamentId} was not found.");

        if (tournament.Format is not (TournamentFormat.GroupsThenKnockout or TournamentFormat.KnockoutOnly))
        {
            throw new InvalidOperationException("This tournament format does not have a knockout stage.");
        }

        var qualifiers = new List<int>();
        var groups = tournament.Groups.OrderBy(group => group.SortOrder).ThenBy(group => group.Name).ToList();
        var advancing = Math.Max(1, tournament.TeamsAdvancingPerGroup);

        var byGroup = new List<List<int>>();
        foreach (var group in groups)
        {
            var rows = StandingsCalculator.Calculate(tournament, tournament.Teams.ToList(), tournament.Matches.ToList(), group.Id);
            byGroup.Add(rows.Take(advancing).Select(row => row.TeamId).ToList());
        }

        if (advancing == 2 && byGroup.Count % 2 == 0)
        {
            for (var index = 0; index < byGroup.Count; index += 2)
            {
                var first = byGroup[index];
                var second = byGroup[index + 1];

                if (first.Count < 2 || second.Count < 2)
                {
                    continue;
                }

                qualifiers.AddRange([first[0], second[1], second[0], first[1]]);
            }
        }
        else
        {
            for (var position = 0; position < advancing; position++)
            {
                qualifiers.AddRange(byGroup.Where(group => group.Count > position).Select(group => group[position]));
            }
        }

        // The opening knockout round is the earliest stage in the enum, ignoring the play-off.
        var firstRound = tournament.Matches
            .Where(match => match.Stage != MatchStage.Group && match.Stage != MatchStage.ThirdPlacePlayOff)
            .GroupBy(match => match.Stage)
            .OrderBy(group => (int)group.Key)
            .FirstOrDefault()
            ?.OrderBy(match => match.Round)
            .ToList() ?? [];

        var updated = 0;
        var slot = 0;

        foreach (var bracketMatch in firstRound)
        {
            if (slot + 1 >= qualifiers.Count)
            {
                break;
            }

            var tracked = await dbContext.Matches.FirstAsync(candidate => candidate.Id == bracketMatch.Id, cancellationToken);
            tracked.HomeTeamId = qualifiers[slot++];
            tracked.AwayTeamId = qualifiers[slot++];
            tracked.UpdatedUtc = DateTime.UtcNow;
            updated++;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return updated;
    }

    /// <summary>Resolves "Winner QF1" style placeholders in the next round once a tie is decided.</summary>
    private async Task AdvanceBracketAsync(Match match, CancellationToken cancellationToken)
    {
        var winnerTeamId = match.GetWinnerTeamId();
        if (winnerTeamId is null)
        {
            return;
        }

        var loserTeamId = winnerTeamId == match.HomeTeamId ? match.AwayTeamId : match.HomeTeamId;
        var label = FixtureGenerator.TieLabel(match.Stage, match.Round);
        var winnerToken = $"Winner {label}";
        var loserToken = $"Loser {label}";

        var successors = await dbContext.Matches
            .Where(candidate => candidate.TournamentId == match.TournamentId && candidate.Id != match.Id)
            .Where(candidate => candidate.HomePlaceholder == winnerToken || candidate.AwayPlaceholder == winnerToken
                || candidate.HomePlaceholder == loserToken || candidate.AwayPlaceholder == loserToken)
            .ToListAsync(cancellationToken);

        foreach (var successor in successors)
        {
            if (successor.HomePlaceholder == winnerToken)
            {
                successor.HomeTeamId = winnerTeamId;
            }
            else if (successor.AwayPlaceholder == winnerToken)
            {
                successor.AwayTeamId = winnerTeamId;
            }

            if (successor.HomePlaceholder == loserToken)
            {
                successor.HomeTeamId = loserTeamId;
            }
            else if (successor.AwayPlaceholder == loserToken)
            {
                successor.AwayTeamId = loserTeamId;
            }

            successor.UpdatedUtc = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<Match> LoadTrackedAsync(int matchId, CancellationToken cancellationToken) =>
        await dbContext.Matches.FirstOrDefaultAsync(candidate => candidate.Id == matchId, cancellationToken)
        ?? throw new KeyNotFoundException($"Match {matchId} was not found.");

    /// <summary>Recomputes the derived views for the whole tournament and broadcasts them.</summary>
    private async Task<MatchDto> PublishAsync(int matchId, CancellationToken cancellationToken)
    {
        var tournamentId = await dbContext.Matches
            .Where(match => match.Id == matchId)
            .Select(match => match.TournamentId)
            .FirstAsync(cancellationToken);

        var tournament = await tournamentService.LoadGraphAsync(tournamentId, cancellationToken)
            ?? throw new KeyNotFoundException($"Tournament {tournamentId} was not found.");

        var match = tournament.Matches.First(candidate => candidate.Id == matchId);
        var dto = DtoMapper.ToDto(match, tournament);

        await broadcaster.BroadcastAsync(new LiveUpdateDto(
            tournament.Slug,
            dto,
            tournamentService.BuildTables(tournament),
            tournamentService.BuildBracket(tournament),
            tournamentService.BuildTopScorers(tournament)), cancellationToken);

        return dto;
    }
}
