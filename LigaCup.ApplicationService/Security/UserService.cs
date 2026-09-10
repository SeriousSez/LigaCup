using LigaCup.ApplicationService.Contracts;
using LigaCup.Domain.Entities;
using LigaCup.Domain.Enums;
using LigaCup.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace LigaCup.ApplicationService.Security;

/// <summary>
/// Administrator-only account management. Every mutation is guarded against
/// leaving the site with no way back in, which is easy to do by accident.
/// </summary>
public class UserService(LigaCupContext dbContext)
{
    public const int MinimumPasswordLength = 8;

    public async Task<IReadOnlyList<UserDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var users = await dbContext.Users
            .AsNoTracking()
            .OrderBy(user => user.Username)
            .ToListAsync(cancellationToken);

        return users.Select(ToDto).ToList();
    }

    public async Task<UserDto> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken = default)
    {
        var username = (request.Username ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(username))
        {
            throw new InvalidOperationException("A username is required.");
        }

        if ((request.Password ?? string.Empty).Length < MinimumPasswordLength)
        {
            throw new InvalidOperationException($"The password must be at least {MinimumPasswordLength} characters.");
        }

        var normalized = username.ToLower();
        if (await dbContext.Users.AnyAsync(user => user.Username.ToLower() == normalized, cancellationToken))
        {
            throw new InvalidOperationException("That username is already taken.");
        }

        var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
        if (email is not null)
        {
            var normalizedEmail = email.ToLower();
            if (await dbContext.Users.AnyAsync(user => user.Email != null && user.Email.ToLower() == normalizedEmail, cancellationToken))
            {
                throw new InvalidOperationException("That email address is already in use.");
            }
        }

        var created = new User
        {
            Username = username,
            Email = email,
            Role = request.Role,
            IsActive = true,
            PasswordHash = PasswordHasher.Hash(request.Password!)
        };

        dbContext.Users.Add(created);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(created);
    }

    public async Task<UserDto> UpdateAsync(int id, int currentUserId, UpdateUserRequest request, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException($"User {id} was not found.");

        var losingAdmin = user.Role == UserRole.Admin && (request.Role != UserRole.Admin || !request.IsActive);
        if (losingAdmin && await IsLastActiveAdminAsync(user.Id, cancellationToken))
        {
            throw new InvalidOperationException("The last administrator cannot be demoted or deactivated.");
        }

        if (user.Id == currentUserId && !request.IsActive)
        {
            throw new InvalidOperationException("You cannot deactivate your own account.");
        }

        user.Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
        user.Role = request.Role;
        user.IsActive = request.IsActive;

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(user);
    }

    public async Task ResetPasswordAsync(int id, string password, CancellationToken cancellationToken = default)
    {
        if ((password ?? string.Empty).Length < MinimumPasswordLength)
        {
            throw new InvalidOperationException($"The password must be at least {MinimumPasswordLength} characters.");
        }

        var user = await dbContext.Users.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException($"User {id} was not found.");

        user.PasswordHash = PasswordHasher.Hash(password!);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> DeleteAsync(int id, int currentUserId, CancellationToken cancellationToken = default)
    {
        if (id == currentUserId)
        {
            throw new InvalidOperationException("You cannot delete your own account.");
        }

        var user = await dbContext.Users.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (user is null)
        {
            return false;
        }

        if (user.Role == UserRole.Admin && await IsLastActiveAdminAsync(user.Id, cancellationToken))
        {
            throw new InvalidOperationException("The last administrator cannot be deleted.");
        }

        dbContext.Users.Remove(user);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<bool> IsLastActiveAdminAsync(int excludingUserId, CancellationToken cancellationToken) =>
        !await dbContext.Users.AnyAsync(
            user => user.Id != excludingUserId && user.Role == UserRole.Admin && user.IsActive,
            cancellationToken);

    private static UserDto ToDto(User user) => new(
        user.Id,
        user.Username,
        user.Email,
        user.Role,
        user.IsActive,
        user.CreatedUtc,
        user.LastLoginUtc);
}
