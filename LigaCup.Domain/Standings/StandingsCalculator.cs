using LigaCup.Domain.Entities;
using LigaCup.Domain.Enums;

namespace LigaCup.Domain.Standings;

public class StandingRow
{
    public int Position { get; set; }
    public int TeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;
    public string? ShortName { get; set; }
    public string? LogoUrl { get; set; }
    public int? GroupId { get; set; }
    public string? GroupName { get; set; }

    public int Played { get; set; }
    public int Won { get; set; }
    public int Drawn { get; set; }
    public int Lost { get; set; }
    public int GoalsFor { get; set; }
    public int GoalsAgainst { get; set; }
    public int GoalDifference => GoalsFor - GoalsAgainst;
    public int Points { get; set; }
    public int YellowCards { get; set; }
    public int RedCards { get; set; }

    /// <summary>Most recent results first, each entry being W, D or L.</summary>
    public List<string> Form { get; set; } = [];

    /// <summary>True when the team currently occupies a qualifying position.</summary>
    public bool IsQualifying { get; set; }
}

/// <summary>
/// Builds group tables from finished matches using standard football rules.
/// </summary>
public static class StandingsCalculator
{
    public static IReadOnlyList<StandingRow> Calculate(
        Tournament tournament,
        IReadOnlyCollection<Team> teams,
        IReadOnlyCollection<Match> matches,
        int? groupId = null)
    {
        var groupTeams = groupId is null
            ? teams
            : teams.Where(team => team.GroupId == groupId).ToList();

        var relevantMatches = matches
            .Where(match => match.CountsTowardsTable)
            .Where(match => groupId is null || match.GroupId == groupId)
            .Where(match => match.HomeTeamId is not null && match.AwayTeamId is not null)
            .OrderBy(match => match.KickoffUtc ?? DateTime.MaxValue)
            .ThenBy(match => match.Round)
            .ToList();

        var rows = groupTeams.ToDictionary(
            team => team.Id,
            team => new StandingRow
            {
                TeamId = team.Id,
                TeamName = team.Name,
                ShortName = team.ShortName,
                LogoUrl = team.LogoUrl,
                GroupId = team.GroupId,
                GroupName = team.Group?.Name,
                Points = team.PointsAdjustment
            });

        foreach (var match in relevantMatches)
        {
            ApplyResult(tournament, rows, match);
        }

        foreach (var row in rows.Values)
        {
            // Form reads newest first, so reverse the chronological order built above.
            row.Form.Reverse();
            if (row.Form.Count > 5)
            {
                row.Form = row.Form.Take(5).ToList();
            }
        }

        var ordered = Rank(rows.Values.ToList(), relevantMatches, tournament.GetTiebreakers(), ruleIndex: 0);

        for (var index = 0; index < ordered.Count; index++)
        {
            ordered[index].Position = index + 1;
            ordered[index].IsQualifying = tournament.Format is not (TournamentFormat.GroupsOnly or TournamentFormat.League)
                && index < tournament.TeamsAdvancingPerGroup;
        }

        return ordered;
    }

    private static void ApplyResult(Tournament tournament, Dictionary<int, StandingRow> rows, Match match)
    {
        if (!rows.TryGetValue(match.HomeTeamId!.Value, out var home) ||
            !rows.TryGetValue(match.AwayTeamId!.Value, out var away))
        {
            return;
        }

        home.Played++;
        away.Played++;
        home.GoalsFor += match.HomeScore;
        home.GoalsAgainst += match.AwayScore;
        away.GoalsFor += match.AwayScore;
        away.GoalsAgainst += match.HomeScore;

        if (match.HomeScore > match.AwayScore)
        {
            home.Won++;
            away.Lost++;
            home.Points += tournament.PointsForWin;
            away.Points += tournament.PointsForLoss;
            home.Form.Add("W");
            away.Form.Add("L");
        }
        else if (match.HomeScore < match.AwayScore)
        {
            away.Won++;
            home.Lost++;
            away.Points += tournament.PointsForWin;
            home.Points += tournament.PointsForLoss;
            away.Form.Add("W");
            home.Form.Add("L");
        }
        else
        {
            home.Drawn++;
            away.Drawn++;
            home.Points += tournament.PointsForDraw;
            away.Points += tournament.PointsForDraw;
            home.Form.Add("D");
            away.Form.Add("D");
        }

        foreach (var matchEvent in match.Events)
        {
            if (!rows.TryGetValue(matchEvent.TeamId, out var row))
            {
                continue;
            }

            if (matchEvent.Type == MatchEventType.YellowCard)
            {
                row.YellowCards++;
            }
            else if (matchEvent.Type == MatchEventType.RedCard)
            {
                row.RedCards++;
            }
        }
    }

    /// <summary>
    /// Orders rows by points, then walks the configured tiebreakers to split teams that remain level.
    /// Head-to-head rules are evaluated as a mini-league between the tied teams only.
    /// </summary>
    private static List<StandingRow> Rank(
        List<StandingRow> rows,
        IReadOnlyCollection<Match> matches,
        IReadOnlyList<TiebreakerRule> tiebreakers,
        int ruleIndex)
    {
        if (rows.Count <= 1)
        {
            return rows;
        }

        if (ruleIndex == 0)
        {
            return rows
                .GroupBy(row => row.Points)
                .OrderByDescending(group => group.Key)
                .SelectMany(group => Rank(group.ToList(), matches, tiebreakers, 1))
                .ToList();
        }

        var rule = ruleIndex <= tiebreakers.Count ? tiebreakers[ruleIndex - 1] : (TiebreakerRule?)null;
        if (rule is null)
        {
            return rows.OrderBy(row => row.TeamName, StringComparer.OrdinalIgnoreCase).ToList();
        }

        if (rule == TiebreakerRule.Lottery)
        {
            return rows;
        }

        var keys = BuildKeys(rows, matches, rule.Value);

        return rows
            .GroupBy(row => keys[row.TeamId])
            .OrderByDescending(group => group.Key)
            .SelectMany(group => Rank(group.ToList(), matches, tiebreakers, ruleIndex + 1))
            .ToList();
    }

    /// <summary>Produces a comparable score per team where a higher value always ranks better.</summary>
    private static Dictionary<int, long> BuildKeys(
        List<StandingRow> rows,
        IReadOnlyCollection<Match> matches,
        TiebreakerRule rule)
    {
        var keys = new Dictionary<int, long>();

        if (rule is TiebreakerRule.HeadToHeadPoints
            or TiebreakerRule.HeadToHeadGoalDifference
            or TiebreakerRule.HeadToHeadGoalsScored)
        {
            var tiedTeamIds = rows.Select(row => row.TeamId).ToHashSet();
            var miniLeague = matches
                .Where(match => tiedTeamIds.Contains(match.HomeTeamId!.Value) && tiedTeamIds.Contains(match.AwayTeamId!.Value))
                .ToList();

            foreach (var row in rows)
            {
                var points = 0;
                var scored = 0;
                var conceded = 0;

                foreach (var match in miniLeague)
                {
                    var isHome = match.HomeTeamId == row.TeamId;
                    var isAway = match.AwayTeamId == row.TeamId;
                    if (!isHome && !isAway)
                    {
                        continue;
                    }

                    var teamGoals = isHome ? match.HomeScore : match.AwayScore;
                    var opponentGoals = isHome ? match.AwayScore : match.HomeScore;

                    scored += teamGoals;
                    conceded += opponentGoals;
                    points += teamGoals > opponentGoals ? 3 : teamGoals == opponentGoals ? 1 : 0;
                }

                keys[row.TeamId] = rule switch
                {
                    TiebreakerRule.HeadToHeadPoints => points,
                    TiebreakerRule.HeadToHeadGoalDifference => scored - conceded,
                    _ => scored
                };
            }

            return keys;
        }

        foreach (var row in rows)
        {
            keys[row.TeamId] = rule switch
            {
                TiebreakerRule.GoalDifference => row.GoalDifference,
                TiebreakerRule.GoalsScored => row.GoalsFor,
                TiebreakerRule.GoalsConceded => -row.GoalsAgainst,
                TiebreakerRule.Wins => row.Won,
                TiebreakerRule.DisciplinaryPoints => -((row.YellowCards * 1L) + (row.RedCards * 3L)),
                TiebreakerRule.TeamName => AlphabeticalKey(row.TeamName),
                _ => 0
            };
        }

        return keys;
    }

    /// <summary>Negated so that names earlier in the alphabet produce a higher ranking key.</summary>
    private static long AlphabeticalKey(string name)
    {
        var key = 0L;
        var normalized = name.ToUpperInvariant();

        for (var index = 0; index < 6; index++)
        {
            var character = index < normalized.Length ? normalized[index] : ' ';
            key = (key * 128) + Math.Min(character, (char)127);
        }

        return -key;
    }
}
