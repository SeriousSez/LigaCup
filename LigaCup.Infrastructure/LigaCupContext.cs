using LigaCup.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace LigaCup.Infrastructure;

public class LigaCupContext(DbContextOptions<LigaCupContext> options) : DbContext(options)
{
    /// <summary>
    /// SQLite hands dates back with an unspecified kind, which JSON then serialises without a
    /// trailing Z. Browsers read that as local time, so the match clock would drift by the
    /// timezone offset. Tagging every date as UTC on read keeps the wire format unambiguous.
    /// </summary>
    private sealed class UtcDateTimeConverter() : ValueConverter<DateTime, DateTime>(
        value => value.ToUniversalTime(),
        value => DateTime.SpecifyKind(value, DateTimeKind.Utc));

    private sealed class NullableUtcDateTimeConverter() : ValueConverter<DateTime?, DateTime?>(
        value => value.HasValue ? value.Value.ToUniversalTime() : value,
        value => value.HasValue ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc) : value);

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
        configurationBuilder.Properties<DateTime?>().HaveConversion<NullableUtcDateTimeConverter>();

        base.ConfigureConventions(configurationBuilder);
    }

    public DbSet<Tournament> Tournaments => Set<Tournament>();
    public DbSet<TournamentGroup> Groups => Set<TournamentGroup>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<Player> Players => Set<Player>();
    public DbSet<Match> Matches => Set<Match>();
    public DbSet<MatchEvent> MatchEvents => Set<MatchEvent>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Tournament>(entity =>
        {
            entity.Property(tournament => tournament.Name).HasMaxLength(120).IsRequired();
            entity.Property(tournament => tournament.Slug).HasMaxLength(120).IsRequired();
            entity.Property(tournament => tournament.Description).HasMaxLength(2000);
            entity.Property(tournament => tournament.TiebreakerOrder).HasMaxLength(400);
            entity.HasIndex(tournament => tournament.Slug).IsUnique();
        });

        modelBuilder.Entity<TournamentGroup>(entity =>
        {
            entity.Property(group => group.Name).HasMaxLength(60).IsRequired();
            entity.HasOne(group => group.Tournament)
                .WithMany(tournament => tournament.Groups)
                .HasForeignKey(group => group.TournamentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Team>(entity =>
        {
            entity.Property(team => team.Name).HasMaxLength(120).IsRequired();
            entity.Property(team => team.ShortName).HasMaxLength(10);
            entity.Property(team => team.ColorHex).HasMaxLength(9);
            entity.Property(team => team.LogoUrl).HasMaxLength(500);
            entity.Property(team => team.Manager).HasMaxLength(120);

            entity.HasOne(team => team.Tournament)
                .WithMany(tournament => tournament.Teams)
                .HasForeignKey(team => team.TournamentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(team => team.Group)
                .WithMany(group => group.Teams)
                .HasForeignKey(team => team.GroupId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(team => new { team.TournamentId, team.Name }).IsUnique();
        });

        modelBuilder.Entity<Player>(entity =>
        {
            entity.Property(player => player.Name).HasMaxLength(120).IsRequired();
            entity.Property(player => player.Position).HasMaxLength(40);

            entity.HasOne(player => player.Team)
                .WithMany(team => team.Players)
                .HasForeignKey(player => player.TeamId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Match>(entity =>
        {
            entity.Property(match => match.Venue).HasMaxLength(160);
            entity.Property(match => match.Notes).HasMaxLength(1000);
            entity.Property(match => match.HomePlaceholder).HasMaxLength(80);
            entity.Property(match => match.AwayPlaceholder).HasMaxLength(80);

            entity.HasOne(match => match.Tournament)
                .WithMany(tournament => tournament.Matches)
                .HasForeignKey(match => match.TournamentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(match => match.Group)
                .WithMany(group => group.Matches)
                .HasForeignKey(match => match.GroupId)
                .OnDelete(DeleteBehavior.SetNull);

            // Restricted so deleting a team never silently wipes match history.
            entity.HasOne(match => match.HomeTeam)
                .WithMany()
                .HasForeignKey(match => match.HomeTeamId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(match => match.AwayTeam)
                .WithMany()
                .HasForeignKey(match => match.AwayTeamId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(match => new { match.TournamentId, match.Stage, match.Round });
        });

        modelBuilder.Entity<MatchEvent>(entity =>
        {
            entity.Property(matchEvent => matchEvent.Note).HasMaxLength(300);

            entity.HasOne(matchEvent => matchEvent.Match)
                .WithMany(match => match.Events)
                .HasForeignKey(matchEvent => matchEvent.MatchId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(matchEvent => matchEvent.Team)
                .WithMany()
                .HasForeignKey(matchEvent => matchEvent.TeamId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(matchEvent => matchEvent.Player)
                .WithMany()
                .HasForeignKey(matchEvent => matchEvent.PlayerId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(user => user.Username).HasMaxLength(80).IsRequired();
            entity.Property(user => user.Email).HasMaxLength(200);
            entity.Property(user => user.PasswordHash).HasMaxLength(400).IsRequired();
            entity.HasIndex(user => user.Username).IsUnique();
        });

        base.OnModelCreating(modelBuilder);
    }
}
