using LigaCup.Domain.Enums;

namespace LigaCup.Domain.Entities;

public class Tournament
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>URL-friendly identifier used by the public frontend, e.g. "liga-cup-2026".</summary>
    public string Slug { get; set; } = string.Empty;

    public string? Description { get; set; }
    public int Season { get; set; }
    public TournamentFormat Format { get; set; } = TournamentFormat.GroupsThenKnockout;
    public TournamentStatus Status { get; set; } = TournamentStatus.Draft;

    public int PointsForWin { get; set; } = 3;
    public int PointsForDraw { get; set; } = 1;
    public int PointsForLoss { get; set; }

    /// <summary>Each team plays every other team in its group this many times.</summary>
    public int GroupRounds { get; set; } = 1;

    /// <summary>How many teams from each group progress to the knockout stage.</summary>
    public int TeamsAdvancingPerGroup { get; set; } = 2;

    /// <summary>When true, the best third-placed teams fill the remaining knockout slots.</summary>
    public bool IncludeBestThirdPlaced { get; set; }

    public bool HasThirdPlacePlayOff { get; set; }

    /// <summary>When false the app runs in a lightweight teams-and-scores mode with no squads.</summary>
    public bool TrackPlayers { get; set; }

    /// <summary>When false, cards are not recorded and disciplinary tiebreakers are skipped.</summary>
    public bool TrackCards { get; set; }

    public int MatchDurationMinutes { get; set; } = 90;

    /// <summary>Tiebreaker rules serialised in priority order, applied after points.</summary>
    public string TiebreakerOrder { get; set; } = "GoalDifference,GoalsScored,HeadToHeadPoints,Wins,TeamName";

    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedUtc { get; set; } = DateTime.UtcNow;

    public ICollection<Team> Teams { get; set; } = [];
    public ICollection<TournamentGroup> Groups { get; set; } = [];
    public ICollection<Match> Matches { get; set; } = [];

    public IReadOnlyList<TiebreakerRule> GetTiebreakers()
    {
        if (string.IsNullOrWhiteSpace(TiebreakerOrder))
        {
            return [TiebreakerRule.GoalDifference, TiebreakerRule.GoalsScored, TiebreakerRule.TeamName];
        }

        return TiebreakerOrder
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(value => Enum.TryParse<TiebreakerRule>(value, ignoreCase: true, out var rule) ? rule : (TiebreakerRule?)null)
            .Where(rule => rule.HasValue)
            .Select(rule => rule!.Value)
            .ToList();
    }
}

public class TournamentGroup
{
    public int Id { get; set; }
    public int TournamentId { get; set; }
    public Tournament? Tournament { get; set; }

    /// <summary>Display name such as "Group A".</summary>
    public string Name { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public ICollection<Team> Teams { get; set; } = [];
    public ICollection<Match> Matches { get; set; } = [];
}

public class Team
{
    public int Id { get; set; }
    public int TournamentId { get; set; }
    public Tournament? Tournament { get; set; }

    public int? GroupId { get; set; }
    public TournamentGroup? Group { get; set; }

    public string Name { get; set; } = string.Empty;

    /// <summary>Three letter abbreviation used in compact tables and the bracket.</summary>
    public string? ShortName { get; set; }

    public string? ColorHex { get; set; }
    public string? LogoUrl { get; set; }
    public string? Manager { get; set; }
    public int SortOrder { get; set; }

    /// <summary>Points deducted by the organiser, e.g. for a forfeited match.</summary>
    public int PointsAdjustment { get; set; }

    public ICollection<Player> Players { get; set; } = [];
}

public class Player
{
    public int Id { get; set; }
    public int TeamId { get; set; }
    public Team? Team { get; set; }

    public string Name { get; set; } = string.Empty;
    public int? ShirtNumber { get; set; }
    public string? Position { get; set; }
    public bool IsActive { get; set; } = true;
}

public class Match
{
    public int Id { get; set; }
    public int TournamentId { get; set; }
    public Tournament? Tournament { get; set; }

    public int? GroupId { get; set; }
    public TournamentGroup? Group { get; set; }

    public MatchStage Stage { get; set; } = MatchStage.Group;

    /// <summary>Matchday within the group stage, or the bracket slot for knockout ties.</summary>
    public int Round { get; set; } = 1;

    public int? HomeTeamId { get; set; }
    public Team? HomeTeam { get; set; }

    public int? AwayTeamId { get; set; }
    public Team? AwayTeam { get; set; }

    /// <summary>Placeholder shown before the bracket is resolved, e.g. "Winner QF1".</summary>
    public string? HomePlaceholder { get; set; }
    public string? AwayPlaceholder { get; set; }

    public DateTime? KickoffUtc { get; set; }
    public string? Venue { get; set; }

    public MatchStatus Status { get; set; } = MatchStatus.Scheduled;

    public int HomeScore { get; set; }
    public int AwayScore { get; set; }

    public int? HomePenalties { get; set; }
    public int? AwayPenalties { get; set; }

    /// <summary>Set when the referee starts the clock, used to derive the live minute.</summary>
    public DateTime? StartedUtc { get; set; }
    public DateTime? FinishedUtc { get; set; }

    public string? Notes { get; set; }
    public DateTime UpdatedUtc { get; set; } = DateTime.UtcNow;

    public ICollection<MatchEvent> Events { get; set; } = [];

    public bool CountsTowardsTable => Stage == MatchStage.Group && Status == MatchStatus.Finished;

    /// <summary>Knockout winner, using the penalty shootout result when the score is level.</summary>
    public int? GetWinnerTeamId()
    {
        if (Status != MatchStatus.Finished || HomeTeamId is null || AwayTeamId is null)
        {
            return null;
        }

        if (HomeScore != AwayScore)
        {
            return HomeScore > AwayScore ? HomeTeamId : AwayTeamId;
        }

        if (HomePenalties is null || AwayPenalties is null || HomePenalties == AwayPenalties)
        {
            return null;
        }

        return HomePenalties > AwayPenalties ? HomeTeamId : AwayTeamId;
    }
}

public class MatchEvent
{
    public int Id { get; set; }
    public int MatchId { get; set; }
    public Match? Match { get; set; }

    public int TeamId { get; set; }
    public Team? Team { get; set; }

    /// <summary>Null when the tournament is running in teams-and-scores mode.</summary>
    public int? PlayerId { get; set; }
    public Player? Player { get; set; }

    public MatchEventType Type { get; set; }
    public int Minute { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
}

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Admin;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginUtc { get; set; }
}
