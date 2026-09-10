export type TournamentFormat = 'GroupsOnly' | 'GroupsThenKnockout' | 'KnockoutOnly';
export type TournamentStatus = 'Draft' | 'InProgress' | 'Completed' | 'Archived';
export type MatchStatus =
    | 'Scheduled'
    | 'Live'
    | 'HalfTime'
    | 'Finished'
    | 'Postponed'
    | 'Abandoned'
    | 'Paused';
export type MatchStage =
    | 'Group'
    | 'RoundOf32'
    | 'RoundOf16'
    | 'QuarterFinal'
    | 'SemiFinal'
    | 'ThirdPlacePlayOff'
    | 'Final';
export type MatchEventType =
    | 'Goal'
    | 'OwnGoal'
    | 'PenaltyGoal'
    | 'PenaltyMissed'
    | 'Assist'
    | 'YellowCard'
    | 'RedCard'
    | 'Substitution';
export type TiebreakerRule =
    | 'GoalDifference'
    | 'GoalsScored'
    | 'GoalsConceded'
    | 'Wins'
    | 'HeadToHeadPoints'
    | 'HeadToHeadGoalDifference'
    | 'HeadToHeadGoalsScored'
    | 'DisciplinaryPoints'
    | 'TeamName';

export interface AuthResponse {
    token: string;
    expiresUtc: string;
    username: string;
    role: string;
    refreshToken: string;
}

export type UserRole = 'Viewer' | 'Editor' | 'Admin';

export interface User {
    id: number;
    username: string;
    email: string | null;
    role: UserRole;
    isActive: boolean;
    createdUtc: string;
    lastLoginUtc: string | null;
}

export interface CreateUserRequest {
    username: string;
    email: string | null;
    password: string;
    role: UserRole;
}

export interface UpdateUserRequest {
    email: string | null;
    role: UserRole;
    isActive: boolean;
}

export interface TournamentSummary {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    season: number;
    format: TournamentFormat;
    status: TournamentStatus;
    trackPlayers: boolean;
    trackCards: boolean;
    periodCount: number;
    periodDurationMinutes: number;
    breakDurationMinutes: number;
    trackMatchClock: boolean;
    allowTimeouts: boolean;
    useStoppageTime: boolean;
    teamCount: number;
    matchCount: number;
}

export interface SaveTournamentRequest {
    name: string;
    slug: string | null;
    description: string | null;
    season: number;
    format: TournamentFormat;
    status: TournamentStatus;
    pointsForWin: number;
    pointsForDraw: number;
    pointsForLoss: number;
    groupRounds: number;
    teamsAdvancingPerGroup: number;
    includeBestThirdPlaced: boolean;
    hasThirdPlacePlayOff: boolean;
    trackPlayers: boolean;
    trackCards: boolean;
    periodCount: number;
    periodDurationMinutes: number;
    breakDurationMinutes: number;
    trackMatchClock: boolean;
    allowTimeouts: boolean;
    useStoppageTime: boolean;
    tiebreakers: TiebreakerRule[] | null;
}

export interface Group {
    id: number;
    name: string;
    sortOrder: number;
}

export interface Player {
    id: number;
    teamId: number;
    name: string;
    shirtNumber: number | null;
    position: string | null;
    isActive: boolean;
}

export interface Team {
    id: number;
    name: string;
    shortName: string | null;
    colorHex: string | null;
    logoUrl: string | null;
    manager: string | null;
    groupId: number | null;
    groupName: string | null;
    pointsAdjustment: number;
    players: Player[];
}

export interface MatchEvent {
    id: number;
    matchId: number;
    teamId: number;
    teamName: string;
    playerId: number | null;
    playerName: string | null;
    type: MatchEventType;
    minute: number;
    note: string | null;
}

export interface MatchClock {
    period: number;
    periodElapsedSeconds: number;
    clockStartedUtc: string | null;
    isRunning: boolean;
    stoppageMinutes: number;
    displayMinute: number;
    stoppageShown: number | null;
}

export interface Match {
    id: number;
    tournamentId: number;
    groupId: number | null;
    groupName: string | null;
    stage: MatchStage;
    round: number;
    homeTeamId: number | null;
    homeTeamName: string;
    homeTeamShortName: string | null;
    homeTeamLogoUrl: string | null;
    awayTeamId: number | null;
    awayTeamName: string;
    awayTeamShortName: string | null;
    awayTeamLogoUrl: string | null;
    kickoffUtc: string | null;
    venue: string | null;
    status: MatchStatus;
    homeScore: number;
    awayScore: number;
    homePenalties: number | null;
    awayPenalties: number | null;
    clock: MatchClock;
    notes: string | null;
    events: MatchEvent[];
}

export interface StandingRow {
    position: number;
    teamId: number;
    teamName: string;
    shortName: string | null;
    logoUrl: string | null;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
    yellowCards: number;
    redCards: number;
    form: string[];
    isQualifying: boolean;
}

export interface GroupTable {
    groupId: number | null;
    groupName: string;
    rows: StandingRow[];
}

export interface Scorer {
    playerId: number;
    playerName: string;
    teamId: number;
    teamName: string;
    goals: number;
    assists: number;
}

export interface BracketMatch {
    stage: MatchStage;
    stageName: string;
    match: Match;
}

export interface TournamentDetail {
    tournament: TournamentSummary;
    groups: Group[];
    teams: Team[];
    matches: Match[];
    tables: GroupTable[];
    bracket: BracketMatch[];
    topScorers: Scorer[];
}

export interface LiveUpdate {
    slug: string;
    match: Match;
    tables: GroupTable[];
    bracket: BracketMatch[];
    topScorers: Scorer[];
}
