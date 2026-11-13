using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using LigaCup.ApplicationService.Contracts;
using LigaCup.ApplicationService.Security;
using LigaCup.Domain.Entities;
using LigaCup.Domain.Enums;
using LigaCup.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;

namespace LigaCup.Domain.Tests;

// The real HTTP pipeline, migrations and JWT handler, backed exclusively by a fresh in-memory DB.
public sealed class Phase1ApiFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection connection = new($"Data Source=phase1-{Guid.NewGuid():N};Mode=Memory;Cache=Shared");
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    public bool FailNotifications { get; init; }
    public Phase1ApiFactory() => connection.Open();
    private sealed class FailingBroadcaster() : LigaCup.API.Hubs.SignalRLiveUpdateBroadcaster(null!)
    {
        public override Task BroadcastAsync(LiveUpdateDto update, CancellationToken ct = default) => throw new IOException("Injected notification failure");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:LigaCupSqlite", "Data Source=:memory:");
        builder.UseSetting("Database:Provider", "Sqlite");
        builder.UseSetting("Jwt:Key", "phase-one-tests-only-signing-key-never-used-outside-tests");
        builder.UseSetting("Admin:Username", "phase1-admin");
        builder.UseSetting("Admin:Password", "local-test-password!");
        builder.ConfigureLogging(logging => logging.ClearProviders());
        builder.ConfigureServices(services =>
        {
            if (FailNotifications) { services.RemoveAll<LigaCup.API.Hubs.SignalRLiveUpdateBroadcaster>(); services.AddScoped<LigaCup.API.Hubs.SignalRLiveUpdateBroadcaster, FailingBroadcaster>(); }
            services.RemoveAll<DbContextOptions<LigaCupContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<LigaCupContext>>();
            services.AddDbContext<LigaCupContext>(options => options.UseSqlite(connection.ConnectionString));
        });
    }

    // Existing Phase 1 scenarios use the current editing contract without changing their assertions.
    public HttpClient CreateEditingClient() => CreateDefaultClient(new RevisionHandler(this));
    private sealed class RevisionHandler(Phase1ApiFactory factory) : DelegatingHandler
    {
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            if (request.Method == HttpMethod.Put && request.Content is not null)
            {
                var path = request.RequestUri!.AbsolutePath;
                if (!path.EndsWith("/status") && !path.EndsWith("/stoppage") && !path.EndsWith("/group") && !path.EndsWith("/password"))
                {
                    var json = System.Text.Json.Nodes.JsonNode.Parse(await request.Content.ReadAsStringAsync(ct))!.AsObject();
                    if (json["revision"] is null)
                    {
                        var ids = System.Text.RegularExpressions.Regex.Matches(path, @"\d+").Select(m => int.Parse(m.Value)).ToArray();
                        if (ids.Length > 0) await factory.InDb(async db => {
                            object? entity = path.Contains("/matches/") ? await db.Matches.FindAsync(ids[^1])
                                : path.Contains("/teams/") ? await db.Teams.FindAsync(ids[^1])
                                : path.Contains("/players/") ? await db.Players.FindAsync(ids[^1])
                                : path.Contains("/users/") ? await db.Users.FindAsync(ids[^1]) : await db.Tournaments.FindAsync(ids[^1]);
                            if (entity is not null) json["revision"] = EditRevision.For(entity, path.StartsWith("/api/live/"));
                        });
                        request.Content = JsonContent.Create(json);
                    }
                }
            }
            return await base.SendAsync(request, ct);
        }
    }

    public async Task InDb(Func<LigaCupContext, Task> action)
    {
        using var scope = Services.CreateScope();
        await action(scope.ServiceProvider.GetRequiredService<LigaCupContext>());
    }

    public static async Task<AuthResponse> Login(HttpClient client, string username = "phase1-admin", string password = "local-test-password!")
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(username, password));
        response.EnsureSuccessStatusCode();
        var auth = (await response.Content.ReadFromJsonAsync<AuthResponse>(Json))!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
        return auth;
    }

    public async Task SeedTournament()
    {
        await InDb(async db =>
        {
            db.Tournaments.AddRange(
                new Tournament { Id = 10, Name = "Local cup", Slug = "phase-one", Format = TournamentFormat.GroupsOnly },
                new Tournament { Id = 20, Name = "Other cup", Slug = "phase-one-other" });
            await db.SaveChangesAsync();
            db.Groups.AddRange(new TournamentGroup { Id = 10, TournamentId = 10, Name = "A" },
                new TournamentGroup { Id = 11, TournamentId = 10, Name = "B" },
                new TournamentGroup { Id = 20, TournamentId = 20, Name = "Foreign" });
            await db.SaveChangesAsync();
            db.Teams.AddRange(
                new Team { Id = 10, TournamentId = 10, GroupId = 10, Name = "Home", ShortName = "H",
                    Manager = "Manager", ColorHex = "#123456", LogoUrl = "https://example.test/logo.png", PointsAdjustment = -4, SortOrder = 7 },
                new Team { Id = 11, TournamentId = 10, GroupId = 10, Name = "Away" },
                new Team { Id = 12, TournamentId = 10, GroupId = 11, Name = "Third" },
                new Team { Id = 20, TournamentId = 20, GroupId = 20, Name = "Foreign" });
            await db.SaveChangesAsync();
            db.Players.AddRange(new Player { Id = 10, TeamId = 10, Name = "Home player" },
                new Player { Id = 11, TeamId = 11, Name = "Away player" },
                new Player { Id = 20, TeamId = 20, Name = "Foreign player" });
            await db.SaveChangesAsync();
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) connection.Dispose();
    }
}

public class Phase1ApiTests
{
    [Fact]
    public async Task ConcurrentRefreshConsumesATokenOnlyOnce()
    {
        using var factory = new Phase1ApiFactory();
        using var client = factory.CreateEditingClient();
        var auth = await Phase1ApiFactory.Login(client);
        client.DefaultRequestHeaders.Authorization = null;
        var results = await Task.WhenAll(
            client.PostAsJsonAsync("/api/auth/refresh", new RefreshRequest(auth.RefreshToken)),
            client.PostAsJsonAsync("/api/auth/refresh", new RefreshRequest(auth.RefreshToken)));
        Assert.Single(results, response => response.StatusCode == HttpStatusCode.OK);
        Assert.Single(results, response => response.StatusCode == HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task RejectedLastAdminChangePreservesTheAccountAndSession()
    {
        using var factory = new Phase1ApiFactory();
        using var client = factory.CreateEditingClient();
        await Phase1ApiFactory.Login(client);
        var users = (await client.GetFromJsonAsync<UserDto[]>("/api/admin/users", Phase1ApiFactory.Json))!;
        var admin = Assert.Single(users);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync($"/api/admin/users/{admin.Id}",
            new UpdateUserRequest(null, UserRole.Viewer, true))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/admin/users")).StatusCode);
    }

    private static SaveMatchRequest MatchRequest => new(10, MatchStage.Group, 1, 0, 10, 11, null, null,
        new DateTime(2026, 11, 13, 12, 0, 0, DateTimeKind.Utc), 1, "Local field");

    [Fact]
    public async Task PlaceholdersRemainEditableButCannotRecordPlayBeforeParticipantsAreAssigned()
    {
        using var factory = new Phase1ApiFactory();
        using var client = factory.CreateEditingClient();
        await Phase1ApiFactory.Login(client);
        await factory.SeedTournament();
        var request = MatchRequest with { HomeTeamId = null, AwayTeamId = null, HomePlaceholder = "Home TBD", AwayPlaceholder = "Away TBD" };
        var response = await client.PostAsJsonAsync("/api/admin/tournaments/10/matches", request);
        response.EnsureSuccessStatusCode();
        var match = (await response.Content.ReadFromJsonAsync<MatchDto>(Phase1ApiFactory.Json))!;
        Assert.Equal("Home TBD", match.HomeTeamName);
        Assert.Equal("Away TBD", match.AwayTeamName);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync($"/api/live/matches/{match.Id}/status",
            new UpdateMatchStatusRequest(MatchStatus.Live))).StatusCode);
        (await client.PutAsJsonAsync($"/api/admin/tournaments/10/matches/{match.Id}", MatchRequest)).EnsureSuccessStatusCode();
        (await client.PutAsJsonAsync($"/api/live/matches/{match.Id}/status", new UpdateMatchStatusRequest(MatchStatus.Live))).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Conflict, (await client.PutAsJsonAsync($"/api/admin/tournaments/10/matches/{match.Id}",
            MatchRequest with { HomeTeamId = 12 })).StatusCode);
        // A player without historical events can still move between teams within this tournament.
        (await client.PutAsJsonAsync("/api/admin/tournaments/players/10", new SavePlayerRequest(11, "Home player", 7, null, true))).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task GroupAssignmentChangesOnlyMembershipIncludingUnassignment()
    {
        using var factory = new Phase1ApiFactory();
        using var client = factory.CreateEditingClient();
        await Phase1ApiFactory.Login(client);
        await factory.SeedTournament();
        foreach (var groupId in new int?[] { 11, null, 10 })
        {
            var response = await client.PutAsJsonAsync("/api/admin/tournaments/10/teams/10/group", new { groupId });
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
            await factory.InDb(async db =>
            {
                var team = await db.Teams.SingleAsync(t => t.Id == 10);
                Assert.Equal(groupId, team.GroupId);
                Assert.Equal(("Home", "H", "Manager", "#123456", "https://example.test/logo.png", -4, 7),
                    (team.Name, team.ShortName, team.Manager, team.ColorHex, team.LogoUrl, team.PointsAdjustment, team.SortOrder));
            });
        }
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync("/api/admin/tournaments/10/teams/10/group", new { groupId = 20 })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PutAsJsonAsync("/api/admin/tournaments/20/teams/10/group", new { groupId = 20 })).StatusCode);
    }

    [Fact]
    public async Task MatchPostAndPutReturnCompleteDtoWithEventsAndClock()
    {
        using var factory = new Phase1ApiFactory();
        using var client = factory.CreateEditingClient();
        await Phase1ApiFactory.Login(client);
        await factory.SeedTournament();
        var response = await client.PostAsJsonAsync("/api/admin/tournaments/10/matches", MatchRequest);
        response.EnsureSuccessStatusCode();
        var created = (await response.Content.ReadFromJsonAsync<MatchDto>(Phase1ApiFactory.Json))!;
        AssertCompleteMatch(created);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync($"/api/live/matches/{created.Id}/events",
            new SaveMatchEventRequest(10, 10, MatchEventType.Goal, 2, "Local event"))).StatusCode);
        response = await client.PutAsJsonAsync($"/api/admin/tournaments/10/matches/{created.Id}", MatchRequest with { PitchNumber = 3 });
        response.EnsureSuccessStatusCode();
        var saved = (await response.Content.ReadFromJsonAsync<MatchDto>(Phase1ApiFactory.Json))!;
        AssertCompleteMatch(saved);
        Assert.Equal(3, saved.PitchNumber);
        Assert.Equal("Home player", Assert.Single(saved.Events).PlayerName);
        Assert.Equal(1, saved.HomeScore);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PutAsJsonAsync($"/api/admin/tournaments/10/matches/{created.Id}",
            MatchRequest with { HomeTeamId = 12 })).StatusCode);
    }

    private static void AssertCompleteMatch(MatchDto match)
    {
        Assert.True(match.Id > 0);
        Assert.Equal("Home", match.HomeTeamName);
        Assert.Equal("Away", match.AwayTeamName);
        Assert.Equal("A", match.GroupName);
        Assert.Equal("H", match.HomeTeamShortName);
        Assert.Equal("https://example.test/logo.png", match.HomeTeamLogoUrl);
        Assert.NotNull(match.Clock);
        Assert.NotNull(match.Events);
        Assert.NotNull(match.ScheduledEndUtc);
    }

    [Fact]
    public async Task InvalidRelationshipsReturnClientErrorsWithoutWritingRecords()
    {
        using var factory = new Phase1ApiFactory();
        using var client = factory.CreateEditingClient();
        await Phase1ApiFactory.Login(client);
        await factory.SeedTournament();
        foreach (var request in new[]
        {
            MatchRequest with { HomeTeamId = 20 }, MatchRequest with { AwayTeamId = 999 },
            MatchRequest with { AwayTeamId = 10 }, MatchRequest with { GroupId = 20 },
            MatchRequest with { GroupId = 999 }, MatchRequest with { Stage = (MatchStage)999 },
            MatchRequest with { Round = 0 }, MatchRequest with { PitchNumber = -1 }
        })
        {
            var response = await client.PostAsJsonAsync("/api/admin/tournaments/10/matches", request);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Contains("errors", await response.Content.ReadAsStringAsync());
        }
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsJsonAsync("/api/admin/tournaments/999/groups", new SaveGroupRequest("A", 0))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/admin/tournaments/10/teams",
            new SaveTeamRequest("Wrong group", null, null, null, null, 20, 0))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/admin/tournaments/players",
            new SavePlayerRequest(999, "Missing team", null, null, true))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync("/api/admin/tournaments/players/10",
            new SavePlayerRequest(20, "Home player", null, null, true))).StatusCode);
        await factory.InDb(async db => Assert.Equal(0, await db.Matches.CountAsync()));

        var createdResponse = await client.PostAsJsonAsync("/api/admin/tournaments/10/matches", MatchRequest);
        var match = (await createdResponse.Content.ReadFromJsonAsync<MatchDto>(Phase1ApiFactory.Json))!;
        foreach (var request in new[]
        {
            new SaveMatchEventRequest(12, null, MatchEventType.Goal, 1, null),
            new SaveMatchEventRequest(20, 20, MatchEventType.Goal, 1, null),
            new SaveMatchEventRequest(10, 11, MatchEventType.Goal, 1, null),
            new SaveMatchEventRequest(10, 999, MatchEventType.Goal, 1, null),
            new SaveMatchEventRequest(10, 10, (MatchEventType)999, 1, null),
            new SaveMatchEventRequest(10, 10, MatchEventType.Goal, -1, null)
        })
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync($"/api/live/matches/{match.Id}/events", request)).StatusCode);
        await factory.InDb(async db =>
        {
            Assert.Equal(0, await db.MatchEvents.CountAsync());
            Assert.Equal(0, (await db.Matches.SingleAsync()).HomeScore);
        });
        (await client.PostAsJsonAsync($"/api/live/matches/{match.Id}/events", new SaveMatchEventRequest(10, 10, MatchEventType.Goal, 1, null))).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Conflict, (await client.PutAsJsonAsync("/api/admin/tournaments/players/10",
            new SavePlayerRequest(11, "Home player", null, null, true))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync($"/api/live/matches/{match.Id}/status", new { status = 999 })).StatusCode);
    }

    [Fact]
    public async Task RepeatedStatusPreservesClockAndTimestampsThroughHttp()
    {
        using var factory = new Phase1ApiFactory();
        using var client = factory.CreateEditingClient();
        await Phase1ApiFactory.Login(client);
        await factory.SeedTournament();
        var response = await client.PostAsJsonAsync("/api/admin/tournaments/10/matches", MatchRequest);
        var match = (await response.Content.ReadFromJsonAsync<MatchDto>(Phase1ApiFactory.Json))!;
        foreach (var status in new[] { MatchStatus.Live, MatchStatus.Paused, MatchStatus.HalfTime, MatchStatus.Finished, MatchStatus.Scheduled })
        {
            (await client.PutAsJsonAsync($"/api/live/matches/{match.Id}/status", new UpdateMatchStatusRequest(status))).EnsureSuccessStatusCode();
            string? before = null;
            await factory.InDb(async db => before = JsonSerializer.Serialize(await db.Matches.AsNoTracking().SingleAsync()));
            (await client.PutAsJsonAsync($"/api/live/matches/{match.Id}/status", new UpdateMatchStatusRequest(status))).EnsureSuccessStatusCode();
            await factory.InDb(async db => Assert.Equal(before, JsonSerializer.Serialize(await db.Matches.AsNoTracking().SingleAsync())));
        }
    }

    [Theory]
    [InlineData("password")]
    [InlineData("role")]
    [InlineData("active")]
    [InlineData("email")]
    [InlineData("delete")]
    public async Task SecurityChangesInvalidateAllAffectedAccessAndRefreshSessions(string change)
    {
        using var factory = new Phase1ApiFactory();
        using var admin = factory.CreateEditingClient();
        await Phase1ApiFactory.Login(admin);
        var created = await admin.PostAsJsonAsync("/api/admin/users", new CreateUserRequest("target", null, "original-password!", UserRole.Admin));
        created.EnsureSuccessStatusCode();
        var user = (await created.Content.ReadFromJsonAsync<UserDto>(Phase1ApiFactory.Json))!;
        using var target = factory.CreateEditingClient();
        var first = await Phase1ApiFactory.Login(target, "target", "original-password!");
        var second = await Phase1ApiFactory.Login(target, "target", "original-password!");
        Assert.Equal(HttpStatusCode.OK, (await target.GetAsync("/api/admin/users")).StatusCode);
        var response = change switch
        {
            "password" => await admin.PutAsJsonAsync($"/api/admin/users/{user.Id}/password", new ResetPasswordRequest("replacement-password!")),
            "delete" => await admin.DeleteAsync($"/api/admin/users/{user.Id}"),
            _ => await admin.PutAsJsonAsync($"/api/admin/users/{user.Id}", new UpdateUserRequest(change == "email" ? "new@example.test" : null,
                change == "role" ? UserRole.Editor : UserRole.Admin, change != "active"))
        };
        response.EnsureSuccessStatusCode();
        foreach (var auth in new[] { first, second })
        {
            target.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
            Assert.Equal(HttpStatusCode.Unauthorized, (await target.GetAsync("/api/admin/users")).StatusCode);
            Assert.Equal(HttpStatusCode.Unauthorized, (await target.PostAsJsonAsync("/api/auth/refresh", new RefreshRequest(auth.RefreshToken))).StatusCode);
        }
        Assert.Equal(HttpStatusCode.OK, (await admin.GetAsync("/api/admin/users")).StatusCode);
        if (change == "password")
        {
            Assert.Equal(HttpStatusCode.Unauthorized, (await target.PostAsJsonAsync("/api/auth/login", new LoginRequest("target", "original-password!"))).StatusCode);
            await Phase1ApiFactory.Login(target, "target", "replacement-password!");
        }
        if (change == "active")
        {
            (await admin.PutAsJsonAsync($"/api/admin/users/{user.Id}", new UpdateUserRequest(null, UserRole.Admin, true))).EnsureSuccessStatusCode();
            Assert.Equal(HttpStatusCode.Unauthorized, (await target.PostAsJsonAsync("/api/auth/refresh", new RefreshRequest(second.RefreshToken))).StatusCode);
        }
    }

    [Fact]
    public async Task RefreshRotationAndLogoutInvalidateThePreviousAccessSession()
    {
        using var factory = new Phase1ApiFactory();
        using var client = factory.CreateEditingClient();
        var first = await Phase1ApiFactory.Login(client);
        var response = await client.PostAsJsonAsync("/api/auth/refresh", new RefreshRequest(first.RefreshToken));
        response.EnsureSuccessStatusCode();
        var second = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/admin/users")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/refresh", new RefreshRequest(first.RefreshToken))).StatusCode);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", second.Token);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/admin/users")).StatusCode);
        (await client.PostAsJsonAsync("/api/auth/logout", new RefreshRequest(second.RefreshToken))).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/admin/users")).StatusCode);
    }

    [Fact]
    public async Task LegacyHtmlIsSafeOnReadWithoutRewritingDataAndWritesAreSanitized()
    {
        using var factory = new Phase1ApiFactory();
        using var client = factory.CreateEditingClient();
        await Phase1ApiFactory.Login(client);
        await factory.SeedTournament();
        const string legacy = "<p><strong>Custom rules</strong><img src='/image.png' onerror='alert(1)'></p><script>alert(2)</script>";
        await factory.InDb(async db =>
        {
            var tournament = await db.Tournaments.FindAsync(10);
            tournament!.Rules = legacy;
            tournament.Parking = legacy;
            await db.SaveChangesAsync();
        });
        var detail = (await client.GetFromJsonAsync<TournamentDetailDto>("/api/tournaments/phase-one", Phase1ApiFactory.Json))!;
        Assert.Contains("<strong>Custom rules</strong>", detail.Rules);
        Assert.DoesNotContain("onerror", detail.Rules);
        Assert.DoesNotContain("<script", detail.Tournament.Parking);
        await factory.InDb(async db => Assert.Equal(legacy, (await db.Tournaments.FindAsync(10))!.Rules));
        var request = JsonSerializer.Deserialize<SaveTournamentRequest>(JsonSerializer.Serialize(detail.Tournament, Phase1ApiFactory.Json), Phase1ApiFactory.Json)!;
        (await client.PutAsJsonAsync("/api/admin/tournaments/10", request with { Rules = legacy, Parking = legacy })).EnsureSuccessStatusCode();
        await factory.InDb(async db =>
        {
            var tournament = await db.Tournaments.FindAsync(10);
            Assert.Equal(RichHtml.Sanitize(legacy), tournament!.Rules);
            Assert.Equal(RichHtml.Sanitize(legacy), tournament.Parking);
        });
    }
}
