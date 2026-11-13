using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using LigaCup.ApplicationService.Services;
using LigaCup.Domain.Entities;
using LigaCup.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace LigaCup.API.Endpoints;

/// <summary>One SQLite transaction per HTTP command, including its durable retry receipt.</summary>
public static class EditingCommands
{
    public static void UseEditingCommands(this WebApplication app) => app.Use(async (context, next) =>
    {
        var path = context.Request.Path.Value ?? "";
        if (!(path.StartsWith("/api/admin/") || path.StartsWith("/api/live/"))
            || context.Request.Method is "GET" or "HEAD" or "OPTIONS"
            || context.Request.HasFormContentType)
        { await next(context); return; }

        var db = context.RequestServices.GetRequiredService<LigaCupContext>();
        context.Request.EnableBuffering();
        var body = await new StreamReader(context.Request.Body, leaveOpen: true).ReadToEndAsync();
        context.Request.Body.Position = 0;
        var key = context.Request.Headers["Idempotency-Key"].ToString();
        if (key.Length > 100) throw new RequestValidationException("operation", "Operation key is too long.");
        var scope = context.User.FindFirstValue(ClaimTypes.NameIdentifier) + ":" + key;
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(context.Request.Method + path + body)));
        await using var transaction = await db.Database.BeginTransactionAsync(context.RequestAborted);
        if (key.Length > 0)
        {
            var receipt = await db.CommandReceipts.FindAsync(scope);
            if (receipt is not null)
            {
                if (receipt.RequestHash != hash) throw new RequestConflictException("This operation ID was already used for a different request.");
                context.Response.StatusCode = receipt.StatusCode;
                context.Response.ContentType = receipt.ContentType;
                await context.Response.WriteAsync(receipt.Body);
                return;
            }
        }

        // Intentional immediate commands have their own semantics. Replacement forms need a baseline.
        if (context.Request.Method == "PUT" && !path.EndsWith("/group") && !path.EndsWith("/password")
            && !path.EndsWith("/status") && !path.EndsWith("/stoppage") && !path.EndsWith("/matches/bulk"))
        {
            object? entity = null;
            var numbers = Regex.Matches(path, @"\d+").Select(m => int.Parse(m.Value)).ToArray();
            if (numbers.Length > 0)
            {
                var id = numbers[^1];
                entity = path.Contains("/matches/") ? await db.Matches.FindAsync(id)
                    : path.Contains("/teams/") ? await db.Teams.FindAsync(id)
                    : path.Contains("/players/") ? await db.Players.FindAsync(id)
                    : path.Contains("/users/") ? await db.Users.FindAsync(id)
                    : path.Contains("/groups/") ? null : await db.Tournaments.FindAsync(id);
            }
            if (entity is not null)
            {
                using var json = JsonDocument.Parse(string.IsNullOrEmpty(body) ? "{}" : body);
                var expected = json.RootElement.TryGetProperty("revision", out var value) ? value.GetString() : null;
                RequireRevision(expected, EditRevision.For(entity, path.StartsWith("/api/live/")));
            }
        }

        var original = context.Response.Body;
        await using var buffer = new MemoryStream();
        context.Response.Body = buffer;
        try
        {
            await next(context);
            if (context.Response.StatusCode < 400)
            {
                buffer.Position = 0;
                var result = await new StreamReader(buffer, leaveOpen: true).ReadToEndAsync();
                if (key.Length > 0)
                    db.CommandReceipts.Add(new CommandReceipt { Id = scope, RequestHash = hash,
                        StatusCode = context.Response.StatusCode, Body = result, ContentType = context.Response.ContentType ?? "application/json" });
                await db.SaveChangesAsync(context.RequestAborted);
                await transaction.CommitAsync(context.RequestAborted);
            }
            else await transaction.RollbackAsync();
            buffer.Position = 0;
            await buffer.CopyToAsync(original);
        }
        finally { context.Response.Body = original; }
        if (context.Response.StatusCode < 400)
            await context.RequestServices.GetRequiredService<PendingNotifications>().FlushAsync();
    });

    public static void RequireRevision(string? expected, string actual)
    {
        if (string.IsNullOrEmpty(expected) || expected != actual)
            throw new RequestConflictException("This record changed or its revision is missing. Reload server values, review your preserved draft, and resolve the conflict before saving.");
    }
}
