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
    public int ExpiryMinutes { get; set; } = 720;
}

public class AuthService(LigaCupContext dbContext, IOptions<JwtOptions> jwtOptions, ILogger<AuthService> logger)
{
    private readonly JwtOptions options = jwtOptions.Value;

    public async Task<AuthResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users
            .FirstOrDefaultAsync(candidate => candidate.Username == request.Username && candidate.IsActive, cancellationToken);

        if (user is null || !PasswordHasher.Verify(request.Password, user.PasswordHash))
        {
            logger.LogWarning("Failed login attempt for {Username}", request.Username);
            return null;
        }

        user.LastLoginUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return CreateToken(user);
    }

    private AuthResponse CreateToken(User user)
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
            user.Role.ToString());
    }
}
