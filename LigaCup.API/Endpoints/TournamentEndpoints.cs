using LigaCup.ApplicationService.Contracts;
using LigaCup.ApplicationService.Services;
using LigaCup.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace LigaCup.API.Endpoints;

public static class TournamentEndpoints
{
    public static void MapTournamentEndpoints(this IEndpointRouteBuilder app)
    {
        var publicApi = app.MapGroup("/api/tournaments").WithTags("Tournaments");

        publicApi.MapGet("/", async (TournamentService service, CancellationToken cancellationToken) =>
            Results.Ok(await service.GetAllAsync(cancellationToken)));

        publicApi.MapGet("/{slug}", async (string slug, TournamentService service, CancellationToken cancellationToken) =>
        {
            var tournament = await service.LoadGraphAsync(slug, cancellationToken);
            return tournament is null ? Results.NotFound() : Results.Ok(service.BuildDetail(tournament));
        });

        var adminApi = app.MapGroup("/api/admin/tournaments").WithTags("Admin").RequireAuthorization();

        adminApi.MapPost("/", async (SaveTournamentRequest request, TournamentService service, CancellationToken cancellationToken) =>
        {
            var tournament = await service.SaveTournamentAsync(null, request, cancellationToken);
            return Results.Created($"/api/tournaments/{tournament.Slug}", tournament.Slug);
        });

        adminApi.MapPut("/{id:int}", async (int id, SaveTournamentRequest request, TournamentService service, CancellationToken cancellationToken) =>
        {
            var tournament = await service.SaveTournamentAsync(id, request, cancellationToken);
            return Results.Ok(tournament.Slug);
        });

        adminApi.MapDelete("/{id:int}", async (int id, TournamentService service, CancellationToken cancellationToken) =>
            await service.DeleteTournamentAsync(id, cancellationToken) ? Results.NoContent() : Results.NotFound());

        adminApi.MapPost("/{id:int}/groups", async (int id, SaveGroupRequest request, TournamentService service, CancellationToken cancellationToken) =>
            Results.Ok(await service.SaveGroupAsync(id, null, request, cancellationToken)));

        adminApi.MapPut("/{id:int}/groups/{groupId:int}", async (int id, int groupId, SaveGroupRequest request, TournamentService service, CancellationToken cancellationToken) =>
            Results.Ok(await service.SaveGroupAsync(id, groupId, request, cancellationToken)));

        adminApi.MapDelete("/{id:int}/groups/{groupId:int}", async (int id, int groupId, TournamentService service, CancellationToken cancellationToken) =>
            await service.DeleteGroupAsync(id, groupId, cancellationToken) ? Results.NoContent() : Results.NotFound());

        adminApi.MapPost("/{id:int}/teams", async (int id, SaveTeamRequest request, TournamentService service, CancellationToken cancellationToken) =>
            Results.Ok(await service.SaveTeamAsync(id, null, request, cancellationToken)));

        adminApi.MapPut("/{id:int}/teams/{teamId:int}", async (int id, int teamId, SaveTeamRequest request, TournamentService service, CancellationToken cancellationToken) =>
            Results.Ok(await service.SaveTeamAsync(id, teamId, request, cancellationToken)));

        adminApi.MapDelete("/{id:int}/teams/{teamId:int}", async (int id, int teamId, TournamentService service, CancellationToken cancellationToken) =>
            await service.DeleteTeamAsync(id, teamId, cancellationToken) ? Results.NoContent() : Results.NotFound());

        adminApi.MapPost("/players", async (SavePlayerRequest request, TournamentService service, CancellationToken cancellationToken) =>
            Results.Ok(await service.SavePlayerAsync(null, request, cancellationToken)));

        adminApi.MapPut("/players/{playerId:int}", async (int playerId, SavePlayerRequest request, TournamentService service, CancellationToken cancellationToken) =>
            Results.Ok(await service.SavePlayerAsync(playerId, request, cancellationToken)));

        adminApi.MapDelete("/players/{playerId:int}", async (int playerId, TournamentService service, CancellationToken cancellationToken) =>
            await service.DeletePlayerAsync(playerId, cancellationToken) ? Results.NoContent() : Results.NotFound());

        adminApi.MapPost("/{id:int}/fixtures", async (int id, GenerateFixturesRequest request, TournamentService service, CancellationToken cancellationToken) =>
            Results.Ok(new { generated = await service.GenerateFixturesAsync(id, request, cancellationToken) }));

        adminApi.MapPost("/{id:int}/knockout/seed", async (int id, MatchService service, CancellationToken cancellationToken) =>
            Results.Ok(new { seeded = await service.SeedKnockoutFromGroupsAsync(id, cancellationToken) }));

        adminApi.MapPost("/{id:int}/matches", async (int id, SaveMatchRequest request, MatchService service, CancellationToken cancellationToken) =>
            Results.Ok(await service.SaveMatchAsync(id, null, request, cancellationToken)));

        adminApi.MapPut("/{id:int}/matches/{matchId:int}", async (int id, int matchId, SaveMatchRequest request, MatchService service, CancellationToken cancellationToken) =>
            Results.Ok(await service.SaveMatchAsync(id, matchId, request, cancellationToken)));

        adminApi.MapDelete("/{id:int}/matches/{matchId:int}", async (int id, int matchId, MatchService service, CancellationToken cancellationToken) =>
            await service.DeleteMatchAsync(id, matchId, cancellationToken) ? Results.NoContent() : Results.NotFound());
    }

    public static void MapLiveEndpoints(this IEndpointRouteBuilder app)
    {
        var live = app.MapGroup("/api/live").WithTags("Live").RequireAuthorization();

        live.MapPut("/matches/{matchId:int}/score", async (int matchId, UpdateScoreRequest request, MatchService service, CancellationToken cancellationToken) =>
            Results.Ok(await service.UpdateScoreAsync(matchId, request, cancellationToken)));

        live.MapPost("/matches/{matchId:int}/score/{side}/{delta:int}", async (
            int matchId,
            string side,
            int delta,
            MatchService service,
            CancellationToken cancellationToken) =>
        {
            if (side is not ("home" or "away"))
            {
                return Results.BadRequest("Side must be 'home' or 'away'.");
            }

            if (delta is not (1 or -1))
            {
                return Results.BadRequest("Delta must be 1 or -1.");
            }

            return Results.Ok(await service.AdjustScoreAsync(matchId, side == "home", delta, cancellationToken));
        });

        live.MapPut("/matches/{matchId:int}/status", async (int matchId, UpdateMatchStatusRequest request, MatchService service, CancellationToken cancellationToken) =>
            Results.Ok(await service.UpdateStatusAsync(matchId, request.Status, cancellationToken)));

        live.MapPost("/matches/{matchId:int}/events", async (int matchId, SaveMatchEventRequest request, MatchService service, CancellationToken cancellationToken) =>
            Results.Ok(await service.AddEventAsync(matchId, request, cancellationToken)));

        live.MapDelete("/matches/{matchId:int}/events/{eventId:int}", async (int matchId, int eventId, MatchService service, CancellationToken cancellationToken) =>
        {
            var result = await service.DeleteEventAsync(matchId, eventId, cancellationToken);
            return result is null ? Results.NotFound() : Results.Ok(result);
        });
    }

    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/auth/login", async (
            [FromBody] LoginRequest request,
            LigaCup.ApplicationService.Security.AuthService authService,
            CancellationToken cancellationToken) =>
        {
            var response = await authService.LoginAsync(request, cancellationToken);
            return response is null ? Results.Unauthorized() : Results.Ok(response);
        }).WithTags("Auth");

        app.MapGet("/api/meta/options", () => Results.Ok(new
        {
            formats = Enum.GetNames<TournamentFormat>(),
            statuses = Enum.GetNames<TournamentStatus>(),
            stages = Enum.GetNames<MatchStage>(),
            matchStatuses = Enum.GetNames<MatchStatus>(),
            eventTypes = Enum.GetNames<MatchEventType>(),
            tiebreakers = Enum.GetNames<TiebreakerRule>()
        })).WithTags("Meta");
    }
}
