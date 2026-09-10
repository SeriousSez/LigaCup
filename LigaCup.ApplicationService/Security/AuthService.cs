using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using LigaCup.ApplicationService.Contracts;
using LigaCup.Domain.Entities;
using LigaCup.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace LigaCup.ApplicationService.Security;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "LigaCup";
    public string Audience { get; set; } = "LigaCup.Clients";
    public string Key { get; set; } = string.Empty;

    /// <summary>Short lived on purpose. The refresh token is what keeps someone signed in.</summary>
    public int ExpiryMinutes { get; set; } = 60;

    public int RefreshExpiryDays { get; set; } = 30;
}

public class AuthService(LigaCupContext dbContext, IOptions<JwtOptions> jwtOptions, ILogger<AuthService> logger)
{
    private readonly JwtOptions options = jwtOptions.Value;

    public async Task<AuthResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        // Accepts the username or the email address, since people rarely remember which they registered with.
        var identifier = (request.Username ?? string.Empty).Trim().ToLower();

        var user = await dbContext.Users.FirstOrDefaultAsync(
            candidate => candidate.IsActive
                && (candidate.Username.ToLower() == identifier
                    || (candidate.Email != null && candidate.Email.ToLower() == identifier)),
            cancellationToken);

        if (user is null || !PasswordHasher.Verify(request.Password, user.PasswordHash))
        {
            logger.LogWarning("Failed login attempt for {Identifier}", identifier);
            return null;
        }

        user.LastLoginUtc = DateTime.UtcNow;

        var response = CreateToken(user, await IssueRefreshTokenAsync(user, cancellationToken));
        await dbContext.SaveChangesAsync(cancellationToken);

        return response;
    }

    /// <summary>
    /// Swaps a refresh token for a new pair. The old token is revoked on use, so a stolen
    /// token stops working as soon as the real client refreshes.
    /// </summary>
    public async Task<AuthResponse?> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return null;
        }

        var hash = RefreshTokenGenerator.Hash(refreshToken);
        var now = DateTime.UtcNow;

        var stored = await dbContext.RefreshTokens
            .Include(token => token.User)
            .FirstOrDefaultAsync(token => token.TokenHash == hash, cancellationToken);

        if (stored?.User is null || !stored.IsActive(now) || !stored.User.IsActive)
        {
            logger.LogWarning("Rejected a refresh token that was expired, revoked or unknown.");
            return null;
        }

        stored.RevokedUtc = now;

        var response = CreateToken(stored.User, await IssueRefreshTokenAsync(stored.User, cancellationToken));
        await dbContext.SaveChangesAsync(cancellationToken);

        return response;
    }

    public async Task RevokeAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return;
        }

        var hash = RefreshTokenGenerator.Hash(refreshToken);
        var stored = await dbContext.RefreshTokens.FirstOrDefaultAsync(token => token.TokenHash == hash, cancellationToken);

        if (stored is not null && stored.RevokedUtc is null)
        {
            stored.RevokedUtc = DateTime.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task<string> IssueRefreshTokenAsync(User user, CancellationToken cancellationToken)
    {
        var token = RefreshTokenGenerator.Create();

        dbContext.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = RefreshTokenGenerator.Hash(token),
            ExpiresUtc = DateTime.UtcNow.AddDays(Math.Max(1, options.RefreshExpiryDays))
        });

        await RemoveStaleTokensAsync(user.Id, cancellationToken);
        return token;
    }

    private async Task RemoveStaleTokensAsync(int userId, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var revokedCutoff = now.AddDays(-1);

        var stale = await dbContext.RefreshTokens
            .Where(token => token.UserId == userId
                && (token.ExpiresUtc < now || (token.RevokedUtc != null && token.RevokedUtc < revokedCutoff)))
            .ToListAsync(cancellationToken);

        dbContext.RefreshTokens.RemoveRange(stale);
    }

    private AuthResponse CreateToken(User user, string refreshToken)
    {
        var expiresUtc = DateTime.UtcNow.AddMinutes(options.ExpiryMinutes);
        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.Key));

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.Role, user.Role.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: options.Issuer,
            audience: options.Audience,
            claims: claims,
            expires: expiresUtc,
            signingCredentials: new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256));

        return new AuthResponse(
            new JwtSecurityTokenHandler().WriteToken(token),
            expiresUtc,
            user.Username,
            user.Role.ToString(),
            refreshToken);
    }
}
