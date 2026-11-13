using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using LigaCup.ApplicationService.Contracts;
using LigaCup.Domain.Entities;
using LigaCup.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Data.Sqlite;
using LigaCup.Infrastructure;

namespace LigaCup.Domain.Tests;

public class Phase2ApiTests
{
    [Fact]
    public async Task ReceiptMigrationUpgradesExistingSyntheticDataWithoutChangingIt()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        await using var db = new LigaCupContext(new DbContextOptionsBuilder<LigaCupContext>().UseSqlite(connection).Options);
        var previous = db.Database.GetMigrations().Where(id => id != "20261113000000_CommandReceipts").Last();
        await db.GetService<IMigrator>().MigrateAsync(previous);
        db.Tournaments.Add(new Tournament { Id = 1, Name = "Preserve", Slug = "preserve", Rules = "Existing custom content" });
        await db.SaveChangesAsync();
        var before = JsonSerializer.Serialize(await db.Tournaments.AsNoTracking().SingleAsync());
        await db.Database.MigrateAsync();
        Assert.Equal(before, JsonSerializer.Serialize(await db.Tournaments.AsNoTracking().SingleAsync()));
        Assert.Contains("20261113000000_CommandReceipts", await db.Database.GetAppliedMigrationsAsync());
        Assert.Empty(await db.CommandReceipts.ToListAsync());
        Assert.False(db.Database.HasPendingModelChanges());
    }

    private static SaveMatchRequest Changes(int pitch = 1) => new(10, MatchStage.Group, 1, 0, 10, 11, null, null, DateTime.Parse("2026-11-13T12:00:00Z").ToUniversalTime(), pitch, "Local");
    private static async Task<MatchDto> Create(HttpClient client) => (await (await client.PostAsJsonAsync("/api/admin/tournaments/10/matches", Changes())).Content.ReadFromJsonAsync<MatchDto>(Phase1ApiFactory.Json))!;
    private static JsonObject Versioned(object value, string? revision)
    {
        var json = JsonSerializer.SerializeToNode(value, Phase1ApiFactory.Json)!.AsObject();
        json["revision"] = revision;
        return json;
    }
    private static Task<HttpResponseMessage> Command(HttpClient client, HttpMethod method, string path, object body, string key)
    {
        var request = new HttpRequestMessage(method, path) { Content = JsonContent.Create(body) };
        request.Headers.Add("Idempotency-Key", key);
        return client.SendAsync(request);
    }

    [Fact]
    public async Task TwoAdministratorsCannotOverwriteStaleSettingsTeamsPlayersOrSchedules()
    {
        using var factory = new Phase1ApiFactory();
        using var a = factory.CreateClient(); using var b = factory.CreateClient();
        await Phase1ApiFactory.Login(a); await Phase1ApiFactory.Login(b); await factory.SeedTournament();
        var match = await Create(a);
        var detail = (await a.GetFromJsonAsync<TournamentDetailDto>("/api/tournaments/phase-one", Phase1ApiFactory.Json))!;
        var cases = new (string Path, object Value, string Revision)[] {
            ("/api/admin/tournaments/10/matches/" + match.Id, Changes(4), match.Revision),
            ("/api/admin/tournaments/10", JsonSerializer.Deserialize<SaveTournamentRequest>(JsonSerializer.Serialize(detail.Tournament, Phase1ApiFactory.Json), Phase1ApiFactory.Json)! with { Description = "admin A" }, detail.Tournament.Revision),
            ("/api/admin/tournaments/10/teams/10", new SaveTeamRequest("Renamed", "R", "#123456", null, "Manager", 10, -4), detail.Teams.Single(t => t.Id == 10).Revision),
            ("/api/admin/tournaments/players/10", new SavePlayerRequest(10, "New name", 7, null, true), detail.Teams.Single(t => t.Id == 10).Players.Single().Revision)
        };
        foreach (var (path, value, revision) in cases)
        {
            (await a.PutAsJsonAsync(path, Versioned(value, revision))).EnsureSuccessStatusCode();
            var stale = await b.PutAsJsonAsync(path, Versioned(value, revision));
            Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
            Assert.Contains("preserved draft", await stale.Content.ReadAsStringAsync());
            Assert.Equal(HttpStatusCode.Conflict, (await b.PutAsJsonAsync(path, value)).StatusCode);
        }
        await factory.InDb(async db => Assert.Equal(4, (await db.Matches.SingleAsync()).PitchNumber));
    }

    [Fact]
    public async Task BulkSaveRollsBackEarlierItemsOnValidationFailureAndRejectsStaleBatch()
    {
        using var factory = new Phase1ApiFactory(); using var client = factory.CreateClient();
        await Phase1ApiFactory.Login(client); await factory.SeedTournament();
        var first = await Create(client); var second = await Create(client);
        var invalid = new BulkMatchRequest([new(first.Id, first.Revision, Changes(3)), new(second.Id, second.Revision, Changes(-1))]);
        Assert.Equal(HttpStatusCode.BadRequest, (await Command(client, HttpMethod.Put, "/api/admin/tournaments/10/matches/bulk", invalid, "invalid-batch")).StatusCode);
        await factory.InDb(async db => { Assert.All(await db.Matches.ToListAsync(), m => Assert.Equal(1, m.PitchNumber)); Assert.Empty(await db.CommandReceipts.ToListAsync()); });
        var valid = new BulkMatchRequest([new(first.Id, first.Revision, Changes(3)), new(second.Id, second.Revision, Changes(4))]);
        var response = await Command(client, HttpMethod.Put, "/api/admin/tournaments/10/matches/bulk", valid, "batch");
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync();
        Assert.Equal(json, await (await Command(client, HttpMethod.Put, "/api/admin/tournaments/10/matches/bulk", valid, "batch")).Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.Conflict, (await client.PutAsJsonAsync("/api/admin/tournaments/10/matches/bulk", valid)).StatusCode);
    }

    [Fact]
    public async Task ConcurrentScoresAndEventsAreNotLostAndRetriesDoNotDuplicateWrites()
    {
        using var factory = new Phase1ApiFactory(); using var a = factory.CreateClient(); using var b = factory.CreateClient();
        await Phase1ApiFactory.Login(a); await Phase1ApiFactory.Login(b); await factory.SeedTournament(); var match = await Create(a);
        var path = $"/api/live/matches/{match.Id}/score/home/1";
        var responses = await Task.WhenAll(Enumerable.Range(0, 8).Select(i => Command(i % 2 == 0 ? a : b, HttpMethod.Post, path, new {}, "goal-" + i)));
        Assert.All(responses, r => r.EnsureSuccessStatusCode());
        (await Command(a, HttpMethod.Post, path, new {}, "goal-0")).EnsureSuccessStatusCode();
        var ev = new SaveMatchEventRequest(10, 10, MatchEventType.Goal, 1, null);
        var eventPath = $"/api/live/matches/{match.Id}/events";
        (await Command(a, HttpMethod.Post, eventPath, ev, "event")).EnsureSuccessStatusCode();
        (await Command(a, HttpMethod.Post, eventPath, ev, "event")).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Conflict, (await Command(a, HttpMethod.Post, eventPath, ev with { Minute = 2 }, "event")).StatusCode);
        await factory.InDb(async db => { Assert.Equal(9, (await db.Matches.SingleAsync()).HomeScore); Assert.Equal(1, await db.MatchEvents.CountAsync()); });
        // Schedule revision deliberately excludes live scores; saving a schedule cannot erase a goal.
        (await a.PutAsJsonAsync($"/api/admin/tournaments/10/matches/{match.Id}", Versioned(Changes(5), match.Revision))).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Conflict, (await b.PutAsJsonAsync($"/api/live/matches/{match.Id}/score", Versioned(new UpdateScoreRequest(0, 0, 1, 0), match.LiveRevision))).StatusCode);
    }

    [Fact]
    public async Task CopyRoundIsAtomicAndRetriesSurviveNotificationFailureAndNewClient()
    {
        using var factory = new Phase1ApiFactory { FailNotifications = true }; using var client = factory.CreateClient();
        await Phase1ApiFactory.Login(client); await factory.SeedTournament(); await Create(client); await Create(client);
        var path = "/api/admin/tournaments/10/rounds/copy";
        var copy = new CopyRoundRequest(1, 2);
        var response = await Command(client, HttpMethod.Post, path, copy, "copy"); response.EnsureSuccessStatusCode();
        using var retry = factory.CreateClient(); await Phase1ApiFactory.Login(retry);
        var repeated = await Command(retry, HttpMethod.Post, path, copy, "copy"); repeated.EnsureSuccessStatusCode();
        Assert.Equal(await response.Content.ReadAsStringAsync(), await repeated.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.Conflict, (await Command(retry, HttpMethod.Post, path, copy, "another-copy")).StatusCode);
        await factory.InDb(async db => { Assert.Equal(4, await db.Matches.CountAsync()); Assert.Equal(1, await db.CommandReceipts.CountAsync()); Assert.False(db.Database.HasPendingModelChanges()); });
    }

    [Fact]
    public async Task StaleAccountEditIsRejectedWithoutUndoingSecurityRevocation()
    {
        using var factory = new Phase1ApiFactory(); using var client = factory.CreateClient();
        await Phase1ApiFactory.Login(client);
        var created = await client.PostAsJsonAsync("/api/admin/users", new CreateUserRequest("editor", null, "password-for-test", UserRole.Editor));
        var user = (await created.Content.ReadFromJsonAsync<UserDto>(Phase1ApiFactory.Json))!;
        var change = Versioned(new UpdateUserRequest("new@test.local", UserRole.Viewer, true), user.Revision);
        (await client.PutAsJsonAsync($"/api/admin/users/{user.Id}", change)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Conflict, (await client.PutAsJsonAsync($"/api/admin/users/{user.Id}", change)).StatusCode);
    }

    [Fact]
    public async Task StructuralCreateRetryReturnsOriginalIdentityAndChangedPayloadIsRejected()
    {
        using var factory = new Phase1ApiFactory(); using var client = factory.CreateClient();
        await Phase1ApiFactory.Login(client); await factory.SeedTournament();
        var path = "/api/admin/tournaments/10/groups";
        var request = new SaveGroupRequest("Retry group", 3);
        var first = await Command(client, HttpMethod.Post, path, request, "create-group"); first.EnsureSuccessStatusCode();
        var second = await Command(client, HttpMethod.Post, path, request, "create-group"); second.EnsureSuccessStatusCode();
        Assert.Equal(await first.Content.ReadAsStringAsync(), await second.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.Conflict, (await Command(client, HttpMethod.Post, path, request with { Name = "Different" }, "create-group")).StatusCode);
        await factory.InDb(async db => Assert.Equal(1, await db.Groups.CountAsync(g => g.Name == "Retry group")));
    }
}
