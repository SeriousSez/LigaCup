using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LigaCup.ApplicationService.Contracts;
using LigaCup.Domain.Entities;
using LigaCup.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace LigaCup.Domain.Tests;

public class ByeSelectionApiTests
{
    private const string Path = "/api/admin/tournaments/100/fixtures";

    [Fact]
    public async Task MixedByesGenerateThroughHttpAndRetryDoesNotDuplicateFixtures()
    {
        using var factory = new Phase1ApiFactory();
        using var client = factory.CreateClient();
        await Phase1ApiFactory.Login(client);
        await CreateCup(factory, 5);
        var body = new GenerateFixturesRequest(true, false, false, [3, null, 1, null, null], null);
        async Task<HttpResponseMessage> Generate()
        {
            var request = new HttpRequestMessage(HttpMethod.Post, Path) { Content = JsonContent.Create(body) };
            request.Headers.Add("Idempotency-Key", "f02-mixed");
            return await client.SendAsync(request);
        }
        var response = await Generate();
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadAsStringAsync();
        Assert.Equal(10, JsonDocument.Parse(result).RootElement.GetProperty("generated").GetInt32());
        Assert.Equal(result, await (await Generate()).Content.ReadAsStringAsync());
        await factory.InDb(async db =>
        {
            var fixtures = await db.Matches.AsNoTracking().OrderBy(m => m.Round).ThenBy(m => m.SortOrder).ToListAsync();
            ByeSelectionTests.AssertStandardRoundRobin(5, fixtures);
            Assert.DoesNotContain(fixtures.Where(m => m.Round == 1), m => m.HomeTeamId == 3 || m.AwayTeamId == 3);
            Assert.DoesNotContain(fixtures.Where(m => m.Round == 3), m => m.HomeTeamId == 1 || m.AwayTeamId == 1);
            Assert.Equal(1, await db.CommandReceipts.CountAsync());
        });
    }

    [Theory]
    [InlineData("duplicate", "byeTeamIds", "at most once")]
    [InlineData("foreign", "byeTeamIds", "belong to this tournament")]
    [InlineData("extra", "byeTeamIds", "only 5 rounds")]
    [InlineData("even", "byeTeamIds", "odd number")]
    [InlineData("firstHome", "firstHomeTeamId", "must play in the first round")]
    public async Task InvalidByeReplacementReturns400AndPreservesSavedMatches(string kind, string field, string message)
    {
        using var factory = new Phase1ApiFactory();
        using var client = factory.CreateClient();
        await Phase1ApiFactory.Login(client);
        await CreateCup(factory, kind == "even" ? 4 : 5);
        (await client.PostAsJsonAsync(Path, new GenerateFixturesRequest(true, false, false, null, null))).EnsureSuccessStatusCode();
        await factory.InDb(async db =>
        {
            var match = await db.Matches.FirstAsync();
            match.Venue = "Keep my custom venue";
            match.PitchNumber = 9;
            match.HomeScore = 2;
            match.Status = MatchStatus.Finished;
            await db.SaveChangesAsync();
        });
        string? before = null;
        await factory.InDb(async db => before = JsonSerializer.Serialize(await db.Matches.AsNoTracking().OrderBy(m => m.Id).ToListAsync()));
        int?[] selections = kind switch
        {
            "duplicate" => [3, null, 3, null, null],
            "foreign" => [99, null, null, null, null],
            "extra" => [1, 2, 3, 4, 5, 1],
            "even" => [1, null, null],
            _ => [3, null, null, null, null]
        };
        var invalid = new GenerateFixturesRequest(true, false, true, selections, kind == "firstHome" ? 3 : null);
        var request = new HttpRequestMessage(HttpMethod.Post, Path) { Content = JsonContent.Create(invalid) };
        request.Headers.Add("Idempotency-Key", "f02-invalid");
        var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Contains(message, json.RootElement.GetProperty("message").GetString());
        Assert.True(json.RootElement.GetProperty("errors").TryGetProperty(field, out _));
        await factory.InDb(async db =>
        {
            Assert.Equal(before, JsonSerializer.Serialize(await db.Matches.AsNoTracking().OrderBy(m => m.Id).ToListAsync()));
            Assert.Null((await db.Tournaments.FindAsync(100))!.FirstHomeTeamId);
            Assert.Empty(await db.CommandReceipts.ToListAsync());
        });
    }

    private static Task CreateCup(Phase1ApiFactory factory, int count) => factory.InDb(async db =>
    {
        db.Tournaments.Add(new Tournament
        {
            Id = 100, Name = "F02 synthetic cup", Slug = "f02-test", Format = TournamentFormat.League,
            GroupRounds = 1, Teams = Enumerable.Range(1, count).Select(id => new Team { Id = id, Name = $"Team {id}", SortOrder = id }).ToList()
        });
        db.Tournaments.Add(new Tournament { Id = 200, Name = "Other cup", Slug = "f02-other", Teams = [new Team { Id = 99, Name = "Foreign team" }] });
        await db.SaveChangesAsync();
    });
}
