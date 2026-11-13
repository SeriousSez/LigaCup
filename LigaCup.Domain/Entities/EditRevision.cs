using System.Security.Cryptography;
using System.Text.Json;

namespace LigaCup.Domain.Entities;

/// <summary>Opaque content version. Checked while holding SQLite's write transaction.</summary>
public static class EditRevision
{
    public static string For(object entity, bool live = false)
    {
        string[] schedule = ["Id", "TournamentId", "GroupId", "Stage", "Round", "SortOrder", "HomeTeamId", "AwayTeamId", "HomePlaceholder", "AwayPlaceholder", "KickoffUtc", "PitchNumber", "Venue"];
        var values = entity.GetType().GetProperties()
            .Where(p => p.CanWrite && (p.PropertyType.IsValueType || p.PropertyType == typeof(string)))
            .Where(p => p.Name is not ("UpdatedUtc" or "LastLoginUtc" or "PasswordHash"))
            .Where(p => entity is not Match || live || schedule.Contains(p.Name))
            .OrderBy(p => p.Name).ToDictionary(p => p.Name, p => p.GetValue(entity));
        return Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(values)));
    }
}
