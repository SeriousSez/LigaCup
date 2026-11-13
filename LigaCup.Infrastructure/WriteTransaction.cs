using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace LigaCup.Infrastructure;

public static class WriteTransaction
{
    public static async Task<IDbContextTransaction?> BeginWriteAsync(this LigaCupContext db, CancellationToken ct = default) =>
        db.Database.CurrentTransaction is null ? await db.Database.BeginTransactionAsync(ct) : null;
    public static Task CommitOwnedAsync(this IDbContextTransaction? transaction, CancellationToken ct = default) =>
        transaction?.CommitAsync(ct) ?? Task.CompletedTask;
}
