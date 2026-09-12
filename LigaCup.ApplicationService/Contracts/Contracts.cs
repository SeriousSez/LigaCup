using LigaCup.Domain.Enums;

namespace LigaCup.ApplicationService.Contracts;

public record LoginRequest(string Username, string Password);

public record AuthResponse(
    string Token,
    DateTime ExpiresUtc,
    string Username,
    string Role,
    string RefreshToken);

public record RefreshRequest(string RefreshToken);

public record UserDto(
    int Id,
    string Username,
    string? Email,
    UserRole Role,
    bool IsActive,
    DateTime CreatedUtc,
    DateTime? LastLoginUtc);

public record CreateUserRequest(string Username, string? Email, string Password, UserRole Role);

public record UpdateUserRequest(string? Email, UserRole Role, bool IsActive);

public record ResetPasswordRequest(string Password);

public record TournamentSummaryDto(
    int Id,
    string Name,
    string Slug,
    string? Description,
    string? Rules,
    DateTime? TournamentDateUtc,
    int Season,
    TournamentFormat Format,
    TournamentStatus Status,
    bool TrackPlayers,
    PlayerRegistrationMode PlayerRegistrationMode,
    bool TrackCards,
    int PeriodCount,
    int PeriodDurationMinutes,
    int BreakDurationMinutes,
    int? MatchIntervalMinutes,
    int MatchesPerTimeSlot,
    bool TrackMatchClock,
    bool AllowTimeouts,
    bool UseStoppageTime,
    int PointsForWin,
    int PointsForDraw,
    int PointsForLoss,
    int GroupRounds,
    int TeamsAdvancingPerGroup,
    bool IncludeBestThirdPlaced,
    bool HasThirdPlacePlayOff,
    IReadOnlyList<TiebreakerRule> Tiebreakers,
    int TeamCount,
    int MatchCount);

public record SaveTournamentRequest(
    string Name,
    string? Slug,
    string? Description,
    string? Rules,
    DateTime? TournamentDateUtc,
    int Season,
    TournamentFormat Format,
    TournamentStatus Status,
    int PointsForWin,
    int PointsForDraw,
    int PointsForLoss,
    int GroupRounds,
    int TeamsAdvancingPerGroup,
    bool IncludeBestThirdPlaced,
    bool HasThirdPlacePlayOff,
    bool TrackPlayers,
    PlayerRegistrationMode PlayerRegistrationMode,
    bool TrackCards,
    int PeriodCount,
    int PeriodDurationMinutes,
    int BreakDurationMinutes,
    int? MatchIntervalMinutes,
    int MatchesPerTimeSlot,
    bool TrackMatchClock,
    bool AllowTimeouts,
    bool UseStoppageTime,
    IReadOnlyList<TiebreakerRule>? Tiebreakers);

public record GroupDto(int Id, string Name, int SortOrder);

public record SaveGroupRequest(string Name, int SortOrder);

public record TeamDto(
    int Id,
    string Name,
    string? ShortName,
    string? ColorHex,
    string? LogoUrl,
    string? Manager,
    int? GroupId,
    string? GroupName,
    int PointsAdjustment,
    IReadOnlyList<PlayerDto> Players);

public record SaveTeamRequest(
    string Name,
    string? ShortName,
    string? ColorHex,
    string? LogoUrl,
    string? Manager,
    int? GroupId,
    int PointsAdjustment);

public record PlayerDto(int Id, int TeamId, string Name, int? ShirtNumber, string? Position, bool IsActive);

public record SavePlayerRequest(int TeamId, string Name, int? ShirtNumber, string? Position, bool IsActive);

public record MatchEventDto(
    int Id,
    int MatchId,
    int TeamId,
    string TeamName,
    int? PlayerId,
    string? PlayerName,
    MatchEventType Type,
    int Minute,
    string? Note);

public record SaveMatchEventRequest(int TeamId, int? PlayerId, MatchEventType Type, int Minute, string? Note);

public record MatchDto(
    int Id,
    int TournamentId,
    int? GroupId,
    string? GroupName,
    MatchStage Stage,
    int Round,
    int? HomeTeamId,
    string HomeTeamName,
    string? HomeTeamShortName,
    string? HomeTeamLogoUrl,
    int? AwayTeamId,
    string AwayTeamName,
    string? AwayTeamShortName,
    string? AwayTeamLogoUrl,
    DateTime? KickoffUtc,
    DateTime? ScheduledEndUtc,
    int? PitchNumber,
    string? Venue,
    MatchStatus Status,
    int HomeScore,
    int AwayScore,
    int? HomePenalties,
    int? AwayPenalties,
    MatchClockDto Clock,
    string? Notes,
    IReadOnlyList<MatchEventDto> Events);

/// <summary>
/// Raw clock state rather than a rendered minute, so a client can keep counting
/// between broadcasts instead of freezing until the next server message.
/// </summary>
public record MatchClockDto(
    int Period,
    int PeriodElapsedSeconds,
    DateTime? ClockStartedUtc,
    bool IsRunning,
    int StoppageMinutes,
    int DisplayMinute,
    int? StoppageShown);

public record SaveMatchRequest(
    int? GroupId,
    MatchStage Stage,
    int Round,
    int? HomeTeamId,
    int? AwayTeamId,
    string? HomePlaceholder,
    string? AwayPlaceholder,
    DateTime? KickoffUtc,
    int? PitchNumber,
    string? Venue);

public record UpdateScoreRequest(int HomeScore, int AwayScore, int? HomePenalties, int? AwayPenalties);

public record UpdateMatchStatusRequest(MatchStatus Status);

public record UpdateStoppageRequest(int StoppageMinutes);

public record StandingRowDto(
    int Position,
    int TeamId,
    string TeamName,
    string? ShortName,
    string? LogoUrl,
    int Played,
    int Won,
    int Drawn,
    int Lost,
    int GoalsFor,
    int GoalsAgainst,
    int GoalDifference,
    int Points,
    int YellowCards,
    int RedCards,
    IReadOnlyList<string> Form,
    bool IsQualifying);

public record GroupTableDto(int? GroupId, string GroupName, IReadOnlyList<StandingRowDto> Rows);

public record ScorerDto(int PlayerId, string PlayerName, int TeamId, string TeamName, int Goals, int Assists);

public record BracketMatchDto(MatchStage Stage, string StageName, MatchDto Match);

public record TournamentDetailDto(
    TournamentSummaryDto Tournament,
    IReadOnlyList<GroupDto> Groups,
    IReadOnlyList<TeamDto> Teams,
    IReadOnlyList<MatchDto> Matches,
    IReadOnlyList<GroupTableDto> Tables,
    IReadOnlyList<BracketMatchDto> Bracket,
    IReadOnlyList<ScorerDto> TopScorers,
    string? Rules);

public record GenerateFixturesRequest(bool IncludeGroupStage, bool IncludeKnockoutStage, bool ReplaceExisting);

/// <summary>Everything a connected client needs to repaint after a live change.</summary>
public record LiveUpdateDto(
    string Slug,
    MatchDto Match,
    IReadOnlyList<GroupTableDto> Tables,
    IReadOnlyList<BracketMatchDto> Bracket,
    IReadOnlyList<ScorerDto> TopScorers);
