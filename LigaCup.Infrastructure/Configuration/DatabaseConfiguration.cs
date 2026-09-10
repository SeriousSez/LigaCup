using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace LigaCup.Infrastructure.Configuration;

public enum DatabaseProvider
{
    Sqlite,
    MySql
}

/// <summary>
/// Resolves which database the app talks to and, for SQLite, where the file actually lives.
/// Shared hosting often blocks writes to the application directory, so the path is probed
/// and falls back to a writable location rather than failing at startup.
/// </summary>
public static class DatabaseConfiguration
{
    private const string DefaultSqliteConnectionString = "Data Source=App_Data/ligacup.db";

    public static DatabaseProvider GetProvider(IConfiguration configuration)
    {
        var provider = configuration["Database:Provider"];

        return string.Equals(provider, "MySql", StringComparison.OrdinalIgnoreCase)
            ? DatabaseProvider.MySql
            : DatabaseProvider.Sqlite;
    }

    public static string GetSqliteConnectionString(IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("LigaCupSqlite");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            connectionString = DefaultSqliteConnectionString;
        }

        return NormalizeSqliteConnectionString(connectionString);
    }

    public static void Configure(DbContextOptionsBuilder optionsBuilder, IConfiguration configuration)
    {
        var provider = GetProvider(configuration);

        if (provider == DatabaseProvider.MySql)
        {
            throw new InvalidOperationException(
                "Database:Provider is set to MySql, but no MySQL provider package is referenced yet. " +
                "Pomelo.EntityFrameworkCore.MySql has no EF Core 10 release at the time of writing. " +
                "Add the package and call optionsBuilder.UseMySql here once it ships, or set Database:Provider to Sqlite.");
        }

        optionsBuilder.UseSqlite(GetSqliteConnectionString(configuration), sqlite =>
            sqlite.MigrationsAssembly(typeof(LigaCupContext).Assembly.FullName));
    }

    public static string? TryResolveSqliteDatabasePath(string connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return null;
        }

        var builder = new SqliteConnectionStringBuilder(connectionString);

        return string.IsNullOrWhiteSpace(builder.DataSource) || builder.DataSource == ":memory:"
            ? null
            : builder.DataSource;
    }

    private static string NormalizeSqliteConnectionString(string connectionString)
    {
        var builder = new SqliteConnectionStringBuilder(connectionString);

        if (string.IsNullOrWhiteSpace(builder.DataSource) || builder.DataSource == ":memory:")
        {
            return connectionString;
        }

        builder.DataSource = ResolveSqliteDatabasePath(builder.DataSource);
        return builder.ToString();
    }

    private static string ResolveSqliteDatabasePath(string dataSource)
    {
        var candidates = GetPathCandidates(dataSource).ToArray();

        // An existing, writable database always wins so deploys never strand the live data.
        foreach (var candidate in candidates)
        {
            if (File.Exists(candidate) && CanWrite(candidate))
            {
                return candidate;
            }
        }

        foreach (var candidate in candidates)
        {
            if (CanWrite(candidate))
            {
                return candidate;
            }
        }

        var fallbackRoot = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        if (string.IsNullOrWhiteSpace(fallbackRoot))
        {
            fallbackRoot = Path.GetTempPath();
        }

        var fallbackPath = Path.Combine(fallbackRoot, "LigaCup", Path.GetFileName(dataSource));
        return CanWrite(fallbackPath) ? fallbackPath : candidates[0];
    }

    private static IEnumerable<string> GetPathCandidates(string dataSource)
    {
        if (Path.IsPathRooted(dataSource))
        {
            yield return dataSource;
            yield break;
        }

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var contentRoot = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), dataSource));
        if (seen.Add(contentRoot))
        {
            yield return contentRoot;
        }

        var baseDirectory = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, dataSource));
        if (seen.Add(baseDirectory))
        {
            yield return baseDirectory;
        }
    }

    private static bool CanWrite(string filePath)
    {
        try
        {
            var directory = Path.GetDirectoryName(filePath);
            if (!string.IsNullOrWhiteSpace(directory))
            {
                Directory.CreateDirectory(directory);
            }

            var probePath = filePath + ".probe";
            using (File.Create(probePath, 1, FileOptions.DeleteOnClose))
            {
            }

            return true;
        }
        catch
        {
            return false;
        }
    }
}
