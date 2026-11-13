using LigaCup.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace LigaCup.ApplicationService.Services;

public sealed class RequestValidationException(string field, string message) : Exception(message)
{
    public string Field { get; } = field;
}

public sealed class RequestConflictException(string message) : Exception(message);

internal static class RequestValidation
{
    public static void Require(bool condition, string field, string message)
    {
        if (!condition) throw new RequestValidationException(field, message);
    }

    public static void Text(string? value, string field, int maximum, bool required = false) =>
        Require((!required || !string.IsNullOrWhiteSpace(value)) && (value?.Length ?? 0) <= maximum,
            field, $"{field} must {(required ? "be provided and " : "")}contain at most {maximum} characters.");

    public static void EnumValue<T>(T value, string field) where T : struct, Enum =>
        Require(Enum.IsDefined(value), field, $"Unsupported {field}.");

    public static async Task Tournament(LigaCupContext db, int id, CancellationToken ct)
    {
        if (!await db.Tournaments.AnyAsync(t => t.Id == id, ct))
            throw new KeyNotFoundException($"Tournament {id} was not found.");
    }

    public static async Task Group(LigaCupContext db, int tournamentId, int? groupId, CancellationToken ct)
    {
        if (groupId is not null)
            Require(await db.Groups.AnyAsync(g => g.Id == groupId && g.TournamentId == tournamentId, ct),
                "groupId", "The group must belong to this tournament.");
    }
}
