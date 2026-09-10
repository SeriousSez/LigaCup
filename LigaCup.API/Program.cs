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
        throw new InvalidOperationException(
            "Jwt:Key must be at least 32 characters in production. Provide it through the Jwt__Key environment variable or appsettings.Production.json.");
    }

    // Development only: a per-run key keeps local tokens working without committing a secret.
    jwtKey = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(48));
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

using (var scope = app.Services.CreateScope())
{
    try
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<LigaCupContext>();
        await dbContext.Database.MigrateAsync();

        var databasePath = DatabaseConfiguration.TryResolveSqliteDatabasePath(
            DatabaseConfiguration.GetSqliteConnectionString(app.Configuration));
        app.Logger.LogInformation("LigaCup database ready at {DatabasePath}", databasePath ?? "(non-SQLite provider)");

        await SeedAdminUserAsync(dbContext, app.Configuration, app.Environment, app.Logger);
    }
    catch (Exception exception)
    {
        // Keep IIS alive so the health endpoint and startup log can expose filesystem or migration failures.
        app.Logger.LogCritical(exception, "LigaCup database initialization failed. The API started without database readiness.");
    }
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", utc = DateTime.UtcNow }));
app.MapAuthEndpoints();
app.MapTournamentEndpoints();
app.MapLiveEndpoints();
app.MapUserEndpoints();
app.MapHub<LiveHub>("/hubs/live");

app.Run();

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
