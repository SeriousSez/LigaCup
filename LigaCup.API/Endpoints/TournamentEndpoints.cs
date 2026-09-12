using LigaCup.ApplicationService.Contracts;
using LigaCup.ApplicationService.Services;
using LigaCup.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace LigaCup.API.Endpoints;

public static class TournamentEndpoints
{
    private const long MaximumRuleImageSize = 5 * 1024 * 1024;

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

        var adminApi = app.MapGroup("/api/admin/tournaments")
            .WithTags("Admin")
            .RequireAuthorization(AuthorizationPolicies.Editor);

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

        adminApi.MapPost("/rules/images", async (
            IFormFile file,
            HttpRequest request,
            IWebHostEnvironment environment,
            CancellationToken cancellationToken) =>
        {
            if (file.Length is 0 or > MaximumRuleImageSize)
            {
                return Results.BadRequest(new { message = "Images must be between 1 byte and 5 MB." });
            }

            var extension = ResolveImageExtension(file);
            if (extension is null)
            {
                return Results.BadRequest(new { message = "Only PNG, JPEG, GIF and WebP images are supported." });
            }

            await using (var source = file.OpenReadStream())
            {
                var header = new byte[12];
                var bytesRead = await source.ReadAsync(header, cancellationToken);
                if (!HasValidImageSignature(extension, header.AsSpan(0, bytesRead)))
                {
                    return Results.BadRequest(new { message = "The uploaded file is not a valid image." });
                }
            }

            var webRoot = environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot");
            var uploadDirectory = Path.Combine(webRoot, "uploads", "rules");
            Directory.CreateDirectory(uploadDirectory);

            var fileName = $"{Guid.NewGuid():N}{extension}";
            var filePath = Path.Combine(uploadDirectory, fileName);
            await using (var target = File.Create(filePath))
            {
                await file.CopyToAsync(target, cancellationToken);
            }

            var url = $"{request.Scheme}://{request.Host}{request.PathBase}/uploads/rules/{fileName}";
            return Results.Ok(new { url });
        })
            .DisableAntiforgery()
            .WithMetadata(new RequestSizeLimitAttribute(MaximumRuleImageSize + 64 * 1024));

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
        {
            try
            {
                return await service.DeleteTeamAsync(id, teamId, cancellationToken)
                    ? Results.NoContent()
                    : Results.NotFound();
            }
            catch (InvalidOperationException exception)
            {
                return Results.Conflict(new { message = exception.Message });
            }
        });

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

    private static readonly IReadOnlyDictionary<string, string> AllowedImageTypes =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [".png"] = "image/png",
            [".jpg"] = "image/jpeg",
            [".jpeg"] = "image/jpeg",
            [".gif"] = "image/gif",
            [".webp"] = "image/webp"
        };

    private static string? ResolveImageExtension(IFormFile file)
    {
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (AllowedImageTypes.TryGetValue(extension, out var expectedContentType) &&
            string.Equals(file.ContentType, expectedContentType, StringComparison.OrdinalIgnoreCase))
        {
            return extension;
        }

        return file.ContentType.ToLowerInvariant() switch
        {
            "image/png" => ".png",
            "image/jpeg" => ".jpg",
            "image/gif" => ".gif",
            "image/webp" => ".webp",
            _ => null
        };
    }

    private static bool HasValidImageSignature(string extension, ReadOnlySpan<byte> header) => extension switch
    {
        ".png" => header.StartsWith(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),
        ".jpg" or ".jpeg" => header.StartsWith(new byte[] { 0xFF, 0xD8, 0xFF }),
        ".gif" => header.StartsWith("GIF87a"u8) || header.StartsWith("GIF89a"u8),
        ".webp" => header.Length >= 12 && header[..4].SequenceEqual("RIFF"u8) && header[8..12].SequenceEqual("WEBP"u8),
        _ => false
    };

    public static void MapLiveEndpoints(this IEndpointRouteBuilder app)
    {
        var live = app.MapGroup("/api/live")
            .WithTags("Live")
            .RequireAuthorization(AuthorizationPolicies.Editor);

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

        live.MapPut("/matches/{matchId:int}/stoppage", async (int matchId, UpdateStoppageRequest request, MatchService service, CancellationToken cancellationToken) =>
            Results.Ok(await service.UpdateStoppageAsync(matchId, request.StoppageMinutes, cancellationToken)));

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

        app.MapPost("/api/auth/refresh", async (
            [FromBody] RefreshRequest request,
            LigaCup.ApplicationService.Security.AuthService authService,
            CancellationToken cancellationToken) =>
        {
            var response = await authService.RefreshAsync(request.RefreshToken, cancellationToken);
            return response is null ? Results.Unauthorized() : Results.Ok(response);
        }).WithTags("Auth");

        app.MapPost("/api/auth/logout", async (
            [FromBody] RefreshRequest request,
            LigaCup.ApplicationService.Security.AuthService authService,
            CancellationToken cancellationToken) =>
        {
            await authService.RevokeAsync(request.RefreshToken, cancellationToken);
            return Results.NoContent();
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
