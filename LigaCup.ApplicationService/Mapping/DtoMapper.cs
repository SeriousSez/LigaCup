using LigaCup.ApplicationService.Contracts;
using LigaCup.Domain.Entities;
using LigaCup.Domain.Enums;
using LigaCup.Domain.Standings;

namespace LigaCup.ApplicationService.Mapping;

public static class DtoMapper
{
    public static TournamentSummaryDto ToSummary(Tournament tournament, int teamCount, int matchCount) => new(
        tournament.Id,
        tournament.Name,
        tournament.Slug,
        tournament.Description,
        tournament.Season,
        tournament.Format,
        tournament.Status,
        tournament.TrackPlayers,
        teamCount,
        matchCount);

    public static GroupDto ToDto(TournamentGroup group) => new(group.Id, group.Name, group.SortOrder);

    public static PlayerDto ToDto(Player player) =>
        new(player.Id, player.TeamId, player.Name, player.ShirtNumber, player.Position, player.IsActive);

    public static TeamDto ToDto(Team team) => new(
        team.Id,
        team.Name,
        team.ShortName,
        team.ColorHex,
        team.LogoUrl,
        team.Manager,
        team.GroupId,
        team.Group?.Name,
        team.PointsAdjustment,
        team.Players.OrderBy(player => player.ShirtNumber ?? int.MaxValue).ThenBy(player => player.Name).Select(ToDto).ToList());

    public static MatchDto ToDto(Match match, int matchDurationMinutes)
    {
        var events = match.Events
            .OrderBy(matchEvent => matchEvent.Minute)
            .ThenBy(matchEvent => matchEvent.Id)
            .Select(matchEvent => new MatchEventDto(
                matchEvent.Id,
                matchEvent.MatchId,
                matchEvent.TeamId,
                matchEvent.Team?.Name ?? string.Empty,
                matchEvent.PlayerId,
                matchEvent.Player?.Name,
                matchEvent.Type,
                matchEvent.Minute,
                matchEvent.Note))
            .ToList();

        return new MatchDto(
            match.Id,
            match.TournamentId,
            match.GroupId,
            match.Group?.Name,
            match.Stage,
            match.Round,
            match.HomeTeamId,
            match.HomeTeam?.Name ?? match.HomePlaceholder ?? "TBD",
            match.HomeTeam?.ShortName,
            match.HomeTeam?.LogoUrl,
            match.AwayTeamId,
            match.AwayTeam?.Name ?? match.AwayPlaceholder ?? "TBD",
            match.AwayTeam?.ShortName,
            match.AwayTeam?.LogoUrl,
            match.KickoffUtc,
            match.Venue,
            match.Status,
            match.HomeScore,
            match.AwayScore,
            match.HomePenalties,
            match.AwayPenalties,
            CalculateLiveMinute(match, matchDurationMinutes),
            match.Notes,
            events);
    }

    /// <summary>Derives the clock from the kickoff timestamp so every client shows the same minute.</summary>
    private static int? CalculateLiveMinute(Match match, int matchDurationMinutes)
    {
        if (match.Status is not (MatchStatus.Live or MatchStatus.HalfTime) || match.StartedUtc is null)
        {
            return null;
        }

        var elapsed = (int)Math.Floor((DateTime.UtcNow - match.StartedUtc.Value).TotalMinutes);
        return Math.Clamp(elapsed, 0, matchDurationMinutes + 15);
    }

    public static StandingRowDto ToDto(StandingRow row) => new(
        row.Position,
        row.TeamId,
        row.TeamName,
        row.ShortName,
        row.LogoUrl,
        row.Played,
        row.Won,
        row.Drawn,
        row.Lost,
        row.GoalsFor,
        row.GoalsAgainst,
        row.GoalDifference,
        row.Points,
        row.YellowCards,
        row.RedCards,
        row.Form,
        row.IsQualifying);

    public static string ToStageName(MatchStage stage) => stage switch
    {
        MatchStage.Group => "Group stage",
        MatchStage.RoundOf32 => "Round of 32",
        MatchStage.RoundOf16 => "Round of 16",
        MatchStage.QuarterFinal => "Quarter-final",
        MatchStage.SemiFinal => "Semi-final",
        MatchStage.ThirdPlacePlayOff => "Third place play-off",
        MatchStage.Final => "Final",
        _ => stage.ToString()
    };
}
