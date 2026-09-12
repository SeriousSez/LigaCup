type AdminGuideKey =
    | 'open' | 'close' | 'kicker' | 'title' | 'libraryTitle' | 'libraryText' | 'start' | 'restart' | 'completed' | 'allGuides'
    | 'hintTitle' | 'hintText' | 'show' | 'dismiss' | 'back' | 'next' | 'done' | 'visitorGuides' | 'organizerGuides' | 'createTitle' | 'createText' | 'createNameTitle' | 'createNameText'
    | 'createFormatTitle' | 'createFormatText' | 'createSubmitTitle' | 'createSubmitText' | 'setupTitle'
    | 'setupText' | 'setupRulesTitle' | 'setupRulesText' | 'setupTeamsTitle' | 'setupTeamsText'
    | 'setupFixturesTitle' | 'setupFixturesText' | 'liveTitle' | 'liveText' | 'livePickerTitle'
    | 'livePickerText' | 'liveScoreTitle' | 'liveScoreText' | 'liveStatusTitle' | 'liveStatusText'
    | 'matchTitle' | 'matchText' | 'matchScoreTitle' | 'matchScoreText' | 'matchEventsTitle' | 'matchEventsText' | 'matchDetailsTitle' | 'matchDetailsText'
    | 'eventsTitle' | 'eventsText' | 'eventsPickerTitle' | 'eventsPickerText' | 'eventsFormTitle' | 'eventsFormText'
    | 'squadsTitle' | 'squadsText' | 'squadsTabTitle' | 'squadsTabText' | 'squadsManageTitle' | 'squadsManageText'
    | 'rulesTitle' | 'rulesText' | 'rulesBasicsTitle' | 'rulesBasicsText' | 'rulesClockTitle' | 'rulesClockText' | 'rulesTiebreakersTitle' | 'rulesTiebreakersText'
    | 'scheduleTitle' | 'scheduleText' | 'scheduleTabTitle' | 'scheduleTabText' | 'scheduleGenerateTitle' | 'scheduleGenerateText' | 'scheduleEditTitle' | 'scheduleEditText'
    | 'usersTitle' | 'usersText' | 'usersCreateTitle' | 'usersCreateText' | 'usersManageTitle' | 'usersManageText'
    | 'connectivityTitle' | 'connectivityText' | 'connectivityStatusTitle' | 'connectivityStatusText' | 'connectivityUpdatesTitle' | 'connectivityUpdatesText'
    | 'noKnockout' | 'noMatches' | 'noPlayerTracking' | 'organizerOnly' | 'adminOnly';

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
        confirmDelete: string;
        teams: string;
        matches: string;
        season: string;
        name: string;
        tournamentDateTime: string;
        unassigned: string;
        somethingWentWrong: string;
    };
    datePicker: {
        placeholder: string;
        ariaLabel: string;
        previousMonth: string;
        nextMonth: string;
        time: string;
        clear: string;
        today: string;
        weekdays: string[];
    };
    guide: {
        open: string;
        close: string;
        kicker: string;
        title: string;
        libraryTitle: string;
        libraryText: string;
        start: string;
        overviewTitle: string;
        overviewText: string;
        fixturesTitle: string;
        fixturesText: string;
        knockoutTitle: string;
        knockoutText: string;
        skip: string;
        back: string;
        next: string;
        done: string;
        headerTitle: string;
        headerText: string;
        statusTitle: string;
        statusText: string;
        tabsTitle: string;
        tabsText: string;
        tableTitle: string;
        tableText: string;
        fixturesTabsTitle: string;
        fixturesTabsText: string;
        fixturesListTitle: string;
        fixturesListText: string;
        fixturesMatchTitle: string;
        fixturesMatchText: string;
        knockoutTabsTitle: string;
        knockoutTabsText: string;
        knockoutBracketTitle: string;
        knockoutBracketText: string;
        knockoutMatchTitle: string;
        knockoutMatchText: string;
    };
    adminGuide: Record<AdminGuideKey, string>;
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
        | 'TeamName'
        | 'Lottery',
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
        tabs: { tables: string; fixtures: string; bracket: string; scorers: string; rules: string };
        noTables: string;
        noFixtures: string;
        noRules: string;
        matchday: string;
        league: string;
        bye: string;
        fixtureViewLabel: string;
        byRounds: string;
        allMatches: string;
        scorers: { player: string; team: string; goals: string; assists: string; empty: string };
    };
    matchCard: {
        penalties: string;
        ownGoalShort: string;
        penaltyShort: string;
        pitch: string;
        openMaps: string;
    };
    matchPage: {
        open: string;
        back: string;
        notFound: string;
        events: string;
        noEvents: string;
        details: string;
        kickoff: string;
        venue: string;
        notes: string;
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
        playerRegistration: string;
        playerRegistrationNames: string;
        playerRegistrationNumbers: string;
        playerRegistrationBoth: string;
        yourTournaments: string;
        setup: string;
        view: string;
        liveConsole: string;
        delete: string;
        deleteConfirm: string;
        empty: string;
        nameRequired: string;
        createFailed: string;
        deleteFailed: string;
        countSummary: string;
    };
    setup: {
        subtitle: string;
        publicPage: string;
        rules: string;
        defaultSettings: string;
        status: string;
        format: string;
        pointsWin: string;
        pointsDraw: string;
        pointsLoss: string;
        groupRounds: string;
        advancing: string;
        matchLength: string;
        trackPlayers: string;
        playerRegistration: string;
        playerRegistrationNames: string;
        playerRegistrationNumbers: string;
        playerRegistrationBoth: string;
        trackCards: string;
        thirdPlace: string;
        periodCount: string;
        periodDuration: string;
        breakDuration: string;
        matchInterval: string;
        matchIntervalHelp: string;
        matchesPerTimeSlot: string;
        trackMatchClock: string;
        allowTimeouts: string;
        useStoppageTime: string;
        rulesContent: string;
        rulesContentHelp: string;
        rulesBold: string;
        rulesItalic: string;
        rulesList: string;
        rulesHeading: string;
        rulesNumberedList: string;
        rulesUnderline: string;
        rulesQuote: string;
        rulesUndo: string;
        rulesRedo: string;
        rulesClear: string;
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
        shirtNumberPlaceholder: string;
        fixtures: string;
        fixturesHelp: string;
        schedule: string;
        addMatch: string;
        saveSchedule: string;
        saveAllSchedule: string;
        saveScheduleChanges: string;
        unsavedScheduleTitle: string;
        unsavedScheduleMessage: string;
        stayOnPage: string;
        discardScheduleChanges: string;
        fixturesNeedReviewTitle: string;
        fixturesNeedReviewMessage: string;
        reviewFixtures: string;
        leaveAnyway: string;
        kickoff: string;
        pitchNumber: string;
        location: string;
        locationPlaceholder: string;
        locationOverridePlaceholder: string;
        homeTeam: string;
        awayTeam: string;
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
        matchPage: string;
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
        confirmDelete: 'Er du sikker på, at du vil fjerne dette?',
        teams: 'hold',
        matches: 'kampe',
        season: 'Sæson',
        name: 'Navn',
        tournamentDateTime: 'Dato og tidspunkt',
        unassigned: 'Ingen gruppe',
        somethingWentWrong: 'Noget gik galt.',
    },
    datePicker: {
        placeholder: 'Vælg dato og tidspunkt',
        ariaLabel: 'Dato og tidspunkt',
        previousMonth: 'Forrige måned',
        nextMonth: 'Næste måned',
        time: 'Tidspunkt',
        clear: 'Ryd',
        today: 'I dag',
        weekdays: ['M', 'T', 'O', 'T', 'F', 'L', 'S'],
    },
    guide: {
        open: 'Åbn guide',
        close: 'Luk guide',
        kicker: 'Liga Cup guide',
        title: 'Sådan følger du turneringen',
        libraryTitle: 'Hvad vil du vide?',
        libraryText: 'Vælg en kort guide, og gå gennem funktionerne trin for trin.',
        start: 'Start guide',
        overviewTitle: 'Kom godt i gang',
        overviewText: 'Lær det vigtigste om turneringens side og stillingen.',
        fixturesTitle: 'Kampe og resultater',
        fixturesText: 'Se kampprogrammet og følg resultaterne efterhånden som de kommer.',
        knockoutTitle: 'Slutspillet',
        knockoutText: 'Få overblik over knockoutkampe og vejen mod finalen.',
        skip: 'Luk',
        back: 'Tilbage',
        next: 'Næste',
        done: 'Færdig',
        headerTitle: 'Turneringens overblik',
        headerText: 'Her kan du se sæsonen, antal hold og hvilken turneringsform der bruges.',
        statusTitle: 'Live-status',
        statusText: 'Den grønne status viser, om siden modtager liveopdateringer fra turneringen.',
        tabsTitle: 'Skift visning',
        tabsText: 'Brug fanerne til at skifte mellem stilling, kampe, resultater og slutspil.',
        tableTitle: 'Læs stillingen',
        tableText: 'Tabellen opdateres automatisk med kampe, point, mål og form, når resultater registreres.',
        fixturesTabsTitle: 'Find kampprogrammet',
        fixturesTabsText: 'Åbn fanen Kampe og resultater for at se hele turneringens kampprogram.',
        fixturesListTitle: 'Se spillerunderne',
        fixturesListText: 'Kampene er samlet efter spillerunde, så du hurtigt kan finde den rigtige dag.',
        fixturesMatchTitle: 'Følg en kamp',
        fixturesMatchText: 'På kampkortet kan du se resultat, status og registrerede hændelser.',
        knockoutTabsTitle: 'Åbn slutspillet',
        knockoutTabsText: 'Når der er slutspilskampe, vises fanen Slutspil ved siden af de andre visninger.',
        knockoutBracketTitle: 'Læs slutspilsskemaet',
        knockoutBracketText: 'Skemaet viser vejen fra de første knockoutkampe til finalen.',
        knockoutMatchTitle: 'Se knockoutkampen',
        knockoutMatchText: 'Kampkortet viser hold, resultat og status for hver kamp i slutspillet.',
    },
    adminGuide: {
        open: 'Åbn guide', close: 'Luk guide', kicker: 'Liga Cup guide', title: 'Kom godt i gang',
        libraryTitle: 'Hvad vil du vide?', libraryText: 'Vælg en kort guide til Liga Cups vigtigste funktioner.', visitorGuides: 'Tilskuerguides', organizerGuides: 'Arrangørguides', start: 'Start guide', restart: 'Start igen', completed: 'Gennemført', allGuides: 'Alle guider', hintTitle: 'Ny til Liga Cup?', hintText: 'Se en kort guide til de vigtigste funktioner.', show: 'Vis guide', dismiss: 'Luk guide', back: 'Tilbage', next: 'Næste', done: 'Færdig', noKnockout: 'Ingen af dine turneringer har et slutspil endnu.',
        createTitle: 'Opret turnering', createText: 'Opret en ny turnering fra administrationsforsiden.', createNameTitle: 'Giv turneringen et navn', createNameText: 'Skriv turneringens navn og vælg sæsonen, så den er let at finde.', createFormatTitle: 'Vælg format', createFormatText: 'Vælg liga, grupper eller knockout efter den turnering, du vil afvikle.', createSubmitTitle: 'Opret turneringen', createSubmitText: 'Tryk på Opret for at gemme turneringen og åbne den i administrationen.',
        setupTitle: 'Konfigurer turnering', setupText: 'Tilføj hold, grupper og regler, før kampene spilles.', setupRulesTitle: 'Start med reglerne', setupRulesText: 'Vælg format, point, tiebreakere og eventuelt kampur.', setupTeamsTitle: 'Tilføj hold og grupper', setupTeamsText: 'Opret grupper og tilføj hold med navn og forkortelse.', setupFixturesTitle: 'Generer kampprogrammet', setupFixturesText: 'Når holdene er klar, genererer du gruppekampe og eventuelt slutspil.',
        liveTitle: 'Opdater live-resultater', liveText: 'Brug livekonsollen under kampene.', livePickerTitle: 'Vælg kampen', livePickerText: 'Vælg den kamp, du vil styre, fra kampvælgeren.', liveScoreTitle: 'Opdater stillingen', liveScoreText: 'Brug plus- og minusknapperne til at registrere mål for hvert hold.', liveStatusTitle: 'Styr kampens status', liveStatusText: 'Start kampen, sæt den på pause eller afslut den, når dommeren fløjter.',
        matchTitle: 'Følg en livekamp', matchText: 'Se resultat, kampur, hændelser og praktiske oplysninger på kampens egen side.',
        matchScoreTitle: 'Følg resultatet', matchScoreText: 'Resultat, kampstatus og kampur opdateres automatisk, mens kampen spilles.',
        matchEventsTitle: 'Se kampens hændelser', matchEventsText: 'Mål, kort, assists og udskiftninger vises her, så snart arrangøren registrerer dem.',
        matchDetailsTitle: 'Find kampoplysninger', matchDetailsText: 'Her finder du kampstart, bane, spillested og eventuelle noter.',
        eventsTitle: 'Registrer kamphændelser', eventsText: 'Registrer målscorere, kort, assists og udskiftninger under kampen.',
        eventsPickerTitle: 'Vælg den rigtige kamp', eventsPickerText: 'Start med at vælge kampen, som hændelsen hører til.',
        eventsFormTitle: 'Tilføj en hændelse', eventsFormText: 'Vælg hold, spiller, hændelsestype og minut. Resultatet opdateres automatisk ved mål.',
        squadsTitle: 'Opbyg spillertrupper', squadsText: 'Tilføj spillernavne og trøjenumre til turneringens hold.',
        squadsTabTitle: 'Åbn spillertrupper', squadsTabText: 'Fanen vises, når spillerregistrering er slået til for turneringen.',
        squadsManageTitle: 'Administrer spillerne', squadsManageText: 'Tilføj eller fjern spillere for hvert hold efter den valgte registreringsform.',
        rulesTitle: 'Konfigurer turneringsregler', rulesText: 'Tilpas format, point, kampur og rækkefølgen af tiebreakere.',
        rulesBasicsTitle: 'Vælg grundreglerne', rulesBasicsText: 'Indstil turneringsformat, point, antal runder, oprykning og spillerregistrering.',
        rulesClockTitle: 'Indstil kampuret', rulesClockText: 'Vælg perioder, spilletid, pauser, kampinterval og tillægstid.',
        rulesTiebreakersTitle: 'Prioriter tiebreakere', rulesTiebreakersText: 'Rækkefølgen bestemmer, hvordan hold med lige mange point placeres.',
        scheduleTitle: 'Administrer kampprogrammet', scheduleText: 'Generer kampe og tilpas hold, kampstart og bane.',
        scheduleTabTitle: 'Åbn kampprogrammet', scheduleTabText: 'Her genererer og redigerer du turneringens kampe.',
        scheduleGenerateTitle: 'Generer kampe', scheduleGenerateText: 'Vælg gruppespil eller slutspil. Brug kun Erstat eksisterende, når det nuværende program må overskrives.',
        scheduleEditTitle: 'Tilpas tidsplanen', scheduleEditText: 'Rediger hold, kampstart, bane og eventuelt spillested for hver kamp, og gem ændringerne enkeltvis.',
        usersTitle: 'Administrer brugere', usersText: 'Opret brugere og styr deres adgang til administrationen.',
        usersCreateTitle: 'Opret en bruger', usersCreateText: 'Angiv brugernavn, adgangskode og rolle. Redaktører kan afvikle kampe, mens administratorer også kan styre brugere.',
        usersManageTitle: 'Vedligehold adgang', usersManageText: 'Skift rolle, deaktiver konti, nulstil adgangskoder eller fjern brugere.',
        connectivityTitle: 'Forstå liveforbindelsen', connectivityText: 'Se, hvordan live-status og automatiske opdateringer fungerer for tilskuere.',
        connectivityStatusTitle: 'Kontrollér forbindelsen', connectivityStatusText: 'Statusmærket viser, om siden modtager liveopdateringer. Siden forbinder automatisk igen efter en afbrydelse.',
        connectivityUpdatesTitle: 'Følg opdateringerne', connectivityUpdatesText: 'Resultater, status og hændelser ændres automatisk uden at genindlæse siden.',
        noMatches: 'Opret et kampprogram først.', noPlayerTracking: 'Kræver en turnering med spillerregistrering.', organizerOnly: 'Kræver adgang som arrangør.', adminOnly: 'Kræver administratoradgang.',
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
        Lottery: 'Lodtrækning',
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
            rules: 'Regler',
        },
        noTables: 'Ingen gruppetabeller endnu. Tilføj hold og generer kampprogrammet.',
        noFixtures: 'Der er ikke genereret et kampprogram endnu.',
        noRules: 'Turneringsreglerne er ikke offentliggjort endnu.',
        matchday: 'Spillerunde',
        league: 'Række',
        bye: 'Oversidder',
        fixtureViewLabel: 'Visning af kampe',
        byRounds: 'Runder',
        allMatches: 'Alle kampe',
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
        pitch: 'Bane',
        openMaps: 'Åbn {address} i Kort',
    },
    matchPage: {
        open: 'Åbn kampen mellem {home} og {away}',
        back: 'Tilbage til turneringen',
        notFound: 'Kampen kunne ikke findes.',
        events: 'Kamphændelser',
        noEvents: 'Der er endnu ikke registreret nogen hændelser.',
        details: 'Kampoplysninger',
        kickoff: 'Kampstart',
        venue: 'Spillested',
        notes: 'Noter',
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
        playerRegistration: 'Spillerregistrering',
        playerRegistrationNames: 'Kun navne',
        playerRegistrationNumbers: 'Kun numre',
        playerRegistrationBoth: 'Navne og numre',
        yourTournaments: 'Dine turneringer',
        setup: 'Opsætning',
        view: 'Se',
        liveConsole: 'Livekonsol',
        delete: 'Slet',
        deleteConfirm: 'Vil du slette denne turnering og alle dens kampe, hold og spillere?',
        empty: 'Der er ikke noget her endnu. Opret din første turnering ovenfor.',
        nameRequired: 'Giv turneringen et navn først.',
        createFailed: 'Turneringen kunne ikke oprettes.',
        deleteFailed: 'Turneringen kunne ikke slettes.',
        countSummary: '{teams} hold, {matches} kampe',
    },
    setup: {
        subtitle: 'Opsætning og regler',
        publicPage: 'Offentlig side',
        rules: 'Regler',
        defaultSettings: 'Standardindstillinger',
        status: 'Status',
        format: 'Format',
        pointsWin: 'Point for sejr',
        pointsDraw: 'Point for uafgjort',
        pointsLoss: 'Point for nederlag',
        groupRounds: 'Antal indbyrdes møder',
        advancing: 'Hold videre pr. gruppe',
        matchLength: 'Kamplængde (minutter)',
        trackPlayers: 'Registrer spillere og målscorere',
        playerRegistration: 'Spillerregistrering',
        playerRegistrationNames: 'Kun navne',
        playerRegistrationNumbers: 'Kun numre',
        playerRegistrationBoth: 'Navne og numre',
        trackCards: 'Registrer kort',
        thirdPlace: 'Bronzekamp',
        periodCount: 'Antal perioder',
        periodDuration: 'Minutter pr. periode',
        breakDuration: 'Pause mellem perioder (minutter)',
        matchInterval: 'Pause mellem kampe (minutter)',
        matchIntervalHelp: 'Valgfri pause mellem kampe.',
        matchesPerTimeSlot: 'Kampe pr. tidsslot',
        trackMatchClock: 'Vis kampur',
        allowTimeouts: 'Tillad at uret stoppes undervejs',
        useStoppageTime: 'Tæl tillægstid (45+2)',
        rulesContent: 'Turneringsregler',
        rulesContentHelp: 'Skriv regler og praktiske oplysninger, som deltagerne skal kunne se på den offentlige side.',
        rulesBold: 'Fed tekst',
        rulesItalic: 'Kursiv tekst',
        rulesList: 'Punktopstilling',
        rulesHeading: 'Overskrift',
        rulesNumberedList: 'Nummereret liste',
        rulesUnderline: 'Understreget tekst',
        rulesQuote: 'Citat',
        rulesUndo: 'Fortryd',
        rulesRedo: 'Gentag',
        rulesClear: 'Fjern formatering',
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
        shirtNumberPlaceholder: 'Nr.',
        fixtures: 'Kampprogram',
        schedule: 'Tidspunkter for kampe',
        addMatch: 'Tilføj kamp',
        saveSchedule: 'Gem kamp',
        saveAllSchedule: 'Gem alle',
        saveScheduleChanges: 'Gem ændringer',
        unsavedScheduleTitle: 'Gem ændringer?',
        unsavedScheduleMessage: 'Dine ændringer er ikke blevet gemt.',
        stayOnPage: 'Fortsæt redigering',
        discardScheduleChanges: 'Kassér',
        fixturesNeedReviewTitle: 'Gennemgå kampprogrammet',
        fixturesNeedReviewMessage: 'Holdene eller gruppeinddelingen er ændret. Gennemgå eller gendan kampprogrammet, så det stadig passer.',
        reviewFixtures: 'Gennemgå kampe',
        leaveAnyway: 'Forlad alligevel',
        kickoff: 'Starttidspunkt',
        pitchNumber: 'Bane nr.',
        location: 'Sted',
        locationPlaceholder: 'Adresse eller spillested',
        locationOverridePlaceholder: 'Brug turneringens sted',
        homeTeam: 'Hjemmehold',
        awayTeam: 'Udehold',
        fixturesHelp:
            'Generer et grundkampprogram, og tilpas det bagefter ved at tilføje eller fjerne enkelte kampe. Slutspilsskemaet oprettes med pladsholdere og udfylder sig selv, efterhånden som kampene bliver afgjort.',
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
        matchPage: 'Kampside',
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
        confirmDelete: 'Are you sure you want to remove this?',
        teams: 'teams',
        matches: 'matches',
        season: 'Season',
        name: 'Name',
        tournamentDateTime: 'Date and time',
        unassigned: 'Unassigned',
        somethingWentWrong: 'Something went wrong.',
    },
    datePicker: {
        placeholder: 'Choose date and time',
        ariaLabel: 'Date and time',
        previousMonth: 'Previous month',
        nextMonth: 'Next month',
        time: 'Time',
        clear: 'Clear',
        today: 'Today',
        weekdays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    },
    guide: {
        open: 'Open guide',
        close: 'Close guide',
        kicker: 'Liga Cup guide',
        title: 'Following a tournament',
        libraryTitle: 'What would you like to explore?',
        libraryText: 'Choose a short guide and walk through the features step by step.',
        start: 'Start guide',
        overviewTitle: 'Getting started',
        overviewText: 'Learn the essentials of the tournament page and table.',
        fixturesTitle: 'Fixtures and results',
        fixturesText: 'Find the schedule and follow results as they arrive.',
        knockoutTitle: 'The knockout stage',
        knockoutText: 'Understand the bracket and the route to the final.',
        skip: 'Close',
        back: 'Back',
        next: 'Next',
        done: 'Done',
        headerTitle: 'Tournament overview',
        headerText: 'See the season, number of teams and tournament format at a glance.',
        statusTitle: 'Live status',
        statusText: 'The status badge shows whether this page is receiving live tournament updates.',
        tabsTitle: 'Change views',
        tabsText: 'Use the tabs to switch between the table, fixtures, results and knockout bracket.',
        tableTitle: 'Read the table',
        tableText: 'The table updates automatically with matches, points, goals and form as results are recorded.',
        fixturesTabsTitle: 'Find the fixtures',
        fixturesTabsText: 'Open Fixtures & results to see the tournament schedule.',
        fixturesListTitle: 'Browse matchdays',
        fixturesListText: 'Matches are grouped by matchday so you can quickly find the right date.',
        fixturesMatchTitle: 'Follow a match',
        fixturesMatchText: 'The match card shows its result, status and recorded events.',
        knockoutTabsTitle: 'Open the knockout stage',
        knockoutTabsText: 'When knockout matches exist, the Knockout tab appears beside the other views.',
        knockoutBracketTitle: 'Read the bracket',
        knockoutBracketText: 'The bracket shows the route from the first knockout ties to the final.',
        knockoutMatchTitle: 'View a knockout match',
        knockoutMatchText: 'Each match card shows the teams, result and status for a knockout tie.',
    },
    adminGuide: {
        open: 'Open guide', close: 'Close guide', kicker: 'Liga Cup guide', title: 'Getting started',
        libraryTitle: 'What would you like to explore?', libraryText: 'Choose a short guide to the most important Liga Cup features.', visitorGuides: 'Visitor guides', organizerGuides: 'Organiser guides', start: 'Start guide', restart: 'Restart guide', completed: 'Completed', allGuides: 'All guides', hintTitle: 'New to Liga Cup?', hintText: 'Take a short tour of the most important features.', show: 'Show me', dismiss: 'Dismiss guide', back: 'Back', next: 'Next', done: 'Done', noKnockout: 'None of your tournaments have a knockout stage yet.',
        createTitle: 'Create a tournament', createText: 'Create a new tournament from the admin home.', createNameTitle: 'Name the tournament', createNameText: 'Enter the tournament name and season so it is easy to find.', createFormatTitle: 'Choose the format', createFormatText: 'Choose league, groups or knockout for the tournament you want to run.', createSubmitTitle: 'Create the tournament', createSubmitText: 'Press Create to save the tournament and open it in admin.',
        setupTitle: 'Set up the tournament', setupText: 'Add teams, groups and rules before matches are played.', setupRulesTitle: 'Start with the rules', setupRulesText: 'Choose the format, points, tiebreakers and optional match clock.', setupTeamsTitle: 'Add teams and groups', setupTeamsText: 'Create groups and add teams with a name and short name.', setupFixturesTitle: 'Generate fixtures', setupFixturesText: 'When teams are ready, generate group fixtures and optionally the knockout stage.',
        liveTitle: 'Update live results', liveText: 'Use the live console during matches.', livePickerTitle: 'Choose the match', livePickerText: 'Select the match you want to control from the match picker.', liveScoreTitle: 'Update the score', liveScoreText: 'Use the plus and minus buttons to record goals for each team.', liveStatusTitle: 'Control match status', liveStatusText: 'Start, pause or finish the match as the referee calls it.',
        matchTitle: 'Follow a live match', matchText: 'See the score, clock, events and practical details on the dedicated match page.',
        matchScoreTitle: 'Follow the score', matchScoreText: 'The score, match status and clock update automatically while the match is played.',
        matchEventsTitle: 'Read the match events', matchEventsText: 'Goals, cards, assists and substitutions appear here as soon as the organiser records them.',
        matchDetailsTitle: 'Find match information', matchDetailsText: 'Kickoff, pitch, venue and any match notes are shown here.',
        eventsTitle: 'Record match events', eventsText: 'Record goalscorers, cards, assists and substitutions during a match.',
        eventsPickerTitle: 'Choose the right match', eventsPickerText: 'Start by selecting the match that the event belongs to.',
        eventsFormTitle: 'Add an event', eventsFormText: 'Choose the team, player, event type and minute. Goals update the score automatically.',
        squadsTitle: 'Build squads', squadsText: 'Add player names and shirt numbers to the tournament teams.',
        squadsTabTitle: 'Open squads', squadsTabText: 'This tab is available when player tracking is enabled for the tournament.',
        squadsManageTitle: 'Manage players', squadsManageText: 'Add or remove players for each team using the configured registration mode.',
        rulesTitle: 'Configure tournament rules', rulesText: 'Adjust the format, points, match clock and tiebreaker order.',
        rulesBasicsTitle: 'Choose the basic rules', rulesBasicsText: 'Set the tournament format, points, rounds, advancement and player tracking.',
        rulesClockTitle: 'Configure the match clock', rulesClockText: 'Choose periods, playing time, breaks, match intervals and added time.',
        rulesTiebreakersTitle: 'Prioritise tiebreakers', rulesTiebreakersText: 'The order determines how teams level on points are ranked.',
        scheduleTitle: 'Manage the schedule', scheduleText: 'Generate fixtures and adjust teams, kickoff times and pitches.',
        scheduleTabTitle: 'Open the schedule', scheduleTabText: 'Generate and edit the tournament fixtures here.',
        scheduleGenerateTitle: 'Generate fixtures', scheduleGenerateText: 'Choose group or knockout fixtures. Use Replace existing only when the current schedule may be overwritten.',
        scheduleEditTitle: 'Adjust the schedule', scheduleEditText: 'Edit teams, kickoff, pitch and an optional location override for each match, then save each change individually.',
        usersTitle: 'Manage users', usersText: 'Create users and control their access to administration.',
        usersCreateTitle: 'Create a user', usersCreateText: 'Set a username, password and role. Editors can run matches, while administrators can also manage users.',
        usersManageTitle: 'Maintain access', usersManageText: 'Change roles, deactivate accounts, reset passwords or remove users.',
        connectivityTitle: 'Understand live connectivity', connectivityText: 'See how live status and automatic updates work for visitors.',
        connectivityStatusTitle: 'Check the connection', connectivityStatusText: 'The status badge shows whether live updates are arriving. The page reconnects automatically after an interruption.',
        connectivityUpdatesTitle: 'Follow the updates', connectivityUpdatesText: 'Scores, status and events change automatically without reloading the page.',
        noMatches: 'Create a fixture schedule first.', noPlayerTracking: 'Requires a tournament with player tracking.', organizerOnly: 'Requires organiser access.', adminOnly: 'Requires administrator access.',
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
        Lottery: 'Lottery',
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
            rules: 'Rules',
        },
        noTables: 'No group tables yet. Add teams and generate the fixtures.',
        noFixtures: 'No fixtures have been generated yet.',
        noRules: 'Tournament rules have not been published yet.',
        matchday: 'Matchday',
        league: 'League',
        bye: 'Sitting out',
        fixtureViewLabel: 'Fixture view',
        byRounds: 'Rounds',
        allMatches: 'All matches',
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
        pitch: 'Pitch',
        openMaps: 'Open {address} in Maps',
    },
    matchPage: {
        open: 'Open the match between {home} and {away}',
        back: 'Back to tournament',
        notFound: 'That match could not be found.',
        events: 'Match events',
        noEvents: 'No events have been recorded yet.',
        details: 'Match details',
        kickoff: 'Kickoff',
        venue: 'Venue',
        notes: 'Notes',
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
        playerRegistration: 'Player registration',
        playerRegistrationNames: 'Names only',
        playerRegistrationNumbers: 'Numbers only',
        playerRegistrationBoth: 'Names and numbers',
        yourTournaments: 'Your tournaments',
        setup: 'Set up',
        view: 'View',
        liveConsole: 'Live console',
        delete: 'Delete',
        deleteConfirm: 'Delete this tournament and all its fixtures, teams, and players?',
        empty: 'Nothing here yet. Create your first tournament above.',
        nameRequired: 'Give the tournament a name first.',
        createFailed: 'The tournament could not be created.',
        deleteFailed: 'The tournament could not be deleted.',
        countSummary: '{teams} teams, {matches} matches',
    },
    setup: {
        subtitle: 'Setup and rules',
        publicPage: 'Public page',
        rules: 'Rules',
        defaultSettings: 'Default settings',
        status: 'Status',
        format: 'Format',
        pointsWin: 'Points for a win',
        pointsDraw: 'Points for a draw',
        pointsLoss: 'Points for a loss',
        groupRounds: 'Times each pair meets',
        advancing: 'Teams advancing per group',
        matchLength: 'Match length (minutes)',
        trackPlayers: 'Track players and goalscorers',
        playerRegistration: 'Player registration',
        playerRegistrationNames: 'Names only',
        playerRegistrationNumbers: 'Numbers only',
        playerRegistrationBoth: 'Names and numbers',
        trackCards: 'Track cards',
        thirdPlace: 'Third place play-off',
        periodCount: 'Number of periods',
        periodDuration: 'Minutes per period',
        breakDuration: 'Break between periods (minutes)',
        matchInterval: 'Time between matches (minutes)',
        matchIntervalHelp: 'Optional pause between matches.',
        matchesPerTimeSlot: 'Matches per time slot',
        trackMatchClock: 'Show a match clock',
        allowTimeouts: 'Allow the clock to be stopped mid-period',
        useStoppageTime: 'Count added time (45+2)',
        rulesContent: 'Tournament rules',
        rulesContentHelp: 'Write rules and practical information for participants to read on the public page.',
        rulesBold: 'Bold text',
        rulesItalic: 'Italic text',
        rulesList: 'Bullet list',
        rulesHeading: 'Heading',
        rulesNumberedList: 'Numbered list',
        rulesUnderline: 'Underlined text',
        rulesQuote: 'Quote',
        rulesUndo: 'Undo',
        rulesRedo: 'Redo',
        rulesClear: 'Clear formatting',
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
        shirtNumberPlaceholder: 'No.',
        fixtures: 'Fixtures',
        schedule: 'Match schedule',
        addMatch: 'Add match',
        saveSchedule: 'Save match',
        saveAllSchedule: 'Save all',
        saveScheduleChanges: 'Save changes',
        unsavedScheduleTitle: 'Save changes?',
        unsavedScheduleMessage: 'Your changes have not been saved.',
        stayOnPage: 'Keep editing',
        discardScheduleChanges: 'Discard',
        fixturesNeedReviewTitle: 'Review fixtures',
        fixturesNeedReviewMessage: 'Teams or group assignments have changed. Review or regenerate the fixtures to keep the schedule accurate.',
        reviewFixtures: 'Review fixtures',
        leaveAnyway: 'Leave anyway',
        kickoff: 'Kickoff',
        pitchNumber: 'Pitch no.',
        location: 'Location',
        locationPlaceholder: 'Address or venue',
        locationOverridePlaceholder: 'Use tournament location',
        homeTeam: 'Home team',
        awayTeam: 'Away team',
        fixturesHelp:
            'Generate a starting schedule, then add or remove individual matches as needed. The knockout bracket is created with placeholders and fills itself in as ties are decided.',
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
        matchPage: 'Match page',
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
