namespace LigaCup.Domain.Enums;

public enum TournamentFormat
{
    /// <summary>One or more groups, the table decides the winner.</summary>
    GroupsOnly = 0,

    /// <summary>Group stage followed by a knockout bracket.</summary>
    GroupsThenKnockout = 1,

    /// <summary>Straight knockout bracket, no group stage.</summary>
    KnockoutOnly = 2,

    /// <summary>One combined round-robin table with no groups or knockout stage.</summary>
    League = 3
}

public enum TournamentStatus
{
    Draft = 0,
    InProgress = 1,
    Completed = 2,
    Archived = 3
}

public enum MatchStage
{
    Group = 0,
    RoundOf32 = 1,
    RoundOf16 = 2,
    QuarterFinal = 3,
    SemiFinal = 4,
    ThirdPlacePlayOff = 5,
    Final = 6
}

public enum MatchStatus
{
    Scheduled = 0,
    Live = 1,
    HalfTime = 2,
    Finished = 3,
    Postponed = 4,
    Abandoned = 5,

    /// <summary>Clock stopped inside a period, for an injury or a called timeout.</summary>
    Paused = 6
}

public enum MatchEventType
{
    Goal = 0,
    OwnGoal = 1,
    PenaltyGoal = 2,
    PenaltyMissed = 3,
    Assist = 4,
    YellowCard = 5,
    RedCard = 6,
    Substitution = 7
}

/// <summary>
/// Ordered criteria used to separate teams that are level in a group table.
/// </summary>
public enum TiebreakerRule
{
    GoalDifference = 0,
    GoalsScored = 1,
    GoalsConceded = 2,
    Wins = 3,
    HeadToHeadPoints = 4,
    HeadToHeadGoalDifference = 5,
    HeadToHeadGoalsScored = 6,
    DisciplinaryPoints = 7,
    TeamName = 8,
    Lottery = 9
}

public enum UserRole
{
    Viewer = 0,
    Editor = 1,
    Admin = 2
}
