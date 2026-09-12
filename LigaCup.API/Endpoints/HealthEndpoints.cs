using LigaCup.ApplicationService.Services;

namespace LigaCup.API.Endpoints;

public static class HealthEndpoints
{
    public static void MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        var publicApi = app.MapGroup("/api/health").WithTags("Health");

        publicApi.MapGet("/", async (TournamentService service, CancellationToken cancellationToken) =>
            Results.Ok());
    }
}
