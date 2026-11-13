using LigaCup.ApplicationService.Services;

namespace LigaCup.API.Endpoints;

public static class RequestErrors
{
    public static void UseRequestErrors(this WebApplication app) => app.Use(async (context, next) =>
    {
        try { await next(context); }
        catch (RequestValidationException error) when (!context.Response.HasStarted)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new
            {
                message = error.Message,
                errors = new Dictionary<string, string[]> { [error.Field] = [error.Message] }
            });
        }
        catch (RequestConflictException error) when (!context.Response.HasStarted)
        {
            context.Response.StatusCode = StatusCodes.Status409Conflict;
            await context.Response.WriteAsJsonAsync(new { message = error.Message });
        }
        catch (KeyNotFoundException error) when (!context.Response.HasStarted)
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            await context.Response.WriteAsJsonAsync(new { message = error.Message });
        }
    });
}
