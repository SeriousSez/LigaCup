using System.Text.Json;
using LigaCup.ApplicationService.Contracts;
using LigaCup.ApplicationService.Services;
using LigaCup.Domain.Entities;
using LigaCup.Domain.Enums;
using LigaCup.Infrastructure;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace LigaCup.Domain.Tests;

public class TournamentSchedulingTests
{
    [Theory]
    [InlineData(null)]
    [InlineData(0)]
    public async Task EightTeamsGenerateFourMatchesInEveryRound(int? sittingOut)
    {
        using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        await using var db = new LigaCupContext(new DbContextOptionsBuilder<LigaCupContext>().UseSqlite(connection).Options);
        await db.Database.EnsureCreatedAsync();
        var tournament = CreateTournament();
        db.Tournaments.Add(tournament);
        await db.SaveChangesAsync();
        var service = new TournamentService(db);

        Assert.Equal(28, await service.GenerateFixturesAsync(tournament.Id,
            new GenerateFixturesRequest(true, false, false, null, null, sittingOut)));
        db.ChangeTracker.Clear();
        var saved = (await service.LoadGraphAsync(tournament.Id))!;
        Assert.Equal(7, saved.Matches.GroupBy(m => m.Round).Count());
        Assert.All(saved.Matches.GroupBy(m => m.Round), round =>
        {
            Assert.Equal(4, round.Count());
            Assert.Equal(8, round.SelectMany(m => new[] { m.HomeTeamId, m.AwayTeamId }).Distinct().Count());
            Assert.All(round, match => Assert.Equal(tournament.TournamentDateUtc!.Value.AddMinutes((round.Key - 1) * 15), match.KickoffUtc));
        });
    }

    [Fact]
    public async Task SavingDisplaySettingsAndGeneratingWithoutReplacementPreservesCustomSchedule()
    {
        using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        await using var db = new LigaCupContext(new DbContextOptionsBuilder<LigaCupContext>().UseSqlite(connection).Options);
        await db.Database.EnsureCreatedAsync();
        var tournament = CreateTournament();
        db.Tournaments.Add(tournament);
        await db.SaveChangesAsync();
        var service = new TournamentService(db);
        await service.GenerateFixturesAsync(tournament.Id, new GenerateFixturesRequest(true, false, false, null, null));
        var matches = await db.Matches.OrderBy(m => m.Id).ToListAsync();
        matches[0].KickoffUtc = tournament.TournamentDateUtc!.Value.AddMinutes(7);
        matches[0].PitchNumber = 9;
        matches[0].Venue = "Custom field";
        matches[0].SortOrder = 42;
        var before = Snapshot(matches);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        for (var i = 0; i < 3; i++)
        {
            var saved = (await service.LoadGraphAsync(tournament.Id))!;
            // The summary is the same data the editor loads before changing visibility.
            var request = JsonSerializer.Deserialize<SaveTournamentRequest>(
                JsonSerializer.Serialize(service.BuildDetail(saved).Tournament))!;
            await service.SaveTournamentAsync(tournament.Id, request with
            {
                HideMatchAddresses = !saved.HideMatchAddresses,
                ShowMatchTimesOnly = !saved.ShowMatchTimesOnly
            });
            db.ChangeTracker.Clear();
            Assert.Equal(tournament.TournamentDateUtc, (await service.LoadGraphAsync(tournament.Id))!.TournamentDateUtc);
            Assert.Equal(before, Snapshot(await db.Matches.AsNoTracking().OrderBy(m => m.Id).ToListAsync()));
        }

        Assert.Equal(0, await service.GenerateFixturesAsync(tournament.Id, new GenerateFixturesRequest(true, false, false, null, null)));
        db.ChangeTracker.Clear();
        Assert.Equal(before, Snapshot(await db.Matches.AsNoTracking().OrderBy(m => m.Id).ToListAsync()));
    }

    private static string Snapshot(IEnumerable<Match> matches) => JsonSerializer.Serialize(matches.Select(m => new
    {
        m.Id, m.Round, m.HomeTeamId, m.AwayTeamId, m.KickoffUtc, m.PitchNumber, m.Venue, m.SortOrder
    }));

    private static Tournament CreateTournament() => new()
    {
        Name = "Local U9 regression", Slug = "local-u9-regression", Format = TournamentFormat.League,
        TournamentDateUtc = new DateTime(2026, 10, 25, 12, 0, 0, DateTimeKind.Utc),
        PeriodCount = 1, PeriodDurationMinutes = 10, MatchIntervalMinutes = 5, MatchesPerTimeSlot = 4,
        Teams = Enumerable.Range(1, 8).Select(i => new Team { Name = $"Team {i}", SortOrder = i }).ToList()
    };
}
