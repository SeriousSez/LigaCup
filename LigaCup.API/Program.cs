using System.Text;
using System.Text.Json.Serialization;
using LigaCup.API;
using LigaCup.API.Endpoints;
using LigaCup.API.Hubs;
using LigaCup.ApplicationService.Security;
using LigaCup.ApplicationService.Services;
using LigaCup.Domain.Entities;
using LigaCup.Domain.Enums;
using LigaCup.Infrastructure;
using LigaCup.Infrastructure.Configuration;
using LigaCup.Infrastructure.Extensions;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));

builder.Services.ConfigureHttpJsonOptions(options =>
{
    // Enums travel as strings so the Angular client can compare against readable values.
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddLigaCupPersistence(builder.Configuration);
builder.Services.AddScoped<TournamentService>();
builder.Services.AddScoped<MatchService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<ILiveUpdateBroadcaster, SignalRLiveUpdateBroadcaster>();

builder.Services.AddSignalR().AddJsonProtocol(options =>
    options.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
{
    if (builder.Environment.IsProduction())
    {
        Console.Error.WriteLine(
            "CRITICAL: Jwt:Key is missing or shorter than 32 characters. " +
            "The API is using an ephemeral key until the production configuration is repaired.");
        jwtKey = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(48));
    }
    else
    {
        // Development only: a per-run key keeps local tokens working without committing a secret.
        jwtKey = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(48));
    }

    builder.Configuration["Jwt:Key"] = jwtKey;
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "LigaCup",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "LigaCup.Clients",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                // Browsers cannot attach an Authorization header to a WebSocket handshake.
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken) && context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options => options.AddLigaCupPolicies());

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:4200"];

builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .WithOrigins(allowedOrigins)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

var app = builder.Build();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", utc = DateTime.UtcNow }));
app.MapAuthEndpoints();
app.MapTournamentEndpoints();
app.MapLiveEndpoints();
app.MapUserEndpoints();
app.MapHub<LiveHub>("/hubs/live");

await InitializeDatabaseAsync(app);

app.Run();

static async Task InitializeDatabaseAsync(WebApplication app)
{
    try
    {
        using var scope = app.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<LigaCupContext>();
        await MigrateWithSqliteRetryAsync(dbContext, app.Logger);

        var databasePath = DatabaseConfiguration.TryResolveSqliteDatabasePath(
            DatabaseConfiguration.GetSqliteConnectionString(app.Configuration));
        app.Logger.LogInformation("LigaCup database ready at {DatabasePath}", databasePath ?? "(non-SQLite provider)");

        await SeedAdminUserAsync(dbContext, app.Configuration, app.Environment, app.Logger);
    }
    catch (Exception exception)
    {
        app.Logger.LogCritical(exception, "LigaCup database initialization failed during startup.");
        throw;
    }
}

static async Task MigrateWithSqliteRetryAsync(LigaCupContext dbContext, ILogger logger)
{
    const int maxAttempts = 6;

    for (var attempt = 1; ; attempt++)
    {
        try
        {
            await dbContext.Database.MigrateAsync();
            return;
        }
        catch (SqliteException exception) when ((exception.SqliteErrorCode is 5 or 6) && attempt < maxAttempts)
        {
            var delay = TimeSpan.FromSeconds(Math.Min(attempt * 5, 20));
            logger.LogWarning(
                exception,
                "SQLite database is temporarily locked during startup. Retrying migration in {DelaySeconds} seconds (attempt {Attempt} of {MaxAttempts}).",
                delay.TotalSeconds,
                attempt + 1,
                maxAttempts);
            await Task.Delay(delay);
        }
    }
}

static async Task SeedAdminUserAsync(LigaCupContext dbContext, IConfiguration configuration, IHostEnvironment environment, ILogger logger)
{
    var username = configuration["Admin:Username"];
    var password = configuration["Admin:Password"];
    var email = configuration["Admin:Email"];

    if (string.IsNullOrWhiteSpace(username))
    {
        username = "admin";
    }

    // Only ever creates a missing account. An existing password is never reset from configuration.
    if (await dbContext.Users.AnyAsync(user => user.Username == username))
    {
        return;
    }

    if (string.IsNullOrWhiteSpace(password))
    {
        if (environment.IsProduction())
        {
            logger.LogError(
                "Administrator '{Username}' does not exist and Admin__Password is not configured, so no account was created. " +
                "Set Admin__Username and Admin__Password, then restart the app.",
                username);
            return;
        }

        // A fresh random password beats a well-known default sitting in source control.
        password = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(12));
        logger.LogWarning("Seeded development administrator '{Username}' with generated password: {Password}", username, password);
    }

    dbContext.Users.Add(new User
    {
        Username = username,
        Email = string.IsNullOrWhiteSpace(email) ? null : email,
        PasswordHash = PasswordHasher.Hash(password),
        Role = UserRole.Admin
    });

    await dbContext.SaveChangesAsync();
    logger.LogInformation("Created administrator '{Username}'.", username);
}
