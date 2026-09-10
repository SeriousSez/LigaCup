export interface Strings {
    nav: {
        tournaments: string;
        admin: string;
        signIn: string;
        signOut: string;
        languageLabel: string;
    };
    footer: string;
    common: {
        loading: string;
        save: string;
        saved: string;
        edit: string;
        cancel: string;
        add: string;
        remove: string;
        teams: string;
        matches: string;
        season: string;
        name: string;
        unassigned: string;
        somethingWentWrong: string;
    };
    home: {
        tagline: string;
        openAdmin: string;
        empty: string;
        loading: string;
    };
    login: {
        title: string;
        subtitle: string;
        username: string;
        password: string;
        submit: string;
        submitting: string;
        failed: string;
        showPassword: string;
        hidePassword: string;
    };
    userRole: Record<'Viewer' | 'Editor' | 'Admin', string>;
    users: {
        title: string;
        subtitle: string;
        manage: string;
        username: string;
        email: string;
        role: string;
        active: string;
        lastLogin: string;
        never: string;
        newUser: string;
        password: string;
        passwordHint: string;
        create: string;
        created: string;
        save: string;
        saved: string;
        resetPassword: string;
        newPassword: string;
        passwordReset: string;
        deleteUser: string;
        confirmDelete: string;
        empty: string;
        roleHelp: string;
        you: string;
    };
    tournamentStatus: Record<'Draft' | 'InProgress' | 'Completed' | 'Archived', string>;
    matchStatus: Record<
        'Scheduled' | 'Live' | 'HalfTime' | 'Finished' | 'Postponed' | 'Abandoned' | 'Paused',
        string
    >;
    clock: {
        firstHalf: string;
        secondHalf: string;
        period: string;
        breakAfterPeriod: string;
        stoppage: string;
        addedTime: string;
        noClock: string;
    };
    format: Record<'GroupsOnly' | 'GroupsThenKnockout' | 'KnockoutOnly' | 'League', string>;
    stage: Record<
        'Group' | 'RoundOf32' | 'RoundOf16' | 'QuarterFinal' | 'SemiFinal' | 'ThirdPlacePlayOff' | 'Final',
        string
    >;
    stagePlural: Record<
        'RoundOf32' | 'RoundOf16' | 'QuarterFinal' | 'SemiFinal' | 'ThirdPlacePlayOff' | 'Final',
        string
    >;
    eventType: Record<
        | 'Goal'
        | 'OwnGoal'
        | 'PenaltyGoal'
        | 'PenaltyMissed'
        | 'Assist'
        | 'YellowCard'
        | 'RedCard'
        | 'Substitution',
        string
    >;
    tiebreaker: Record<
        | 'GoalDifference'
        | 'GoalsScored'
        | 'GoalsConceded'
        | 'Wins'
        | 'HeadToHeadPoints'
        | 'HeadToHeadGoalDifference'
        | 'HeadToHeadGoalsScored'
        | 'DisciplinaryPoints'
        | 'TeamName',
        string
    >;
    connection: {
        live: string;
        connected: string;
        connecting: string;
        offline: string;
    };
    table: {
        position: string;
        team: string;
        played: string;
        won: string;
        drawn: string;
        lost: string;
        goalsFor: string;
        goalsAgainst: string;
        goalDifference: string;
        points: string;
        form: string;
        empty: string;
        playedFull: string;
        wonFull: string;
        drawnFull: string;
        lostFull: string;
        goalsForFull: string;
        goalsAgainstFull: string;
        goalDifferenceFull: string;
        pointsFull: string;
    };
    tournament: {
        notFound: string;
        playingNow: string;
        setup: string;
        liveConsole: string;
        tabs: { tables: string; fixtures: string; bracket: string; scorers: string };
        noTables: string;
        noFixtures: string;
        matchday: string;
        league: string;
        scorers: { player: string; team: string; goals: string; assists: string; empty: string };
    };
    matchCard: {
        penalties: string;
        ownGoalShort: string;
        penaltyShort: string;
    };
    placeholder: {
        winner: string;
        loser: string;
        seed: string;
        tbd: string;
    };
    adminHome: {
        title: string;
        newTournament: string;
        create: string;
        trackPlayers: string;
        yourTournaments: string;
        setup: string;
        view: string;
        liveConsole: string;
        empty: string;
        nameRequired: string;
        createFailed: string;
        countSummary: string;
    };
    setup: {
        subtitle: string;
        publicPage: string;
        rules: string;
        status: string;
        format: string;
        pointsWin: string;
        pointsDraw: string;
        pointsLoss: string;
        groupRounds: string;
        advancing: string;
        matchLength: string;
        trackPlayers: string;
        trackCards: string;
        thirdPlace: string;
        periodCount: string;
        periodDuration: string;
        breakDuration: string;
        trackMatchClock: string;
        allowTimeouts: string;
        useStoppageTime: string;
        clockSection: string;
        clockHelp: string;
        tiebreakersTitle: string;
        tiebreakersHelp: string;
        moveUp: string;
        moveDown: string;
        saveRules: string;
        saveFailed: string;
        groups: string;
        noGroups: string;
        groupPlaceholder: string;
        addGroup: string;
        teams: string;
        noShortName: string;
        pointsSuffix: string;
        teamPlaceholder: string;
        shortPlaceholder: string;
        addTeam: string;
        removeTeamBlocked: string;
        squads: string;
        noPlayers: string;
        playerPlaceholder: string;
        fixtures: string;
        fixturesHelp: string;
        groupStage: string;
        knockoutBracket: string;
        replaceExisting: string;
        generate: string;
        seedKnockout: string;
        generated: string;
        generateBlocked: string;
        seeded: string;
        seedFailed: string;
    };
    live: {
        title: string;
        setup: string;
        publicPage: string;
        match: string;
        homeGoalAdd: string;
        homeGoalRemove: string;
        awayGoalAdd: string;
        awayGoalRemove: string;
        homePenalties: string;
        awayPenalties: string;
        saveShootout: string;
        setStoppage: string;
        recordEvent: string;
        team: string;
        player: string;
        notRecorded: string;
        type: string;
        minute: string;
        addEvent: string;
        eventNote: string;
        eventFeed: string;
        minuteShort: string;
        undo: string;
        tablesAuto: string;
    };
}

export const danish: Strings = {
    nav: {
        tournaments: 'Turneringer',
        admin: 'Admin',
        signIn: 'Log ind',
        signOut: 'Log ud',
        languageLabel: 'Skift sprog',
    },
    footer: 'Liga Cup · stillingen opdateres automatisk',
    common: {
        loading: 'Indlæser...',
        save: 'Gem',
        saved: 'Gemt.',
        edit: 'Rediger',
        cancel: 'Annuller',
        add: 'Tilføj',
        remove: 'Fjern',
        teams: 'hold',
        matches: 'kampe',
        season: 'Sæson',
        name: 'Navn',
        unassigned: 'Ingen gruppe',
        somethingWentWrong: 'Noget gik galt.',
    },
    home: {
        tagline:
            'Live resultater, automatiske gruppetabeller og et slutspilsskema, der udfylder sig selv, efterhånden som kampene bliver spillet.',
        openAdmin: 'Åbn administration',
        empty: 'Der er ikke oprettet nogen turneringer endnu.',
        loading: 'Henter turneringer...',
    },
    login: {
        title: 'Log ind',
        subtitle: 'Adgang for arrangøren til liveresultater og opsætning.',
        username: 'Brugernavn eller e-mail',
        password: 'Adgangskode',
        submit: 'Log ind',
        submitting: 'Logger ind...',
        failed: 'Brugernavn og adgangskode blev ikke godkendt.',
        showPassword: 'Vis adgangskode',
        hidePassword: 'Skjul adgangskode',
    },
    userRole: {
        Viewer: 'Tilskuer',
        Editor: 'Redaktør',
        Admin: 'Administrator',
    },
    users: {
        title: 'Brugere',
        subtitle: 'Opret og administrer adgang til Liga Cup.',
        manage: 'Brugere',
        username: 'Brugernavn',
        email: 'E-mail',
        role: 'Rolle',
        active: 'Aktiv',
        lastLogin: 'Sidst logget ind',
        never: 'Aldrig',
        newUser: 'Ny bruger',
        password: 'Adgangskode',
        passwordHint: 'Mindst 8 tegn.',
        create: 'Opret bruger',
        created: 'Brugeren blev oprettet.',
        save: 'Gem',
        saved: 'Gemt.',
        resetPassword: 'Nulstil adgangskode',
        newPassword: 'Ny adgangskode',
        passwordReset: 'Adgangskoden blev nulstillet.',
        deleteUser: 'Slet',
        confirmDelete: 'Er du sikker på, at du vil slette denne bruger?',
        empty: 'Der er ingen andre brugere endnu.',
        roleHelp:
            'Tilskuere kan kun se siden. Redaktører kan styre kampe og resultater. Administratorer kan desuden oprette brugere.',
        you: 'Dig',
    },
    tournamentStatus: {
        Draft: 'Kladde',
        InProgress: 'I gang',
        Completed: 'Afsluttet',
        Archived: 'Arkiveret',
    },
    matchStatus: {
        Scheduled: 'Planlagt',
        Live: 'Live',
        HalfTime: 'Pause',
        Finished: 'Slut',
        Postponed: 'Udsat',
        Abandoned: 'Afbrudt',
        Paused: 'Tid stoppet',
    },
    clock: {
        firstHalf: '1. halvleg',
        secondHalf: '2. halvleg',
        period: '{n}. periode',
        breakAfterPeriod: 'Pause efter periode',
        stoppage: 'Tillægstid',
        addedTime: 'Tillægstid (minutter)',
        noClock: 'Uret er slået fra for denne turnering.',
    },
    format: {
        League: 'Liga',
        GroupsOnly: 'Kun gruppespil',
        GroupsThenKnockout: 'Gruppespil og slutspil',
        KnockoutOnly: 'Rent slutspil',
    },
    stage: {
        Group: 'Gruppespil',
        RoundOf32: '1/16-finale',
        RoundOf16: 'Ottendedelsfinale',
        QuarterFinal: 'Kvartfinale',
        SemiFinal: 'Semifinale',
        ThirdPlacePlayOff: 'Bronzekamp',
        Final: 'Finale',
    },
    stagePlural: {
        RoundOf32: '1/16-finaler',
        RoundOf16: 'Ottendedelsfinaler',
        QuarterFinal: 'Kvartfinaler',
        SemiFinal: 'Semifinaler',
        ThirdPlacePlayOff: 'Bronzekamp',
        Final: 'Finale',
    },
    eventType: {
        Goal: 'Mål',
        OwnGoal: 'Selvmål',
        PenaltyGoal: 'Scoret straffe',
        PenaltyMissed: 'Brændt straffe',
        Assist: 'Assist',
        YellowCard: 'Gult kort',
        RedCard: 'Rødt kort',
        Substitution: 'Udskiftning',
    },
    tiebreaker: {
        GoalDifference: 'Målforskel',
        GoalsScored: 'Scorede mål',
        GoalsConceded: 'Færrest indkasserede mål',
        Wins: 'Flest sejre',
        HeadToHeadPoints: 'Point i indbyrdes opgør',
        HeadToHeadGoalDifference: 'Målforskel i indbyrdes opgør',
        HeadToHeadGoalsScored: 'Scorede mål i indbyrdes opgør',
        DisciplinaryPoints: 'Færrest disciplinærpoint',
        TeamName: 'Alfabetisk',
    },
    connection: {
        live: 'Live',
        connected: 'Forbundet',
        connecting: 'Forbinder',
        offline: 'Offline',
    },
    table: {
        position: '#',
        team: 'Hold',
        played: 'K',
        won: 'V',
        drawn: 'U',
        lost: 'T',
        goalsFor: 'MF',
        goalsAgainst: 'MI',
        goalDifference: '+/-',
        points: 'P',
        form: 'Form',
        empty: 'Der er ingen hold i denne gruppe endnu.',
        playedFull: 'Kampe',
        wonFull: 'Vundet',
        drawnFull: 'Uafgjort',
        lostFull: 'Tabt',
        goalsForFull: 'Mål for',
        goalsAgainstFull: 'Mål imod',
        goalDifferenceFull: 'Målforskel',
        pointsFull: 'Point',
    },
    tournament: {
        notFound: 'Turneringen kunne ikke indlæses.',
        playingNow: 'Spilles nu',
        setup: 'Opsætning',
        liveConsole: 'Livekonsol',
        tabs: {
            tables: 'Stilling',
            fixtures: 'Kampe og resultater',
            bracket: 'Slutspil',
            scorers: 'Topscorere',
        },
        noTables: 'Ingen gruppetabeller endnu. Tilføj hold og generer kampprogrammet.',
        noFixtures: 'Der er ikke genereret et kampprogram endnu.',
        matchday: 'spillerunde',
        league: 'Række',
        scorers: {
            player: 'Spiller',
            team: 'Hold',
            goals: 'Mål',
            assists: 'Assists',
            empty: 'Der er ikke registreret nogen mål endnu.',
        },
    },
    matchCard: {
        penalties: 'Straffesparkskonkurrence',
        ownGoalShort: '(selvmål)',
        penaltyShort: '(straffe)',
    },
    placeholder: {
        winner: 'Vinder af {label}',
        loser: 'Taber af {label}',
        seed: 'Seedning {label}',
        tbd: 'Ikke afgjort',
    },
    adminHome: {
        title: 'Administration',
        newTournament: 'Ny turnering',
        create: 'Opret turnering',
        trackPlayers: 'Registrer spillere og målscorere',
        yourTournaments: 'Dine turneringer',
        setup: 'Opsætning',
        view: 'Se',
        liveConsole: 'Livekonsol',
        empty: 'Der er ikke noget her endnu. Opret din første turnering ovenfor.',
        nameRequired: 'Giv turneringen et navn først.',
        createFailed: 'Turneringen kunne ikke oprettes.',
        countSummary: '{teams} hold, {matches} kampe',
    },
    setup: {
        subtitle: 'Opsætning og regler',
        publicPage: 'Offentlig side',
        rules: 'Regler',
        status: 'Status',
        format: 'Format',
        pointsWin: 'Point for sejr',
        pointsDraw: 'Point for uafgjort',
        pointsLoss: 'Point for nederlag',
        groupRounds: 'Antal indbyrdes møder',
        advancing: 'Hold videre pr. gruppe',
        matchLength: 'Kamplængde (minutter)',
        trackPlayers: 'Registrer spillere og målscorere',
        trackCards: 'Registrer kort',
        thirdPlace: 'Bronzekamp',
        periodCount: 'Antal perioder',
        periodDuration: 'Minutter pr. periode',
        breakDuration: 'Pause mellem perioder (minutter)',
        trackMatchClock: 'Vis kampur',
        allowTimeouts: 'Tillad at uret stoppes undervejs',
        useStoppageTime: 'Tæl tillægstid (45+2)',
        clockSection: 'Kampur',
        clockHelp:
            'Uret starter, når du trykker Live, og står stille i pausen. To perioder à 45 minutter giver en almindelig fodboldkamp.',
        tiebreakersTitle: 'Kriterier ved pointlighed',
        tiebreakersHelp:
            'Anvendes efter point. Indbyrdes opgør sammenligner kun de hold, der stadig står lige.',
        moveUp: 'Flyt op',
        moveDown: 'Flyt ned',
        saveRules: 'Gem regler',
        saveFailed: 'Reglerne kunne ikke gemmes.',
        groups: 'Grupper',
        noGroups: 'Ingen grupper. Hold uden gruppe danner én samlet række.',
        groupPlaceholder: 'Gruppe A',
        addGroup: 'Tilføj gruppe',
        teams: 'Hold',
        noShortName: 'Ingen forkortelse',
        pointsSuffix: 'point',
        teamPlaceholder: 'Holdnavn',
        shortPlaceholder: 'ABC',
        addTeam: 'Tilføj hold',
        removeTeamBlocked: 'Slet holdets kampe, før holdet fjernes.',
        squads: 'Trupper',
        noPlayers: 'Ingen spillere endnu.',
        playerPlaceholder: 'Spillerens navn',
        fixtures: 'Kampprogram',
        fixturesHelp:
            'Gruppekampene er en fuld turnering, hvor alle møder alle. Slutspilsskemaet oprettes med pladsholdere og udfylder sig selv, efterhånden som kampene bliver afgjort.',
        groupStage: 'Gruppespil',
        knockoutBracket: 'Slutspilsskema',
        replaceExisting: 'Erstat eksisterende kampe',
        generate: 'Generer kampprogram',
        seedKnockout: 'Sæt slutspil ud fra stillingen',
        generated: 'Der blev oprettet {count} kampe.',
        generateBlocked:
            'Der findes allerede kampe. Sæt flueben i "Erstat eksisterende kampe" for at generere igen.',
        seeded: 'Der blev sat {count} slutspilskampe ud fra stillingen.',
        seedFailed: 'Slutspillet kunne ikke sættes.',
    },
    live: {
        title: 'Livekonsol',
        setup: 'Opsætning',
        publicPage: 'Offentlig side',
        match: 'Kamp',
        homeGoalAdd: 'Tilføj mål til hjemmeholdet',
        homeGoalRemove: 'Fjern mål fra hjemmeholdet',
        awayGoalAdd: 'Tilføj mål til udeholdet',
        awayGoalRemove: 'Fjern mål fra udeholdet',
        homePenalties: 'Straffe hjemme',
        awayPenalties: 'Straffe ude',
        saveShootout: 'Gem straffesparkskonkurrence',
        setStoppage: 'Gem tillægstid',
        recordEvent: 'Registrer en hændelse',
        team: 'Hold',
        player: 'Spiller',
        notRecorded: 'Ikke registreret',
        type: 'Type',
        minute: 'Minut',
        addEvent: 'Tilføj hændelse',
        eventNote:
            'Mål tilføjet her ændrer også stillingen, så brug enten knapperne ovenfor eller hændelseslisten, ikke begge dele til det samme mål.',
        eventFeed: 'Hændelser',
        minuteShort: 'Min.',
        undo: 'Fortryd',
        tablesAuto: 'Stillingen opdateres automatisk',
    },
};

export const english: Strings = {
    nav: {
        tournaments: 'Tournaments',
        admin: 'Admin',
        signIn: 'Sign in',
        signOut: 'Sign out',
        languageLabel: 'Change language',
    },
    footer: 'Liga Cup · live tables update automatically',
    common: {
        loading: 'Loading...',
        save: 'Save',
        saved: 'Saved.',
        edit: 'Edit',
        cancel: 'Cancel',
        add: 'Add',
        remove: 'Remove',
        teams: 'teams',
        matches: 'matches',
        season: 'Season',
        name: 'Name',
        unassigned: 'Unassigned',
        somethingWentWrong: 'Something went wrong.',
    },
    home: {
        tagline:
            'Live scores, automatic group tables and a knockout bracket that fills itself in as results come in.',
        openAdmin: 'Open admin',
        empty: 'No tournaments have been created yet.',
        loading: 'Loading tournaments...',
    },
    login: {
        title: 'Sign in',
        subtitle: 'Organiser access for live scoring and tournament setup.',
        username: 'Username or email',
        password: 'Password',
        submit: 'Sign in',
        submitting: 'Signing in...',
        failed: 'That username and password combination was not accepted.',
        showPassword: 'Show password',
        hidePassword: 'Hide password',
    },
    userRole: {
        Viewer: 'Viewer',
        Editor: 'Editor',
        Admin: 'Administrator',
    },
    users: {
        title: 'Users',
        subtitle: 'Create and manage access to Liga Cup.',
        manage: 'Users',
        username: 'Username',
        email: 'Email',
        role: 'Role',
        active: 'Active',
        lastLogin: 'Last signed in',
        never: 'Never',
        newUser: 'New user',
        password: 'Password',
        passwordHint: 'At least 8 characters.',
        create: 'Create user',
        created: 'The user was created.',
        save: 'Save',
        saved: 'Saved.',
        resetPassword: 'Reset password',
        newPassword: 'New password',
        passwordReset: 'The password was reset.',
        deleteUser: 'Delete',
        confirmDelete: 'Are you sure you want to delete this user?',
        empty: 'There are no other users yet.',
        roleHelp:
            'Viewers can only read the site. Editors can run matches and results. Administrators can also create users.',
        you: 'You',
    },
    tournamentStatus: {
        Draft: 'Draft',
        InProgress: 'In progress',
        Completed: 'Completed',
        Archived: 'Archived',
    },
    matchStatus: {
        Scheduled: 'Scheduled',
        Live: 'Live',
        HalfTime: 'Half time',
        Finished: 'Full time',
        Postponed: 'Postponed',
        Abandoned: 'Abandoned',
        Paused: 'Clock stopped',
    },
    clock: {
        firstHalf: 'First half',
        secondHalf: 'Second half',
        period: 'Period {n}',
        breakAfterPeriod: 'Break after period',
        stoppage: 'Added time',
        addedTime: 'Added time (minutes)',
        noClock: 'The clock is switched off for this tournament.',
    },
    format: {
        League: 'League',
        GroupsOnly: 'Group stage only',
        GroupsThenKnockout: 'Groups then knockout',
        KnockoutOnly: 'Straight knockout',
    },
    stage: {
        Group: 'Group stage',
        RoundOf32: 'Round of 32',
        RoundOf16: 'Round of 16',
        QuarterFinal: 'Quarter-final',
        SemiFinal: 'Semi-final',
        ThirdPlacePlayOff: 'Third place play-off',
        Final: 'Final',
    },
    stagePlural: {
        RoundOf32: 'Round of 32',
        RoundOf16: 'Round of 16',
        QuarterFinal: 'Quarter-finals',
        SemiFinal: 'Semi-finals',
        ThirdPlacePlayOff: 'Third place play-off',
        Final: 'Final',
    },
    eventType: {
        Goal: 'Goal',
        OwnGoal: 'Own goal',
        PenaltyGoal: 'Penalty scored',
        PenaltyMissed: 'Penalty missed',
        Assist: 'Assist',
        YellowCard: 'Yellow card',
        RedCard: 'Red card',
        Substitution: 'Substitution',
    },
    tiebreaker: {
        GoalDifference: 'Goal difference',
        GoalsScored: 'Goals scored',
        GoalsConceded: 'Fewest goals conceded',
        Wins: 'Most wins',
        HeadToHeadPoints: 'Head-to-head points',
        HeadToHeadGoalDifference: 'Head-to-head goal difference',
        HeadToHeadGoalsScored: 'Head-to-head goals scored',
        DisciplinaryPoints: 'Fewest disciplinary points',
        TeamName: 'Alphabetical',
    },
    connection: {
        live: 'Live',
        connected: 'Connected',
        connecting: 'Connecting',
        offline: 'Offline',
    },
    table: {
        position: '#',
        team: 'Team',
        played: 'P',
        won: 'W',
        drawn: 'D',
        lost: 'L',
        goalsFor: 'GF',
        goalsAgainst: 'GA',
        goalDifference: 'GD',
        points: 'Pts',
        form: 'Form',
        empty: 'No teams in this group yet.',
        playedFull: 'Played',
        wonFull: 'Won',
        drawnFull: 'Drawn',
        lostFull: 'Lost',
        goalsForFull: 'Goals for',
        goalsAgainstFull: 'Goals against',
        goalDifferenceFull: 'Goal difference',
        pointsFull: 'Points',
    },
    tournament: {
        notFound: 'That tournament could not be loaded.',
        playingNow: 'Playing now',
        setup: 'Setup',
        liveConsole: 'Live console',
        tabs: {
            tables: 'Tables',
            fixtures: 'Fixtures & results',
            bracket: 'Knockout',
            scorers: 'Top scorers',
        },
        noTables: 'No group tables yet. Add teams and generate the fixtures.',
        noFixtures: 'No fixtures have been generated yet.',
        matchday: 'matchday',
        league: 'League',
        scorers: {
            player: 'Player',
            team: 'Team',
            goals: 'Goals',
            assists: 'Assists',
            empty: 'No goals recorded yet.',
        },
    },
    matchCard: {
        penalties: 'Penalties',
        ownGoalShort: '(og)',
        penaltyShort: '(pen)',
    },
    placeholder: {
        winner: 'Winner {label}',
        loser: 'Loser {label}',
        seed: 'Seed {label}',
        tbd: 'To be decided',
    },
    adminHome: {
        title: 'Admin',
        newTournament: 'New tournament',
        create: 'Create tournament',
        trackPlayers: 'Track players and goalscorers',
        yourTournaments: 'Your tournaments',
        setup: 'Set up',
        view: 'View',
        liveConsole: 'Live console',
        empty: 'Nothing here yet. Create your first tournament above.',
        nameRequired: 'Give the tournament a name first.',
        createFailed: 'The tournament could not be created.',
        countSummary: '{teams} teams, {matches} matches',
    },
    setup: {
        subtitle: 'Setup and rules',
        publicPage: 'Public page',
        rules: 'Rules',
        status: 'Status',
        format: 'Format',
        pointsWin: 'Points for a win',
        pointsDraw: 'Points for a draw',
        pointsLoss: 'Points for a loss',
        groupRounds: 'Times each pair meets',
        advancing: 'Teams advancing per group',
        matchLength: 'Match length (minutes)',
        trackPlayers: 'Track players and goalscorers',
        trackCards: 'Track cards',
        thirdPlace: 'Third place play-off',
        periodCount: 'Number of periods',
        periodDuration: 'Minutes per period',
        breakDuration: 'Break between periods (minutes)',
        trackMatchClock: 'Show a match clock',
        allowTimeouts: 'Allow the clock to be stopped mid-period',
        useStoppageTime: 'Count added time (45+2)',
        clockSection: 'Match clock',
        clockHelp:
            'The clock starts when you press Live and stands still during the interval. Two periods of 45 minutes gives a normal football match.',
        tiebreakersTitle: 'Tiebreakers, in order',
        tiebreakersHelp:
            'Applied after points. Head-to-head rules only compare the teams that are still level.',
        moveUp: 'Move up',
        moveDown: 'Move down',
        saveRules: 'Save rules',
        saveFailed: 'Could not save the rules.',
        groups: 'Groups',
        noGroups: 'No groups. Teams without a group form one combined league.',
        groupPlaceholder: 'Group A',
        addGroup: 'Add group',
        teams: 'Teams',
        noShortName: 'No short name',
        pointsSuffix: 'pts',
        teamPlaceholder: 'Team name',
        shortPlaceholder: 'ABC',
        addTeam: 'Add team',
        removeTeamBlocked: 'Delete the team fixtures before removing the team.',
        squads: 'Squads',
        noPlayers: 'No players yet.',
        playerPlaceholder: 'Player name',
        fixtures: 'Fixtures',
        fixturesHelp:
            'Group fixtures are a full round robin. The knockout bracket is created with placeholders and fills itself in as ties are decided.',
        groupStage: 'Group stage',
        knockoutBracket: 'Knockout bracket',
        replaceExisting: 'Replace existing fixtures',
        generate: 'Generate fixtures',
        seedKnockout: 'Seed knockout from tables',
        generated: 'Generated {count} fixtures.',
        generateBlocked: 'Fixtures already exist. Tick "replace existing fixtures" to regenerate them.',
        seeded: 'Filled {count} knockout ties from the group tables.',
        seedFailed: 'The knockout bracket could not be seeded.',
    },
    live: {
        title: 'Live console',
        setup: 'Setup',
        publicPage: 'Public page',
        match: 'Match',
        homeGoalAdd: 'Add a home goal',
        homeGoalRemove: 'Remove a home goal',
        awayGoalAdd: 'Add an away goal',
        awayGoalRemove: 'Remove an away goal',
        homePenalties: 'Home penalties',
        awayPenalties: 'Away penalties',
        saveShootout: 'Save shootout',
        setStoppage: 'Save added time',
        recordEvent: 'Record an event',
        team: 'Team',
        player: 'Player',
        notRecorded: 'Not recorded',
        type: 'Type',
        minute: 'Minute',
        addEvent: 'Add event',
        eventNote:
            'Goals added here also move the scoreline, so use either the buttons above or the event feed, not both for the same goal.',
        eventFeed: 'Event feed',
        minuteShort: 'Min',
        undo: 'Undo',
        tablesAuto: 'Tables update automatically',
    },
};
