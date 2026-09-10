using LigaCup.Domain.Enums;
using Microsoft.AspNetCore.Authorization;

namespace LigaCup.API;

public static class AuthorizationPolicies
{
    /// <summary>Account management and anything else that can lock people out.</summary>
    public const string Admin = "Admin";

    /// <summary>Running a tournament: fixtures, scores and live updates.</summary>
    public const string Editor = "Editor";

    public static void AddLigaCupPolicies(this AuthorizationOptions options)
    {
        options.AddPolicy(Admin, policy => policy.RequireRole(nameof(UserRole.Admin)));

        options.AddPolicy(Editor, policy =>
            policy.RequireRole(nameof(UserRole.Admin), nameof(UserRole.Editor)));
    }
}
