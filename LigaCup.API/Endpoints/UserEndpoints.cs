using System.Security.Claims;
using LigaCup.ApplicationService.Contracts;
using LigaCup.ApplicationService.Security;

namespace LigaCup.API.Endpoints;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var users = app.MapGroup("/api/admin/users")
            .WithTags("Users")
            .RequireAuthorization(AuthorizationPolicies.Admin);

        users.MapGet("/", async (UserService service, CancellationToken cancellationToken) =>
            Results.Ok(await service.GetAllAsync(cancellationToken)));

        users.MapPost("/", async (CreateUserRequest request, UserService service, CancellationToken cancellationToken) =>
        {
            try
            {
                return Results.Ok(await service.CreateAsync(request, cancellationToken));
            }
            catch (InvalidOperationException exception)
            {
                return Results.BadRequest(new { message = exception.Message });
            }
        });

        users.MapPut("/{id:int}", async (
            int id,
            UpdateUserRequest request,
            ClaimsPrincipal principal,
            UserService service,
            CancellationToken cancellationToken) =>
        {
            try
            {
                return Results.Ok(await service.UpdateAsync(id, principal.GetUserId(), request, cancellationToken));
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
            catch (InvalidOperationException exception)
            {
                return Results.BadRequest(new { message = exception.Message });
            }
        });

        users.MapPut("/{id:int}/password", async (
            int id,
            ResetPasswordRequest request,
            UserService service,
            CancellationToken cancellationToken) =>
        {
            try
            {
                await service.ResetPasswordAsync(id, request.Password, cancellationToken);
                return Results.NoContent();
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
            catch (InvalidOperationException exception)
            {
                return Results.BadRequest(new { message = exception.Message });
            }
        });

        users.MapDelete("/{id:int}", async (
            int id,
            ClaimsPrincipal principal,
            UserService service,
            CancellationToken cancellationToken) =>
        {
            try
            {
                return await service.DeleteAsync(id, principal.GetUserId(), cancellationToken)
                    ? Results.NoContent()
                    : Results.NotFound();
            }
            catch (InvalidOperationException exception)
            {
                return Results.BadRequest(new { message = exception.Message });
            }
        });
    }

    private static int GetUserId(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue("sub") ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(value, out var id) ? id : 0;
    }
}
