using System.Security.Cryptography;
using System.Text;

namespace LigaCup.ApplicationService.Security;

/// <summary>
/// Refresh tokens are random opaque strings. Only a SHA-256 hash is persisted, so the
/// stored value cannot be replayed, and a plain hash is enough because the token itself
/// already has full entropy and needs no salting.
/// </summary>
public static class RefreshTokenGenerator
{
    public static string Create() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));

    public static string Hash(string token) =>
        Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
