using LigaCup.Domain.Entities;
using LigaCup.Domain.Scheduling;

namespace LigaCup.Domain.Tests;

public class ByeSelectionTests
{
    public static IEnumerable<object[]> ValidSelections()
    {
        foreach (var count in new[] { 3, 5, 7, 9 })
        {
            yield return [count, new int?[count]];
            var one = new int?[count];
            one[0] = 3;
            yield return [count, one];
            var several = new int?[count];
            several[1] = count;
            several[^1] = 1;
            yield return [count, several];
            yield return [count, Enumerable.Range(1, count).Reverse().Select(id => (int?)id).ToArray()];
        }
        yield return [5, new int?[] { 3, 5, 1, 4, 2 }];
        yield return [5, new int?[] { 3 }]; // Omitted trailing choices are automatic too.
    }

    [Theory]
    [MemberData(nameof(ValidSelections))]
    public void ValidSelectionsPreserveEveryPairAndGiveEachTeamOneBye(int count, int?[] choices)
    {
        var fixtures = Generate(count, choices);
        AssertStandardRoundRobin(count, fixtures);
        var byes = Byes(count, fixtures);
        for (var round = 0; round < choices.Length; round++)
            if (choices[round] is int selected) Assert.Equal(selected, byes[round]);
    }

    [Theory]
    [InlineData(3)]
    [InlineData(5)]
    [InlineData(7)]
    [InlineData(9)]
    public void AllAutomaticChoicesKeepTheExistingFixtureOrder(int count)
    {
        var original = Generate(count, null);
        var explicitAutomatic = Generate(count, new int?[count]);
        Assert.Equal(original.Select(m => (m.Round, m.SortOrder, m.HomeTeamId, m.AwayTeamId)),
            explicitAutomatic.Select(m => (m.Round, m.SortOrder, m.HomeTeamId, m.AwayTeamId)));
        AssertStandardRoundRobin(count, original);
    }

    [Theory]
    [InlineData(2)]
    [InlineData(4)]
    [InlineData(6)]
    [InlineData(8)]
    public void EvenTeamGenerationStillHasEveryPairAndNoByes(int count)
    {
        AssertStandardRoundRobin(count, Generate(count, null));
        AssertStandardRoundRobin(count, Generate(count, new int?[count - 1]));
    }

    public static IEnumerable<object[]> InvalidSelections()
    {
        yield return [5, new int?[] { 3, null, 3, null, null }];
        yield return [5, new int?[] { 3, 5, 1, 4, 3 }];
        yield return [5, new int?[] { 99, null, null, null, null }];
        yield return [5, new int?[] { -1, null, null, null, null }];
        yield return [5, new int?[] { 1, 2, 3, 4, 5, 1 }];
        yield return [4, new int?[] { 1, null, null }];
    }

    [Theory]
    [MemberData(nameof(InvalidSelections))]
    public void InvalidChoicesHaveAByeValidationError(int count, int?[] choices)
    {
        var error = Assert.Throws<ArgumentException>(() => Generate(count, choices));
        Assert.Equal("byeTeamIds", error.ParamName);
        Assert.False(string.IsNullOrWhiteSpace(error.Message));
    }

    [Fact]
    public void MixedAutomaticFirstRoundRespectsTheExistingFirstHomeSelection()
    {
        // Reserve the original first-round bye elsewhere; automatic selection must still let team 3 play.
        var natural = Generate(5, null, firstHome: 3);
        var choices = new int?[5];
        choices[2] = Byes(5, natural)[0];
        var fixtures = Generate(5, choices, firstHome: 3);
        AssertStandardRoundRobin(5, fixtures);
        Assert.Equal(3, fixtures[0].HomeTeamId);
        Assert.Equal(choices[2], Byes(5, fixtures)[2]);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void ContradictoryFirstHomeAndByeChoicesAreExplained(bool explicitFirstBye)
    {
        int?[] choices = explicitFirstBye ? [3, null, null, null, null] : [null, 1, 2, 4, 5];
        var error = Assert.Throws<ArgumentException>(() => Generate(5, choices, firstHome: 3));
        Assert.Equal("firstHomeTeamId", error.ParamName);
        Assert.Contains("must play in the first round", error.Message);
    }

    [Theory]
    [InlineData(2)]
    [InlineData(3)]
    public void ReturnLegsRepeatByesAndReverseHomeAdvantage(int legs)
    {
        var fixtures = Generate(5, [3, null, 1, null, null], legs);
        Assert.Equal(10 * legs, fixtures.Count);
        for (var leg = 0; leg < legs; leg++)
        {
            var matches = fixtures.Where(m => m.Round > leg * 5 && m.Round <= (leg + 1) * 5).ToList();
            AssertStandardRoundRobin(5, matches);
            Assert.Equal(3, Byes(5, matches)[0]);
            Assert.Equal(1, Byes(5, matches)[2]);
            Assert.Equal(fixtures.Take(10).Select(m => leg % 2 == 0 ? (m.HomeTeamId, m.AwayTeamId) : (m.AwayTeamId, m.HomeTeamId)),
                matches.Select(m => (m.HomeTeamId, m.AwayTeamId)));
        }
    }

    private static List<Match> Generate(int count, int?[]? choices, int legs = 1, int? firstHome = null) =>
        FixtureGenerator.GenerateGroupFixtures(new Tournament { Id = 1, GroupRounds = legs },
            new TournamentGroup { Id = 1, TournamentId = 1 },
            Enumerable.Range(1, count).Select(id => new Team { Id = id, Name = $"Team {id}" }).ToList(), choices, firstHome);

    private static int[] Byes(int count, IEnumerable<Match> fixtures) => fixtures.GroupBy(m => m.Round).OrderBy(g => g.Key)
        .Select(round => Enumerable.Range(1, count).Except(round.SelectMany(m => new[] { m.HomeTeamId!.Value, m.AwayTeamId!.Value })).Single()).ToArray();

    internal static void AssertStandardRoundRobin(int count, IReadOnlyList<Match> fixtures)
    {
        Assert.Equal(count * (count - 1) / 2, fixtures.Count);
        Assert.Equal(count % 2 == 0 ? count - 1 : count, fixtures.Select(m => m.Round).Distinct().Count());
        var pairs = fixtures.Select(m => (Math.Min(m.HomeTeamId!.Value, m.AwayTeamId!.Value), Math.Max(m.HomeTeamId.Value, m.AwayTeamId.Value))).ToList();
        Assert.Equal(pairs.Count, pairs.Distinct().Count());
        foreach (var home in Enumerable.Range(1, count))
            foreach (var away in Enumerable.Range(home + 1, count - home)) Assert.Contains((home, away), pairs);
        foreach (var round in fixtures.GroupBy(m => m.Round))
        {
            Assert.Equal(count / 2, round.Count());
            Assert.Equal(count / 2 * 2, round.SelectMany(m => new[] { m.HomeTeamId, m.AwayTeamId }).Distinct().Count());
        }
        if (count % 2 == 1) Assert.Equal(Enumerable.Range(1, count), Byes(count, fixtures).Order());
    }
}
