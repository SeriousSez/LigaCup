using LigaCup.Domain.Entities;
using LigaCup.Domain.Enums;

namespace LigaCup.Domain.Scheduling;

/// <summary>
/// Builds the fixture list for a tournament: a round robin inside every group and,
/// when the format calls for it, an empty knockout bracket wired up with placeholders.
/// </summary>
public static class FixtureGenerator
{
    public static List<Match> GenerateGroupFixtures(
        Tournament tournament,
        TournamentGroup group,
        IReadOnlyList<Team> teams,
        IReadOnlyList<int?>? byeTeamIds = null,
        int? firstHomeTeamId = null)
    {
        var fixtures = new List<Match>();
        if (teams.Count < 2)
        {
            return fixtures;
        }

        var rounds = Math.Max(1, tournament.GroupRounds);

        var legFixtures = BuildSingleRoundRobin(teams, byeTeamIds, firstHomeTeamId);
        var matchdaysPerLeg = legFixtures.Count == 0 ? 0 : legFixtures.Max(fixture => fixture.Matchday);

        for (var round = 0; round < rounds; round++)
        {
            foreach (var (home, away, matchday) in legFixtures)
            {
                // Alternate home advantage on every return leg.
                var swap = round % 2 == 1;

                fixtures.Add(new Match
                {
                    TournamentId = tournament.Id,
                    GroupId = group.Id,
                    Stage = MatchStage.Group,
                    Round = (round * matchdaysPerLeg) + matchday,
                    HomeTeamId = swap ? away.Id : home.Id,
                    AwayTeamId = swap ? home.Id : away.Id,
                    Venue = tournament.Location,
                    Status = MatchStatus.Scheduled
                });
            }
        }

        return fixtures;
    }

    /// <summary>
    /// Circle method round robin. A bye team is added when the count is odd so that
    /// every real team sits out exactly one matchday.
    /// </summary>
    private static List<(Team Home, Team Away, int Matchday)> BuildSingleRoundRobin(
        IReadOnlyList<Team> teams,
        IReadOnlyList<int?>? byeTeamIds,
        int? firstHomeTeamId)
    {
        var participants = teams.ToList();
        Team? bye = null;

        if (participants.Count % 2 == 1)
        {
            bye = new Team { Id = -1, Name = "BYE" };
            var firstHome = firstHomeTeamId is null
                ? null
                : participants.FirstOrDefault(team => team.Id == firstHomeTeamId.Value);
            if (firstHome is null)
            {
                participants.Add(bye);
            }
            else
            {
                participants.Remove(firstHome);
                participants.Insert(0, firstHome);
                participants.Insert(1, bye);
            }
        }

        var count = participants.Count;
        var matchdays = count - 1;
        var half = count / 2;
        var fixtures = new List<(Team Home, Team Away, int Matchday)>();

        var rotation = participants.Skip(1).ToList();

        for (var matchday = 0; matchday < matchdays; matchday++)
        {
            var roundTeams = new List<Team> { participants[0] };
            roundTeams.AddRange(rotation);

            for (var index = 0; index < half; index++)
            {
                var home = roundTeams[index];
                var away = roundTeams[count - 1 - index];

                if (ReferenceEquals(home, bye) || ReferenceEquals(away, bye))
                {
                    continue;
                }

                // Flip the pairing on alternating matchdays to balance home and away games.
                if (matchday % 2 == 1 && index == 0)
                {
                    (home, away) = (away, home);
                }

                fixtures.Add((home, away, matchday + 1));
            }

            var last = rotation[^1];
            rotation.RemoveAt(rotation.Count - 1);
            rotation.Insert(0, last);
        }

        var rounds = fixtures
            .GroupBy(fixture => fixture.Matchday)
            .OrderBy(round => round.Key)
            .Select(round => round.ToList())
            .ToList();
        var orderedRounds = rounds;

        if (byeTeamIds is not null && byeTeamIds.Any(teamId => teamId is not null))
        {
            var automaticByeIds = teams
                .Select(team => team.Id)
                .Except(rounds.Select(round => teams.Select(team => team.Id)
                    .Except(round.SelectMany(fixture => new[] { fixture.Home.Id, fixture.Away.Id }))
                    .Single()))
                .ToList();
            var requestedByeIds = byeTeamIds
                .Take(rounds.Count)
                .Select((teamId, index) => teamId ?? automaticByeIds[index])
                .ToList();

            if (requestedByeIds.Count != rounds.Count ||
                requestedByeIds.Distinct().Count() != rounds.Count ||
                requestedByeIds.Any(teamId => !teams.Any(team => team.Id == teamId)))
            {
                throw new ArgumentException("Each round must select a different team to sit out.", nameof(byeTeamIds));
            }

            var roundsByBye = rounds.ToDictionary(
                round => teams.Select(team => team.Id)
                    .Except(round.SelectMany(fixture => new[] { fixture.Home.Id, fixture.Away.Id }))
                    .Single(),
                round => round);

            orderedRounds = requestedByeIds.Select(byeTeamId => roundsByBye[byeTeamId]).ToList();
        }

        if (firstHomeTeamId is not null)
        {
            var firstRound = orderedRounds[0].ToList();
            var firstHomeIndex = firstRound.FindIndex(fixture => fixture.Home.Id == firstHomeTeamId || fixture.Away.Id == firstHomeTeamId);
            if (firstHomeIndex < 0)
            {
                throw new ArgumentException("The first home team must play in the first round.", nameof(firstHomeTeamId));
            }

            var firstHomeFixture = firstRound[firstHomeIndex];
            if (firstHomeFixture.Away.Id == firstHomeTeamId)
            {
                firstHomeFixture = (firstHomeFixture.Away, firstHomeFixture.Home, firstHomeFixture.Matchday);
            }

            firstRound.RemoveAt(firstHomeIndex);
            firstRound.Insert(0, firstHomeFixture);
            orderedRounds[0] = firstRound;
        }

        return orderedRounds
            .SelectMany((round, index) => round.Select(fixture => (fixture.Home, fixture.Away, index + 1)))
            .ToList();
    }

    /// <summary>
    /// Creates the knockout ties as empty placeholder matches. Teams are filled in later,
    /// either automatically from the final group tables or manually by the organiser.
    /// </summary>
    public static List<Match> GenerateKnockoutBracket(Tournament tournament, int slots)
    {
        var fixtures = new List<Match>();
        var bracketSize = NormaliseBracketSize(slots);

        if (bracketSize < 2)
        {
            return fixtures;
        }

        var stage = StageForSize(bracketSize);
        var tieNumber = 1;
        var previousLabels = new List<string>();

        var tiesInRound = bracketSize / 2;
        for (var tie = 0; tie < tiesInRound; tie++)
        {
            fixtures.Add(new Match
            {
                TournamentId = tournament.Id,
                Stage = stage,
                Round = tieNumber,
                HomePlaceholder = $"Seed {(tie * 2) + 1}",
                AwayPlaceholder = $"Seed {(tie * 2) + 2}",
                Venue = tournament.Location,
                Status = MatchStatus.Scheduled
            });

            previousLabels.Add($"{StageLabel(stage)}{tieNumber}");
            tieNumber++;
        }

        var remaining = tiesInRound;
        while (remaining > 1)
        {
            remaining /= 2;
            stage = StageForSize(remaining * 2);
            var currentLabels = new List<string>();

            for (var tie = 0; tie < remaining; tie++)
            {
                fixtures.Add(new Match
                {
                    TournamentId = tournament.Id,
                    Stage = stage,
                    Round = tieNumber,
                    HomePlaceholder = $"Winner {previousLabels[tie * 2]}",
                    AwayPlaceholder = $"Winner {previousLabels[(tie * 2) + 1]}",
                    Venue = tournament.Location,
                    Status = MatchStatus.Scheduled
                });

                currentLabels.Add($"{StageLabel(stage)}{tieNumber}");
                tieNumber++;
            }

            previousLabels = currentLabels;
        }

        if (tournament.HasThirdPlacePlayOff && fixtures.Any(fixture => fixture.Stage == MatchStage.SemiFinal))
        {
            var semiFinals = fixtures.Where(fixture => fixture.Stage == MatchStage.SemiFinal).ToList();

            fixtures.Add(new Match
            {
                TournamentId = tournament.Id,
                Stage = MatchStage.ThirdPlacePlayOff,
                Round = tieNumber,
                HomePlaceholder = $"Loser SF{semiFinals[0].Round}",
                AwayPlaceholder = $"Loser SF{semiFinals[1].Round}",
                Venue = tournament.Location,
                Status = MatchStatus.Scheduled
            });
        }

        return fixtures;
    }

    /// <summary>Rounds the slot count down to the nearest power of two, capped at 32.</summary>
    public static int NormaliseBracketSize(int slots)
    {
        if (slots < 2)
        {
            return 0;
        }

        var size = 2;
        while (size * 2 <= Math.Min(slots, 32))
        {
            size *= 2;
        }

        return size;
    }

    /// <summary>Stable identifier for a tie, used to wire winners into the next round.</summary>
    public static string TieLabel(MatchStage stage, int round) => $"{StageLabel(stage)}{round}";

    private static MatchStage StageForSize(int size) => size switch
    {
        >= 32 => MatchStage.RoundOf32,
        16 => MatchStage.RoundOf16,
        8 => MatchStage.QuarterFinal,
        4 => MatchStage.SemiFinal,
        _ => MatchStage.Final
    };

    public static string StageLabel(MatchStage stage) => stage switch
    {
        MatchStage.RoundOf32 => "R32-",
        MatchStage.RoundOf16 => "R16-",
        MatchStage.QuarterFinal => "QF",
        MatchStage.SemiFinal => "SF",
        MatchStage.ThirdPlacePlayOff => "3RD",
        _ => "F"
    };
}
