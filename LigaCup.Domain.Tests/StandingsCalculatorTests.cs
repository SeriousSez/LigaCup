using LigaCup.Domain.Entities;
using LigaCup.Domain.Enums;
using LigaCup.Domain.Scheduling;
using LigaCup.Domain.Standings;

namespace LigaCup.Domain.Tests;

public class StandingsCalculatorTests
{
    private static Tournament BuildTournament(string tiebreakers = "GoalDifference,GoalsScored,TeamName") => new()
    {
        Id = 1,
        Name = "Liga Cup",
        PointsForWin = 3,
        PointsForDraw = 1,
        PointsForLoss = 0,
        TeamsAdvancingPerGroup = 2,
        Format = TournamentFormat.GroupsThenKnockout,
        TiebreakerOrder = tiebreakers
    };

    private static List<Team> BuildTeams(params string[] names) =>
        names.Select((name, index) => new Team { Id = index + 1, TournamentId = 1, GroupId = 1, Name = name }).ToList();

    private static Match Result(int homeTeamId, int awayTeamId, int homeScore, int awayScore) => new()
    {
        Id = (homeTeamId * 100) + awayTeamId,
        TournamentId = 1,
        GroupId = 1,
        Stage = MatchStage.Group,
        Status = MatchStatus.Finished,
        HomeTeamId = homeTeamId,
        AwayTeamId = awayTeamId,
        HomeScore = homeScore,
        AwayScore = awayScore
    };

    [Fact]
    public void AwardsThreePointsForAWinAndOneForADraw()
    {
        var teams = BuildTeams("Alpha", "Beta", "Gamma");
        var matches = new List<Match> { Result(1, 2, 2, 0), Result(2, 3, 1, 1) };

        var table = StandingsCalculator.Calculate(BuildTournament(), teams, matches, groupId: 1);

        Assert.Equal("Alpha", table[0].TeamName);
        Assert.Equal(3, table[0].Points);
        Assert.Equal(1, table[0].Won);
        Assert.Equal(1, table.Single(row => row.TeamName == "Beta").Points);
        Assert.Equal(1, table.Single(row => row.TeamName == "Gamma").Points);
    }

    [Fact]
    public void IgnoresMatchesThatHaveNotFinished()
    {
        var teams = BuildTeams("Alpha", "Beta");
        var live = Result(1, 2, 3, 0);
        live.Status = MatchStatus.Live;

        var table = StandingsCalculator.Calculate(BuildTournament(), teams, [live], groupId: 1);

        Assert.All(table, row => Assert.Equal(0, row.Played));
        Assert.All(table, row => Assert.Equal(0, row.Points));
    }

    [Fact]
    public void SeparatesLevelTeamsOnGoalDifferenceThenGoalsScored()
    {
        var teams = BuildTeams("Alpha", "Beta", "Gamma", "Delta");

        // Alpha and Beta both finish on 3 points. Beta has the better goal difference.
        var matches = new List<Match>
        {
            Result(1, 3, 1, 0),
            Result(2, 4, 4, 0)
        };

        var table = StandingsCalculator.Calculate(BuildTournament(), teams, matches, groupId: 1);

        Assert.Equal("Beta", table[0].TeamName);
        Assert.Equal(4, table[0].GoalDifference);
        Assert.Equal("Alpha", table[1].TeamName);
    }

    [Fact]
    public void HeadToHeadOnlyComparesTheTeamsThatAreStillLevel()
    {
        var teams = BuildTeams("Alpha", "Beta", "Gamma");

        // Alpha and Beta both take 3 points with an identical goal difference, but Beta beat Alpha.
        var matches = new List<Match>
        {
            Result(2, 1, 1, 0),
            Result(1, 3, 1, 0)
        };

        var tournament = BuildTournament("HeadToHeadPoints,GoalDifference,TeamName");
        var table = StandingsCalculator.Calculate(tournament, teams, matches, groupId: 1);

        Assert.Equal("Beta", table[0].TeamName);
        Assert.Equal("Alpha", table[1].TeamName);
    }

    [Fact]
    public void AppliesOrganiserPointsDeductions()
    {
        var teams = BuildTeams("Alpha", "Beta");
        teams[0].PointsAdjustment = -3;

        var table = StandingsCalculator.Calculate(BuildTournament(), teams, [Result(1, 2, 1, 0)], groupId: 1);

        // The win is wiped out by the deduction, leaving both teams level on nothing.
        Assert.Equal(0, table.Single(row => row.TeamName == "Alpha").Points);
        Assert.Equal(0, table.Single(row => row.TeamName == "Beta").Points);
        Assert.Equal(1, table.Single(row => row.TeamName == "Alpha").Won);
    }

    [Fact]
    public void MarksTheQualifyingPositions()
    {
        var teams = BuildTeams("Alpha", "Beta", "Gamma", "Delta");
        var table = StandingsCalculator.Calculate(BuildTournament(), teams, [Result(1, 2, 1, 0)], groupId: 1);

        Assert.True(table[0].IsQualifying);
        Assert.True(table[1].IsQualifying);
        Assert.False(table[2].IsQualifying);
    }

    [Fact]
    public void FormShowsTheMostRecentResultFirst()
    {
        var teams = BuildTeams("Alpha", "Beta", "Gamma");

        var win = Result(1, 2, 2, 0);
        win.KickoffUtc = new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc);
        var loss = Result(3, 1, 1, 0);
        loss.KickoffUtc = new DateTime(2026, 6, 8, 12, 0, 0, DateTimeKind.Utc);

        var table = StandingsCalculator.Calculate(BuildTournament(), teams, [win, loss], groupId: 1);
        var alpha = table.Single(row => row.TeamName == "Alpha");

        Assert.Equal(["L", "W"], alpha.Form);
    }
}

public class FixtureGeneratorTests
{
    private static Tournament BuildTournament(int rounds = 1) => new()
    {
        Id = 1,
        GroupRounds = rounds,
        TeamsAdvancingPerGroup = 2,
        Format = TournamentFormat.GroupsThenKnockout
    };

    private static List<Team> BuildTeams(int count) =>
        Enumerable.Range(1, count).Select(index => new Team { Id = index, Name = $"Team {index}", GroupId = 1 }).ToList();

    [Theory]
    [InlineData(4, 6)]
    [InlineData(5, 10)]
    [InlineData(6, 15)]
    [InlineData(8, 28)]
    public void EveryTeamPlaysEveryOtherTeamOnce(int teamCount, int expectedFixtures)
    {
        var group = new TournamentGroup { Id = 1, TournamentId = 1, Name = "Group A" };
        var fixtures = FixtureGenerator.GenerateGroupFixtures(BuildTournament(), group, BuildTeams(teamCount));

        Assert.Equal(expectedFixtures, fixtures.Count);

        var pairings = fixtures
            .Select(fixture => (Low: Math.Min(fixture.HomeTeamId!.Value, fixture.AwayTeamId!.Value),
                                High: Math.Max(fixture.HomeTeamId!.Value, fixture.AwayTeamId!.Value)))
            .ToList();

        Assert.Equal(pairings.Count, pairings.Distinct().Count());
    }

    [Fact]
    public void AnOddNumberOfTeamsRotatesOneByePerRound()
    {
        var group = new TournamentGroup { Id = 1, TournamentId = 1, Name = "Group A" };
        var teams = BuildTeams(5);
        var fixtures = FixtureGenerator.GenerateGroupFixtures(BuildTournament(), group, teams);

        var byeTeamIds = fixtures
            .GroupBy(fixture => fixture.Round)
            .Select(round => teams.Select(team => team.Id)
                .Except(round.SelectMany(fixture => new[] { fixture.HomeTeamId!.Value, fixture.AwayTeamId!.Value }))
                .Single())
            .ToList();

        Assert.Equal(5, byeTeamIds.Count);
        Assert.Equal(teams.Select(team => team.Id).Order(), byeTeamIds.Order());
    }

    [Fact]
    public void ADoubleRoundRobinPlaysEveryPairTwice()
    {
        var group = new TournamentGroup { Id = 1, TournamentId = 1, Name = "Group A" };
        var fixtures = FixtureGenerator.GenerateGroupFixtures(BuildTournament(rounds: 2), group, BuildTeams(4));

        Assert.Equal(12, fixtures.Count);

        // Home advantage flips on the return leg, so each ordered pairing appears exactly once.
        var ordered = fixtures.Select(fixture => (fixture.HomeTeamId, fixture.AwayTeamId)).ToList();
        Assert.Equal(ordered.Count, ordered.Distinct().Count());
    }

    [Fact]
    public void GeneratedFixturesUseTheTournamentLocation()
    {
        var tournament = BuildTournament();
        tournament.Location = "Stadion 5, 4600 Køge";
        var group = new TournamentGroup { Id = 1, TournamentId = 1, Name = "Group A" };

        var groupFixtures = FixtureGenerator.GenerateGroupFixtures(tournament, group, BuildTeams(4));
        var knockoutFixtures = FixtureGenerator.GenerateKnockoutBracket(tournament, slots: 4);

        Assert.All(groupFixtures, fixture => Assert.Equal(tournament.Location, fixture.Venue));
        Assert.All(knockoutFixtures, fixture => Assert.Equal(tournament.Location, fixture.Venue));
    }

    [Fact]
    public void BuildsABracketWithPlaceholdersThatChainBetweenRounds()
    {
        var tournament = BuildTournament();
        tournament.HasThirdPlacePlayOff = true;

        var fixtures = FixtureGenerator.GenerateKnockoutBracket(tournament, slots: 8);

        Assert.Equal(4, fixtures.Count(fixture => fixture.Stage == MatchStage.QuarterFinal));
        Assert.Equal(2, fixtures.Count(fixture => fixture.Stage == MatchStage.SemiFinal));
        Assert.Single(fixtures, fixture => fixture.Stage == MatchStage.Final);
        Assert.Single(fixtures, fixture => fixture.Stage == MatchStage.ThirdPlacePlayOff);

        var quarterFinalLabels = fixtures
            .Where(fixture => fixture.Stage == MatchStage.QuarterFinal)
            .Select(fixture => $"Winner {FixtureGenerator.TieLabel(fixture.Stage, fixture.Round)}")
            .ToList();

        var semiFinalPlaceholders = fixtures
            .Where(fixture => fixture.Stage == MatchStage.SemiFinal)
            .SelectMany(fixture => new[] { fixture.HomePlaceholder, fixture.AwayPlaceholder })
            .ToList();

        Assert.All(quarterFinalLabels, label => Assert.Contains(label, semiFinalPlaceholders));
    }

    [Theory]
    [InlineData(6, 4)]
    [InlineData(8, 8)]
    [InlineData(3, 2)]
    [InlineData(1, 0)]
    public void RoundsTheBracketDownToAPowerOfTwo(int slots, int expected)
    {
        Assert.Equal(expected, FixtureGenerator.NormaliseBracketSize(slots));
    }
}

public class MatchTests
{
    [Fact]
    public void APenaltyShootoutDecidesALevelKnockoutTie()
    {
        var match = new Match
        {
            Stage = MatchStage.Final,
            Status = MatchStatus.Finished,
            HomeTeamId = 1,
            AwayTeamId = 2,
            HomeScore = 1,
            AwayScore = 1,
            HomePenalties = 3,
            AwayPenalties = 4
        };

        Assert.Equal(2, match.GetWinnerTeamId());
    }

    [Fact]
    public void ALevelTieWithNoShootoutHasNoWinnerYet()
    {
        var match = new Match
        {
            Stage = MatchStage.SemiFinal,
            Status = MatchStatus.Finished,
            HomeTeamId = 1,
            AwayTeamId = 2,
            HomeScore = 2,
            AwayScore = 2
        };

        Assert.Null(match.GetWinnerTeamId());
    }
}
