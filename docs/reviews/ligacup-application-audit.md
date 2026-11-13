# LigaCup application audit

Audit date: 13 November 2026. Repository: `C:\Repos\LigaCup`. Baseline: `codex/scheduling-fixes`, commit `1efdaa04d8c9aa02dc562ad115b60286992712b0`.

This is an investigation of the checked-out application, not a certification of the currently deployed site. The branch already contains the recent scheduling/time-conversion and save-all changes. Those changes must not be assumed to be in production. This audit changes only this report: no application changes, migrations, existing-data modifications, staging, commits, pushes, or deployments.

Evidence labels used below:

- **Confirmed — reproduced:** exercised with existing tests or an isolated, in-memory probe of the actual implementation. A mocked transport verifies client behavior, not the complete HTTP/database/browser stack.
- **Confirmed — code:** the implementation establishes the behavior, but the complete scenario was not executed.
- **Suspected:** a plausible failure whose timing, hosting conditions, or external impact needs validation.
- **Suggestion:** a proposed improvement, not a claim of a defect.

Confidence describes the evidence for the stated finding, not its likelihood of occurring in production. Complexity is relative: **Small** is a localized change; **Medium** crosses a few components or needs substantial regression coverage; **Large** changes workflows, persistence, or several architectural boundaries. Severity measures user impact: **High** includes lost work, materially incorrect competition outcomes, or significant security exposure; **Medium** includes important workflow/reliability limitations; **Low** includes bounded maintenance issues. No Critical incident or vulnerability was established.

Source references are repository-relative and refer to the baseline above. Generated build outputs and ignored test artifacts are not report deliverables. No production exploit, load test, or write operation was performed during the audit.

For readability, repeated source references use these unambiguous prefixes: frontend `core/`, `pages/` and `shared/` mean `ligacup-web/src/app/`; `Services/`, `Security/`, `Mapping/` and `Contracts/` mean `LigaCup.ApplicationService/`. Bare `TournamentService.cs` and `MatchService.cs` refer to `LigaCup.ApplicationService/Services/`; `AuthService.cs` and `UserService.cs` refer to its `Security/` directory; `DtoMapper.cs` refers to its `Mapping/` directory. Bare `Program.cs`, `AuthorizationPolicies.cs` and endpoint filenames belong to `LigaCup.API` (endpoints under `Endpoints/`). `LigaCupContext.cs` belongs to `LigaCup.Infrastructure`; `Entities.cs` to `LigaCup.Domain/Entities`; `FixtureGenerator.cs` to `LigaCup.Domain/Scheduling`. Bare frontend filenames refer to the same `core/`, `pages/admin/`, `pages/tournament/` or `shared/` files named in the surrounding evidence. Line numbers and method names identify the relevant code within those files.

## 1. Executive summary

LigaCup has a useful foundation for a small, centrally managed tournament: public fixtures, results, standings, rules and parking information; an organizer editor; live scoring and clocks; and administrator-controlled accounts. The domain/application/persistence/API split is sensible. Both builds and all 54 existing tests passed under the conditions in section 8.

The principal weakness is that the application treats server state, editable drafts, and live updates as the same mutable objects. The recent save-all button reduces repetitive work, but does not make saving reliable across live updates, structural actions, or concurrent organizers. A simulated live update and a copy-round operation both discarded unsaved kickoff changes. Group reassignment also sends replacement values that clear team metadata and points adjustments.

Competition correctness needs additional work. Generated rounds overlap when a round requires more than one pitch time slot. Partial bye selections fail. Knockout-only seeding is incomplete, non-power-of-two fields are silently reduced, and corrected results do not consistently repair downstream participants. These are not cosmetic limitations.

Security and operations also have release-priority gaps: stored HTML is assigned directly to the admin DOM, password resets do not revoke refresh sessions, server validation does not enforce tournament/team/player relationships, and one deployment cleanup request does not enable FTP TLS. These are code findings; no production compromise was observed or attempted.

**Overall readiness:** a functioning small-event application with material reliability and security gaps. The current branch should not be treated as ready for unattended tournament operation, untrusted editor accounts, concurrent administration, or general knockout competition use. Passing unit tests does not establish those workflows. Existing production data should be protected while the high-priority issues are corrected and tested in isolation.

The original reports about time shifts, deleted custom fixtures, and three games for eight teams remain distinct from this audit. The branch tests now cover UTC/local conversion, preserving schedules when saving visibility, and four matches per round for eight teams with the tested configurations. That does not prove the historical cause of a missing match or deleted schedule, nor that production contains the fixes. This audit found additional ways to lose drafts and produce invalid schedules.

## 2. Application overview and feature inventory

“Implemented” below means a code path exists; the verification column states how far it was checked. No feature is considered fully verified merely because it compiles.

| Feature | Implementation status | Evidence and verification |
|---|---|---|
| Tournament creation | Implemented; defaults and publication semantics need work | `pages/admin/admin-home.ts:191` uses a fixed September 2026 date and a specific venue as initial values. Creation flow reviewed, not newly exercised against a database. |
| Tournament configuration | Implemented but saving is inconsistent | Format, points, periods, intervals, pitches, rules, parking and visibility share `AdminSetup.settings`; see S03. |
| Tournament lifecycle | Partial | Draft/InProgress/Completed/Archived statuses exist, but public retrieval does not enforce publication visibility (SEC05). |
| Tournament deletion | Implemented, destructive | Editor-protected endpoint, confirmation UI and EF cascades; no restore/history workflow found. API deletion not executed. |
| Groups | Implemented | Create/delete and team assignment exist. Relationships and reload behavior need correction (SEC03, S01, S02). |
| Teams | Implemented with data-integrity defect | Name/short name editing, group assignment and deletion; metadata and point adjustments exist in API/domain but have limited UI support. S02 reproduced the destructive assignment payload. |
| Players/rosters | Partial | Organizer adds/removes players; names/numbers registration modes exist. This is roster entry, not an external team-manager registration/approval system. |
| League/group fixture generation | Implemented, partly tested, unsafe in some configurations | Round-robin, repeated rounds, byes, first-home selection and replacement/merge paths exist. F01/F02 identify reproduced failures. |
| Manual match editing | Implemented with draft-loss risks | Teams, kickoff, pitch, venue, ordering, add/remove/copy round, per-match save and save-all. S01/S04/S05 apply. |
| Pitch/venue logistics | Basic | Pitch number, simultaneous-match count, tournament location and per-match override. No pitch resource/calendar or conflict prevention found (F01). |
| Match results | Implemented | Direct score adjustment, penalties and finished status. Core standings/winner tests pass; concurrency and downstream correction are not covered. |
| Live events | Implemented but insufficiently validated | Goals, own goals, assists, cards and penalty events, optional player attribution, deletion. Event/team/player invariants are missing (SEC03). |
| Match clock | Implemented and substantially unit-tested | Periods, half-time, pauses, stoppage and reset; repeated Live status resets running elapsed time (F06). |
| Standings | Implemented with edge-case gaps | Finished group games, configurable points, adjustments, form and tiebreakers. Head-to-head points and lottery behavior are incomplete (F07). |
| Knockout brackets | Partial; not ready as a general workflow | Placeholder bracket generation, group seeding, winners/losers and third-place match exist. F03–F05 cover missing seeding, correction and field-size behavior. |
| Scorer rankings | Implemented | Derived from event records and player references in `TournamentService.BuildTopScorers`; attribution relies on validation that is currently missing. |
| Public tournament page | Implemented | Tables, round/all fixtures, bracket, scorers, rules, parking, live connection status; no new full browser/device audit. Structural changes do not reliably reach connected visitors (S06). |
| Public match page | Implemented | Score, timing and event display, read-only; depends on the same detail/store/live infrastructure. |
| Authentication/session refresh | Implemented with security gaps | Password hashing, JWTs, hashed rotating refresh tokens, logout and interceptor. Revocation and refresh race concerns in SEC02. |
| Account administration | Implemented | Admin-only create/edit/delete/reset; last-active-admin and self-deactivation protections exist. No complete new account lifecycle integration test was run. |
| Authorization | Global role model | Admin manages users; Admin/Editor manages all tournaments; Viewer cannot write through protected APIs. No per-tournament ownership or team-manager role (U03). |
| Rich rules and parking editor | Implemented with correctness/security defects | Formatting and embedded/uploaded images. Initialization can show stale/default content (F09); direct HTML loading is unsafe (SEC01). |
| Image uploads | Implemented with useful basic restrictions | Auth required, 5 MB limit, generated filenames, PNG/JPEG/GIF/WebP allowlist and signature checks at `TournamentEndpoints.cs:44`. Quotas, orphan cleanup and durable storage lifecycle are absent. |
| Danish/English UI and guidance | Implemented | Central strings/I18n service, admin guide, skeletons, reusable controls. Some hard-coded labels/error strings remain. No exhaustive translation/accessibility review executed. |
| Deployment/persistence | Implemented for SQLite on IIS/Simply.com | Main-branch deployment, FTPS upload, app-offline/recovery steps, startup migrations and SQLite retries. O01/O02/SEC04 apply. MySQL configuration deliberately throws; it is not supported. |

The repository also includes local smoke/session/user-management/clock scripts. They are useful manual checks, not a substitute for an isolated automated end-to-end suite. They were not run against existing data in this audit.

## 3. Architecture assessment

The application is a single Angular client and a single ASP.NET Core service with SQLite persistence and SignalR updates. There is no external competition engine, payment, email registration or third-party identity integration in the reviewed application paths.

| Boundary | Current responsibility | Assessment |
|---|---|---|
| `LigaCup.Domain` | Entities, competition enums, fixture generation, standings and clocks | Valuable testable domain algorithms. Some invariants remain in services/UI rather than in a consistent domain boundary. |
| `LigaCup.ApplicationService` | Tournament/match operations, DTO mapping, authentication and account services | Clear service entry points, but EF access, validation, transactions and broadcasting are mixed. Some endpoints return entities while others return DTOs (F08). |
| `LigaCup.Infrastructure` | DbContext, relationships, migrations, provider/path configuration | Explicit relationships and indexes are useful. No configured optimistic concurrency token; automatic database-path fallback is dangerous operationally. |
| `LigaCup.API` | Minimal routes, JWT/role policies, upload handling, hub and startup | Generally readable. Authentication/live routes also live in `TournamentEndpoints.cs`; exception mapping and validation are inconsistent. |
| Angular core | API transport, auth, I18n, clock, live connection and tournament store | A reasonable shared layer, but canonical server data is also the editing buffer. There is no versioned draft abstraction. |
| Angular pages/shared UI | Lazy-loaded standalone pages and reusable controls | Helpful shared controls and styling. The approximately 2,600-line setup page combines templates, rich-text DOM code, generation, saves, dirty tracking and confirmation workflows (D01). |

Positive controls include parameterized EF queries, role enforcement on write endpoints, password hashing, hashed refresh-token storage, explicit production CORS origins, restricted image types, route-level lazy loading, `AsNoTracking`/`AsSplitQuery` graph reads, and a meaningful set of domain tests. No raw SQL injection path was identified in the reviewed service queries. This is not a penetration-test clearance.

A request currently often follows: mutate EF entity → save → reload the whole tournament → recompute tables/bracket/scorers → broadcast. That makes the happy path straightforward, but leaves transaction, retry and synchronization gaps. A failed broadcast can follow a successful database commit, while the client interprets the whole request as failed (S04). Each update also pays the cost of reading the tournament graph (D02).

The recommended direction is incremental: keep the existing domain/services structure, introduce explicit command/response contracts and validation, isolate frontend drafts, add revision-based writes, and give structural/live events a coherent synchronization contract. A wholesale rewrite or database replacement is not justified by this audit.

## 4. Functional findings

### F01 — Generated rounds can book the same pitch at the same time

- **Severity:** High. **Component:** schedule generation. **Status:** Confirmed — reproduced. **Confidence:** High. **Complexity:** Medium.
- **Evidence:** `LigaCup.ApplicationService/Services/TournamentService.cs:503`, especially `AssignKickoffTimes` at lines 512–521. It calculates the slot offset as `(round - 1) + slotWithinRound` rather than accumulating the slots used by previous rounds.
- **Actual:** an in-memory invocation with eight teams, two pitches, a 10-minute match and five-minute interval produced round 1 at 12:00/12:15 and round 2 at 12:15/12:30. Both rounds occupy the same pitches at 12:15. There were 12 duplicate `(kickoff, pitch)` groups across that generated schedule. No database was used.
- **Expected:** a pitch and team cannot be scheduled into overlapping games; subsequent rounds start after prior-round slots, subject to intentional breaks/rest rules.
- **Recommendation:** allocate slots across the complete schedule, including groups and existing retained fixtures. Validate team and pitch intervals before returning a preview or committing. Copy-round currently preserves kickoff/pitch values (`admin-setup.ts:2441`), so it also needs either time-shifting or a clear conflict review.

### F02 — Mixing manual and automatic bye selections fails

- **Severity:** Medium. **Component:** round-robin bye selection. **Status:** Confirmed — reproduced. **Confidence:** High. **Complexity:** Small–Medium.
- **Evidence:** `LigaCup.Domain/Scheduling/FixtureGenerator.cs:172` subtracts all natural bye teams from the full team list, then indexes the remaining list at line 180 for null selections.
- **Actual:** five teams with bye choices `[3, null, null, null, null]` caused `ArgumentOutOfRangeException` in an in-memory domain call. Every team already occurs among the natural byes, leaving no automatic candidates. Existing tests cover all-automatic and fully specified selections, not this mixed case.
- **Expected:** remaining rounds are filled from the unused bye teams, or a clear validation error explains that a complete selection is required.
- **Recommendation:** build the unassigned-team list from explicit requested choices, fill null positions sequentially, and validate duplicates/unknown IDs before generation. Return a client-readable 400 response rather than a generic failure.

### F03 — Knockout seeding is incomplete and can overwrite participants after play starts

- **Severity:** High. **Component:** knockout entry/seeding. **Status:** Confirmed — code. **Confidence:** High. **Complexity:** Large.
- **Evidence:** `MatchService.cs:218` derives qualifiers exclusively from `tournament.Groups`; lines 268–286 overwrite first-round teams without checking match status. `TournamentService.cs:383` generates a KnockoutOnly bracket using the number of teams. The setup schedule template around `admin-setup.ts:687` permits team selectors for group-stage matches, with display names for knockout participants.
- **Actual:** a normal KnockoutOnly tournament with teams but no groups generates placeholders, but the seed routine has no qualifiers and updates zero games. The same seed command has no completed-group gate or protection for live/finished first-round matches. This follows the code; an HTTP/database seeding scenario was not executed.
- **Expected:** explicit, usable seeding for direct knockout competitions; group qualification based on a reviewed completed phase; participant changes blocked once dependent games have begun unless a deliberate correction workflow is used.
- **Recommendation:** separate direct seeding from group qualification. Show a proposed bracket, validate completeness, and require a controlled reseed/correction operation that handles downstream results.

### F04 — Correcting a knockout result does not consistently repair progression

- **Severity:** High. **Component:** winner/loser propagation. **Status:** Confirmed — code. **Confidence:** High. **Complexity:** Large.
- **Evidence:** `MatchService.cs:97` calls `AdvanceBracketAsync` only when setting status to Finished. Score updates at line 64 and event changes at lines 129/173 do not invoke it. `AdvanceBracketAsync:293` changes successor participants without checking whether the successor is live/finished.
- **Actual:** changing the score or penalties of an already finished tie leaves its previously advanced participant in place until another status operation triggers advancement. Retoggling status can then alter participants in a match that already has results. Finishing and propagating also use separate saves (S04).
- **Expected:** a result correction either safely recomputes dependencies or reports which downstream matches prevent it. Existing downstream scores must not silently become associated with different teams.
- **Recommendation:** make finalization/correction explicit domain operations with dependency checks, a single transaction, revision checks and broadcasts for every affected match. Add semifinal/final/third-place correction scenarios.

### F05 — Bracket size, repeat generation and qualification options overstate support

- **Severity:** Medium. **Component:** knockout generation/settings. **Status:** Confirmed — reproduced for size; code for other paths. **Confidence:** High. **Complexity:** Medium–Large.
- **Evidence:** `FixtureGenerator.cs:307` rounds down to a power of two and caps at 32. `TournamentService.cs:383–400` appends a generated bracket; `MergeExistingGroupFixtures:408` handles group fixtures rather than deduplicating knockout stages. `IncludeBestThirdPlaced` is stored/mapped (`TournamentService.cs:164`, `DtoMapper.cs:42`) but is not used by generation or seeding.
- **Actual:** the pure function returns four slots for six entrants; current tests explicitly expect rounding down. Non-replacement generation can append another knockout bracket. The best-third-place flag has no qualifying algorithm behind it. These latter paths were reviewed, not executed end to end.
- **Expected:** the organizer knows which entrants qualify; unsupported field sizes/options are rejected or handled with byes; repeated generation has a defined idempotent/replace behavior.
- **Recommendation:** initially reject unsupported combinations with useful messages. Then implement explicit bracket/byes and qualification policies with preview and repeat-generation tests. Do not silently discard entrants.

### F06 — Clicking Live again resets the running portion of the clock

- **Severity:** Medium. **Component:** match clock/status controls. **Status:** Confirmed — reproduced. **Confidence:** High. **Complexity:** Small.
- **Evidence:** `LigaCup.Domain/Timing/MatchClock.cs:69–79` sets `ClockStartedUtc = nowUtc` for Live without banking elapsed time when the previous state is already Live. `pages/admin/live-console.ts:128` leaves the currently selected status button actionable.
- **Actual:** an in-memory match running from 12:00 showed 300 elapsed seconds at 12:05; applying Live again at 12:05 reduced the calculated elapsed time to zero for that fresh period.
- **Expected:** repeating the current status is a no-op, including network retries and double clicks.
- **Recommendation:** make state transitions idempotent on the server and disable redundant UI actions. Test repeated Live, HalfTime and Finished requests as well as legal transitions.

### F07 — Some standings tiebreakers do not implement their advertised policy

- **Severity:** Medium. **Component:** standings/qualification. **Status:** Confirmed — code. **Confidence:** High. **Complexity:** Medium.
- **Evidence:** `LigaCup.Domain/Standings/StandingsCalculator.cs:239` uses fixed 3/1/0 head-to-head points while overall points are configurable. The Lottery branch at line 188 returns the existing order; there is no persisted draw result in the model.
- **Actual:** custom overall points can disagree with the head-to-head scoring policy. A tie reaching Lottery retains an incidental existing order, which can then determine qualification. No custom-points tournament or draw was run in a browser.
- **Expected:** tiebreakers follow the configured competition rules and unresolved ties are visibly unresolved until an explicit, auditable decision.
- **Recommendation:** pass point settings into mini-table calculation; model a recorded draw/manual tie resolution instead of rerandomizing on every read. Test multi-team ties with nonstandard point values and qualification boundaries.

### F08 — Match-save responses violate the frontend Match contract

- **Severity:** High. **Component:** API DTO boundary/store updates. **Status:** Confirmed — code and isolated serialization probe. **Confidence:** High. **Complexity:** Small–Medium.
- **Evidence:** `TournamentEndpoints.cs:132–136` returns the result of `MatchService.SaveMatchAsync:19`, a domain `Match`. `core/api.service.ts:154` types it as the frontend Match DTO; `tournament.store.ts:60` replaces the stored DTO with that object. Normal DTO construction is in `Mapping/DtoMapper.cs`; consumers such as `live-console.ts:504` expect `match.clock`.
- **Actual:** serializing a domain Match in isolation confirmed it has no DTO `homeTeamName` or `clock`. The service publishes a proper DTO before returning the entity, so a later HTTP response can overwrite the richer live version. The exact HTTP/SignalR arrival order and a browser exception were not reproduced.
- **Expected:** the HTTP result and live event use the same documented DTO shape.
- **Recommendation:** return the mapped/published MatchDto, not the tracked entity. Add HTTP contract tests that deserialize actual responses and verify all client-required fields; review group/team/player responses for the same entity/DTO inconsistency.

### F09 — Rich-text editors can initialize before saved settings arrive

- **Severity:** High. **Component:** rules/parking editing. **Status:** Confirmed — reproduced lifecycle ordering. **Confidence:** High for the ordering defect; Medium for frequency in a rendered browser. **Complexity:** Medium.
- **Evidence:** `admin-setup.ts:1526` awaits `store.load`; `tournament.store.ts:33` exposes detail before awaiting the live connection. `admin-setup.ts:1576` writes current settings to the DOM only once per editor element. `settings` initially contains default rules at line 1493.
- **Actual:** a controlled in-memory component probe initialized the editor before `ngOnInit` completed. Afterwards the settings model contained existing custom rules, while the editor element still contained the defaults. The element-identity guard prevented a refresh. Typing would serialize the visible editor back into settings (`updateRules:1841`). The audit did not write this content to a database.
- **Expected:** existing saved rules/parking are displayed before editing is allowed; live connection timing cannot select default content.
- **Recommendation:** initialize the form before rendering its editors, or synchronize a sanitized editor value with an explicit loading/dirty lifecycle. Preserve user content without applying default-rule substitutions to arbitrary saved HTML. Add a delayed-live-connection rendered component regression test.

## 5. Saving and state-management assessment

**Yes: the editor currently mixes immediate writes and explicit saves.** It also has several meanings of “save all.” The match toolbar saves changed match schedule fields; the navigation dialog can save settings and match schedules; neither is a universal commit of every editable screen.

| Interaction | Persistence now | Important consequence |
|---|---|---|
| Rules, parking, display settings, format/timing settings | Explicit Save, using the same full settings payload | Saving one section can persist edits made in another (S03). |
| Match teams/time/pitch/venue/order | Draft until per-match Save or Save all match changes | Drafts share live store objects and can disappear (S01). |
| Save all match changes | Sequential match requests | Partial success is possible; not a database transaction (S04). |
| Leave setup → save changes | Settings request followed by match requests | Broader than toolbar save, still not atomic; team/player/user drafts are outside this dirty model. |
| Team name/short name | Explicit team Save | Bound directly to the displayed team object; reloads can discard it. |
| Team group dropdown | Immediate request | Also saves supplied name/short name and defaults other fields (S02). |
| Add/remove group/team/player/match, copy round, seed bracket | Immediate command; many reload the complete tournament | Can discard unrelated drafts, with inconsistent busy/error handling. |
| Fixture generation | Immediate command after saving changed settings | Current branch blocks unsaved match drafts and confirms replacement, but settings and generation are separate writes. |
| Live score/status/event buttons | Immediate request | No consistent pending/retry state, idempotency or concurrency protection. |
| Penalties and stoppage values | Explicit action to write | Switching context can leave stale local values; no common draft contract. |
| User email/role/active/password | Explicit action | Refresh after one user save replaces the list, potentially discarding edits in other rows; no route dirty guard. |

### S01 — Live updates and unrelated reloads silently discard match drafts

- **Severity:** High. **Component:** tournament store/setup editor. **Status:** Confirmed — reproduced with real component/store and mocked transport. **Confidence:** High. **Complexity:** Large.
- **Evidence:** `tournament.store.ts:52` replaces the detail on reload; `apply:72–84` replaces the matching Match on live update. Setup binds fields to those objects and tracks baselines in `scheduleSnapshots`, a `WeakMap` at `admin-setup.ts:1418`; `hasScheduleChanges:1912` initializes a baseline for a new object. Reloading commands include `copyRound:2441`, `assignGroup:2206`, and add/remove group/team/player flows.
- **Actual:** after changing kickoff from 12:00 to 12:07, applying a live score update carrying the saved 12:00 match replaced the draft and left dirty detection false. A second probe changed kickoff to 12:09, called copy-round with a fake successful API, and observed reload restore 12:00 with dirty detection false. No production or existing database was involved.
- **Expected:** a score update cannot erase schedule edits; structural commands must preserve drafts or explicitly resolve them.
- **Recommendation:** keep canonical server records separate from drafts keyed by match ID and revision. Merge live fields that the user is not editing; display conflicts for changed draft fields. Make all reload callers follow that policy. The existing special-case preservation in `addMatch` and `saveSettings` is useful but insufficient.

### S02 — Group reassignment clears team metadata and points adjustments

- **Severity:** High. **Component:** team editing. **Status:** Confirmed — reproduced request payload; server overwrite confirmed by code. **Confidence:** High. **Complexity:** Small–Medium.
- **Evidence:** `admin-setup.ts:2206` sends only name, shortName and groupId. `api.service.ts:89–97` fills missing color/logo/manager with null and pointsAdjustment with zero. `TournamentService.cs:245–258` assigns all those fields to the existing entity.
- **Actual:** a probe of the real API service captured a group-change body containing `colorHex:null`, `logoUrl:null`, `manager:null`, `pointsAdjustment:0`. The server overwrites those values, so a team with a points deduction would lose it when reassigned. No real team was altered during the probe.
- **Expected:** changing group changes only group membership, or an explicit full-team save preserves every existing field.
- **Recommendation:** use a dedicated group-assignment command or a well-defined partial update contract. Avoid defaulting omitted update fields. Add a regression with nonzero points and populated metadata.

### S03 — Section saves persist shared settings, while dirty guards omit other edits

- **Severity:** Medium. **Component:** setup/users forms. **Status:** Confirmed — code. **Confidence:** High. **Complexity:** Medium–Large.
- **Evidence:** `admin-setup.ts:116`, `:349`, `:548` call the same `saveSettings`; `saveSettingsRequest:2088` spreads the entire settings object. `hasUnsavedChanges:1927` covers settings/schedules. `app.routes.ts:31` applies its guard only to setup. `admin-users.ts` mutates user rows and reloads the full list after save.
- **Actual:** editing rules and then saving a display setting writes both changes. Team names/new roster inputs and user drafts are not comprehensively represented in navigation protection. A successful user-row save or a failed save followed by refresh can replace other unsaved rows. These paths were traced, not end-to-end exercised.
- **Expected:** save labels state their scope, and every editable draft has consistent protection.
- **Recommendation:** choose deliberate form boundaries. Use one visible tournament-settings save for the combined settings form, or truly independent section payloads. Track team/player/account drafts separately, with discard/save decisions on navigation and reload.

### S04 — Multi-step writes can partially succeed and are unsafe to retry blindly

- **Severity:** High. **Component:** bulk save, round copying, match finalization. **Status:** Confirmed — code; failure timing not injected. **Confidence:** High. **Complexity:** Large.
- **Evidence:** `admin-setup.ts:2047` saves matches sequentially; `saveAllChanges:2126` saves settings then matches; `copyRound:2441` creates one match per request. `MatchService.cs:107–114` saves Finished, then advances, then publishes; `SaveMatchAsync:44–45` and other mutations save before broadcasting.
- **Actual:** if the third of four requests fails, earlier commits remain. Copy-round retry can create duplicates. A broadcast failure after a score increment can return failure even though the increment committed, making a user retry unsafe. No fault-injection test was run. Existing save-all does mark individual successful match baselines, which helps retry, but does not make the operation atomic.
- **Expected:** a bulk operation has an explicit atomic or per-item result contract; a committed live command cannot be duplicated because acknowledgement delivery failed.
- **Recommendation:** server-side transactional bulk schedule/copy/finalize commands with validated input and operation IDs. Separate persistence success from notification retry, using a durable outbox or an appropriately bounded retry mechanism. Return exact saved/failed item status where partial saves are intentional.
- **Boundary clarification:** fixture replacement itself marks deletions/additions and calls one `SaveChangesAsync` in `TournamentService.cs:327–405`; this audit does not claim those deletions are independently committed before generation succeeds.

### S05 — Concurrent editors can overwrite changes and lose score increments

- **Severity:** High. **Component:** persistence/update contracts. **Status:** Confirmed absence of conflict checks; Suspected race outcomes, not load-tested. **Confidence:** High for the mechanism; Medium for observed operational impact. **Complexity:** Large.
- **Evidence:** `LigaCupContext.cs` configures no concurrency token; `Entities.cs:82`/`:212` timestamps are informational, not conditional write versions. Settings and match saves replace fields. `MatchService.AdjustScoreAsync:79` reads, increments and saves a tracked value.
- **Actual:** there is no expected-version/ETag predicate to reject a stale editor. Two successful read-modify-write operations can write the same incremented score, or an older settings form can overwrite a newer value. SQLite locks may cause some overlapping transactions to fail, but do not provide a user-level stale-edit contract.
- **Expected:** stale edits produce a conflict response and an understandable merge/reload choice; score commands have defined ordering and retry semantics.
- **Recommendation:** application-managed revision fields suitable for SQLite, expected versions on updates, atomic score/event commands, and UI conflict handling. EF requires a configured concurrency token for optimistic conflict detection; timestamps alone do not provide it. See [EF Core concurrency documentation](https://learn.microsoft.com/en-us/ef/core/saving/concurrency).

### S06 — Connected spectators do not receive a complete change stream

- **Severity:** Medium. **Component:** SignalR synchronization. **Status:** Confirmed — code. **Confidence:** High. **Complexity:** Medium–Large.
- **Evidence:** `TournamentService` has no broadcaster for settings, teams, groups, generation or deletion. `MatchService.DeleteMatchAsync:49` and `SeedKnockoutFromGroupsAsync:218` do not publish. `PublishAsync:343` carries one match plus derived tables/bracket/scorers; `tournament.store.ts:72` patches only that match. `live.service.ts:61` reloads on reconnect, not on every structural change.
- **Actual:** a spectator who remains connected can retain removed matches, old team names or an old schedule. Advancing a winner updates the bracket array but not all successor entries in the store's matches array. Initial connection failure is caught as disconnected; retry after automatic reconnect attempts are exhausted is not implemented.
- **Expected:** public fixtures, bracket and names converge after every committed change, with a visible stale/reconnecting state.
- **Recommendation:** publish tournament revisions and typed structural events, or invalidate/refetch read models on a revision change. Carry all affected matches after progression. Include bounded recovery after initial/exhausted connection failure, without overwriting editor drafts.

### Recommended saving strategy

Use **explicit drafts and saves for configuration and schedules**, and **immediate, acknowledged commands for live scoring and clearly labeled structural actions**. Uniformity means predictable scope and feedback, not making a goal entry wait for a settings Save button.

1. Keep settings, match schedules, team/roster edits and account edits in separate draft models with stable IDs, baselines and revisions.
2. Give each form a visible saved/unsaved/saving/failed/conflicted state. A global save, if offered, must explicitly list what it includes.
3. Make schedule Save all a server bulk command. Validate the complete proposal and return mapped records plus a revision.
4. Merge live read models around drafts; never replace a dirty field silently. Warn before any operation that discards or invalidates drafts, including in-page reloads.
5. Route generation through preview → validation → explicit commit. Saving settings and generating should have a documented failure boundary.
6. Make immediate actions idempotent or revision-checked, with pending/error feedback and operation-level retry.
7. Apply navigation protection to every editable workflow, and preserve drafts after an expired session or transient network failure where feasible.

This addresses S01–S06 without adding yet another save button whose scope is ambiguous.

## 6. UX/UI assessment

The UI has useful foundations: Danish/English text, visible connection state, loading skeletons, reusable selects/date pickers, confirmation dialogs, a guided admin experience, responsive breakpoints and a sticky match-save toolbar. Global styles use 44px target sizing, 16px form text and safe-area spacing (`ligacup-web/src/styles.scss:16`, `:56`, `:172`, `:216`). These are positive implementation choices, not proof of mobile or accessibility compliance.

From an organizer's perspective, the major problem is predictability: changing a group saves immediately, editing a kickoff waits, and saving visibility can also save rules. From a scorer's perspective, rapid live actions need clear acknowledgements and correction paths. From a visitor's perspective, a connected indicator must not imply the displayed schedule is current when structural updates are not broadcast. A team manager has no dedicated workflow; granting Editor currently grants authority over every tournament.

### U01 — Several actions lack reliable pending/error feedback and context reset

- **Severity:** Medium. **Component:** organizer/live/account interactions. **Status:** Confirmed — code. **Confidence:** High. **Complexity:** Medium.
- **Evidence:** `live-console.ts:580–637` directly awaits score/status/event requests without a consistent busy/error wrapper. `admin-setup.ts:2160` onward includes add/group/player actions without uniform error handling. `admin-users.ts:refresh` and `admin-home.ts:refresh` use finally without a user-facing failure path. `live-console.ts:495` switches match without clearing `eventPlayerId`/`eventMinute`.
- **Actual:** failed commands can leave no contextual explanation; repeated clicks are possible while an earlier write is pending. A player selected for one match can remain in the event model after changing matches/teams even when absent from the displayed options. The server does not reject that relationship (SEC03). These interaction paths were code-reviewed, not tested on a lossy network.
- **Expected:** every command has pending/success/failure feedback; failed drafts remain available; dependent event fields reset or validate when their context changes.
- **Recommendation:** shared command-state handling, scoped disabling/serialization, specific server error messages and explicit retry. Reset player/minute fields where appropriate and validate selections before submission. Use accessible status announcements rather than only transient generic messages.

### U02 — Confirmation dialogs can activate a different action from the focused button

- **Severity:** Medium. **Component:** shared confirmations/accessibility. **Status:** Confirmed — code; assistive-technology behavior untested. **Confidence:** High. **Complexity:** Small–Medium.
- **Evidence:** `shared/confirm-dialog.ts`, `onKeydown`, intercepts document-level Enter and emits alternate or confirm regardless of focused element. The component has dialog labels but no implemented focus trap, initial focus policy or return-focus handling. Nested `<a><button>` controls occur in pages such as `admin-users.ts:27`.
- **Actual:** when a confirmation is open, Enter is routed to the component's default action even if the user has focused Cancel. This can be destructive in delete dialogs. Multiple visible focusable surfaces are not constrained by the modal implementation. No screen-reader or keyboard browser session was executed for this audit.
- **Expected:** Enter activates the focused button; Escape cancels; focus enters, stays within and returns from a modal predictably.
- **Recommendation:** use native button behavior and an established accessible dialog pattern; make the safe action the initial focus for destructive operations. Replace nested interactive elements with one link/button. Verify keyboard, screen reader, zoom and small-width behavior, including the three-action unsaved-changes dialog.

### U03 — Role names and admin navigation do not explain the actual authority model

- **Severity:** Medium. **Component:** permissions UX/product scope. **Status:** Confirmed — code; per-tournament scope is a Suggestion. **Confidence:** High. **Complexity:** Small for UI; Large for ownership.
- **Evidence:** `core/admin.guard.ts:5` checks only `isLoggedIn`; `app.routes.ts:18`, `:30`, `:37` use it. `AuthorizationPolicies.cs:14` grants Editor policy to Admin/Editor globally. `TournamentEndpoints.cs:25` applies this policy to all tournament administration, including delete. The model has no tournament membership/owner relationship.
- **Actual:** a Viewer can reach management screens, but write APIs correctly reject the operations. An Editor can manage/delete any tournament. This is the current policy, not evidence of bypassing that policy.
- **Expected:** navigation reflects server capabilities. If only a trusted central organizer team is supported, that scope should be explicit; independent organizers/team managers need narrower permissions.
- **Recommendation:** hide/disable unavailable editing routes/actions and use capability checks consistent with the API. Before opening access to other clubs, add tournament membership and narrower scorer/roster permissions. Do not present global editors as owners of only “their” tournaments.

Additional usability work should follow the integrity fixes: replace hard-coded creation dates/venues with deliberate defaults; show a clear schedule validation/preview step; explain the difference between a logical round and a pitch time slot; distinguish “save match edits” from “save tournament settings”; and expose unresolved qualification decisions. These are covered by F01/F03/F05/S03 and the product suggestions in section 11 rather than asserted as separately tested defects.

## 7. Security and reliability findings

This section distinguishes a demonstrable unsafe code path from an executed exploit. No payload was submitted to production, no credentials were tested or reproduced in this report, and no production security incident is claimed. Hosting-level controls and installed dependency advisories were not independently audited.

### SEC01 — Stored rich HTML reaches an unsanitized admin DOM sink

- **Severity:** High. **Component:** rules/parking editor, authenticated content. **Status:** Confirmed unsafe data path — code; exploit not executed. **Confidence:** High. **Complexity:** Medium.
- **Evidence:** `TournamentService.cs:152` stores rules after trimming; parking follows the same pattern. `admin-setup.ts:1579` and `:1587` assign these strings to native `innerHTML`. `serializedEditorHtml:1886` only removes the editor selection class; it is not a sanitizer. Any Editor may submit the HTML via the protected tournament API. `auth.service.ts:107` stores the session in localStorage.
- **Actual:** persisted HTML is loaded into a privileged editor through direct DOM assignment, bypassing Angular's template HTML sanitization. An authenticated editor able to submit hostile markup has a stored-XSS path when another organizer/admin opens it, subject to effective browser/hosting CSP. Neither a hostile payload nor effective production CSP was tested. Public `[innerHTML]` bindings in `tournament.ts:218/:228` use Angular's template sanitation; that protection does not cover the native editor assignment.
- **Expected:** user-authored rich content has an explicit safe HTML/URL policy and never executes scripts or event handlers when opened for editing.
- **Recommendation:** enforce a server-side allowlist sanitizer and safely render sanitized content in both editing/public contexts; restrict link/image protocols and review existing stored content through a controlled process. Add malicious-markup regression tests, then evaluate CSP as defense in depth. Angular specifically cautions that direct DOM APIs bypass its template security protections: [Angular security guidance](https://angular.dev/best-practices/security).

### SEC02 — Account security changes do not promptly invalidate sessions

- **Severity:** High. **Component:** auth/user lifecycle. **Status:** Confirmed — code; refresh races Suspected. **Confidence:** High for revocation gap; Medium for races. **Complexity:** Medium–Large.
- **Evidence:** `Security/UserService.cs:96–107` resets only the password hash. Role/active changes at lines 77–92 do not invalidate access tokens. `Program.cs:56–87` validates JWT signature/issuer/audience/expiry, with no user/security-version check. `AuthService.cs:23/:25` defaults to 60-minute access and 30-day refresh tokens. `RefreshAsync:61–84` checks current user active state, but not a password/session version.
- **Actual:** password reset leaves existing refresh sessions usable until their configured expiry/revocation. Logout revokes the submitted refresh token, but an already issued access token remains valid until expiry, as can tokens held after role demotion, deactivation or deletion. With defaults, access lasts approximately 60 minutes plus clock skew. Deactivation does block subsequent refresh and deletion cascades refresh tokens; these controls do not invalidate a previously issued JWT.
- **Expected:** password reset/account removal can terminate sessions; demotion/deactivation has a documented, short enforcement delay.
- **Recommendation:** revoke refresh sessions on security-sensitive account changes, introduce a session/security version checked by protected operations, and define short access-token lifetimes. Add reset/demotion/deactivation/logout tests using tokens issued before the change.
- **Related unverified race:** refresh rotation reads an active token then revokes/inserts without a concurrency predicate. Two concurrent refreshes may both succeed; client deduplication is per service instance, not across tabs. Add atomic consume/rotation and a multiple-tab test. Last-admin checks are also read-then-write; simultaneous demotions should be tested, not assumed safe.

### SEC03 — API validation does not enforce competition relationships

- **Severity:** High. **Component:** match/team/player/event writes. **Status:** Confirmed — code. **Confidence:** High. **Complexity:** Medium–Large.
- **Evidence:** `MatchService.SaveMatchAsync:19–36` assigns supplied group/team IDs, stage and round without checking same-tournament membership or distinct opponents. `AddEventAsync:129–141` accepts team/player IDs without validating membership in the match/team. `TournamentService.SaveTeamAsync:245` assigns group IDs; `SavePlayerAsync:292` assigns team IDs. EF foreign keys in `LigaCupContext.cs` establish existence, not these business invariants.
- **Actual:** the service contracts allow existing but unrelated team/group/player IDs to be attached. A match can reference the same team twice; an event can name a player from another team. The live-console stale-selection path in U01 makes this relevant to accidental use as well as crafted requests. No invalid records were inserted during this audit.
- **Expected:** validate tournament scope, distinct teams, player/team membership, supported enums/ranges and legal stage/status transitions before committing.
- **Recommendation:** centralized command validators plus domain constraints and transactional validation. Return structured 400/409 responses with field-specific reasons. Apply equivalent checks to group/team/player changes and already-started matches; hiding invalid UI options alone is insufficient.

### SEC04 — Deployment cleanup sends an FTP request without enabling TLS

- **Severity:** High. **Component:** CI deployment credentials. **Status:** Confirmed — code/configuration; live traffic not inspected. **Confidence:** High. **Complexity:** Small.
- **Evidence:** `.github/workflows/deploy-to-simply.yml:327–346` creates `FtpWebRequest` with an `ftp://` URI and configured credentials, then calls `GetResponse()` without `EnableSsl = true`. This step is independent of the normal upload action's `protocol: ftps` setting.
- **Actual:** this cleanup request is configured for unencrypted FTP even when the artifact uploads use FTPS. The .NET property defaults to false, as documented in [FtpWebRequest.EnableSsl](https://learn.microsoft.com/en-us/dotnet/api/system.net.ftpwebrequest.enablessl?view=net-10.0). Exposure on an actual run depends on server/network behavior; no credential interception or workflow execution was attempted.
- **Expected:** every deployment, cleanup and recovery operation requires encrypted authentication/transport and fails closed if TLS is unavailable.
- **Recommendation:** replace or correct this request using required TLS, audit every FTP/curl path for downgrade behavior, and use a minimally scoped deployment credential. Decide credential rotation after reviewing historical use; do not treat the primary FTPS upload setting as protection for all steps.

### SEC05 — Draft status and address hiding are not API privacy controls

- **Severity:** Medium. **Component:** public read model/publication. **Status:** Confirmed — code. **Confidence:** High. **Complexity:** Medium.
- **Evidence:** `TournamentEndpoints.cs:14–23` publicly serves list/detail. `TournamentService.GetAllAsync:14` has no status filter. `BuildGraphQuery:39` loads teams and players. `DtoMapper.cs:16–17`, `:32`, `:53–63` returns rules/parking, visibility flags, manager and player data. Venue/location remain in the DTO when addresses are hidden in cards.
- **Actual:** Draft/Archived records are not excluded by a publication check. The public response includes roster/manager fields, including players without an active-only filter. Hiding match addresses changes presentation rather than removing address data from the response. No production private-data inventory was performed.
- **Expected:** publication and private fields have an explicit policy. A visual “hide” option should say whether it means only hide on cards or also withhold from public API responses.
- **Recommendation:** separate organizer/public DTOs; explicitly select published tournaments and intentionally public roster fields. Review youth-player/manager data needs with organizers. Preserve public venue information where intended; this finding is not a claim that every returned venue is confidential or that a legal violation occurred.

### SEC06 — Application-level abuse controls and resource bounds are incomplete

- **Severity:** Medium. **Component:** login, public graph reads, uploads. **Status:** Confirmed absence in application code; production exposure Suspected. **Confidence:** High for code; Medium for operational risk. **Complexity:** Medium.
- **Evidence:** `Program.cs` configures no rate-limiting middleware. Auth endpoints have no application lockout/throttle. `PasswordHasher.cs:11` uses 210,000-iteration PBKDF2, making repeated checks intentionally nontrivial. Public detail loads the graph (`TournamentService.cs:39`); image upload at `TournamentEndpoints.cs:44` has a per-file size limit but no account/tournament aggregate quota or cleanup lifecycle.
- **Actual:** no application-level defense bounds repeated password guesses, repeated expensive detail reads, or aggregate authenticated upload storage. Hosting controls may exist and were not reviewed. No brute-force/load/storage-exhaustion test was performed.
- **Expected:** reasonable per-client/account limits, measured query cost, bounded retained data and storage monitoring.
- **Recommendation:** rate-limit login/refresh and expensive public reads with appropriate proxy identity handling; add upload quota/orphan cleanup and capacity alerts. Keep uniform login failure messages. Tune against expected event traffic rather than choosing arbitrary restrictive limits.

## 8. Testing and production readiness

### Validation performed

| Validation | Result | Scope/limits |
|---|---|---|
| `npm test` in `ligacup-web` | **Passed: 9 tests** | Node/esbuild harness testing date/API/setup behavior. Not a rendered browser suite. |
| `dotnet test LigaCup.Domain.Tests --no-restore --disable-build-servers -m:1 --logger 'console;verbosity=minimal'` | **Passed: 45 tests, 0 skipped** | Domain standings/fixtures/clocks plus recent SQLite-backed scheduling-service cases. Test runner needed the permitted sandbox escalation for IPC. |
| `npm run build` | **Passed** | Production Angular bundle: approximately 474.78 kB initial / 123.95 kB estimated transfer; no build warnings reported. |
| Normal API build to its usual output | **Blocked by existing process file locks** | MSB3027/MSB3021 copying dependency DLLs; this is not classified as a source compilation failure. The existing API process was not stopped. |
| `dotnet build LigaCup.API/LigaCup.API.csproj --no-restore --disable-build-servers -m:1 -o C:/Repos/LigaCup/LigaCup.API/bin/Audit` | **Passed: 0 warnings, 0 errors** | Alternate ignored output avoided locked files. This compiles the service; it does not test startup against production configuration. |
| In-memory compiled-domain probes | **Failures reproduced as documented** | Multi-slot overlaps, partial bye exception, repeated-Live clock reset, six entrants normalized to four slots. Reflection invoked the actual private kickoff allocator; no database writes. |
| In-memory frontend probes using actual classes with fake HTTP/live dependencies | **Failures reproduced as documented** | SignalR/reload draft loss; destructive team-assignment payload; rich-editor initialization ordering. No network or persisted-data mutation. |
| Domain Match serialization inspection | **Contract mismatch confirmed** | Missing DTO-only name/clock members; not an HTTP/browser race reproduction. |

No new test source files were created. Existing automated tests use their test fixtures; no audit command intentionally opened production or modified an existing application database. The only new tracked-path artifact is this report; build/test tools produced normal ignored output.

Not performed: a full new browser/end-to-end pass, actual concurrent HTTP clients, injected mid-transaction failures, migrations against a copy of production, live hosting/FTP verification, dependency advisory scanning, sustained load testing, assistive-technology testing, or restore drills. Earlier work in this conversation included isolated local scheduling UI checks; those are not represented as a comprehensive UI audit here.

### O01 — Release deployment lacks a demonstrated atomic rollback and restore path

- **Severity:** High. **Component:** release operations/data recovery. **Status:** Confirmed workflow limitations; hosting backups unverified. **Confidence:** High for repository workflow, Medium for external operations. **Complexity:** Medium–Large.
- **Evidence:** `.github/workflows/deploy-to-simply.yml:4` deploys main; API/web jobs have separate dependency chains (`:230`, `:444`). Cleanup at `:327` uses `if: always()`. Startup runs migrations (`Program.cs:130–167`). Workflow excludes database/log files from FTP upload, but contains no database backup/restore or release rollback gate. README's backup guidance at `:119` is manual.
- **Actual:** API and frontend can become different release versions. An offline marker can be removed after a partially failed upload, allowing a mixed deployment to restart. Startup migration happens against the live database. Existing exclusions are valuable protection against overwriting the DB file, but they do not prove recoverability from a logical deletion or migration problem.
- **Expected:** coordinated compatible releases, verified backups before schema changes, retained rollback artifacts and a tested restoration procedure.
- **Recommendation:** stage and validate versioned artifacts, coordinate API/web compatibility, retain a known-good release, and document a SQLite-consistent backup/restore process including uploaded assets and any journal/WAL state. Keep a failed deployment safely unavailable or roll back deliberately. Inspect provider backups rather than assuming they exist. This audit did not access or alter them.

### O02 — SQLite fallback can select a different database instead of failing

- **Severity:** High. **Component:** database identity/configuration. **Status:** Confirmed — code; production occurrence unverified. **Confidence:** High. **Complexity:** Medium.
- **Evidence:** `Infrastructure/Configuration/DatabaseConfiguration.cs:90` resolves candidates, prefers an existing writable candidate, then any writable candidate, then LocalApplicationData/temp fallback. `Program.cs:136` logs the resolved location and applies migrations. `CanWrite` probes a sibling file, not the contents/identity of the intended DB.
- **Actual:** if the configured location is unavailable and another candidate is writable, startup can select/create a different database. Users then see an apparently empty application even though the original data still exists. A log message records location, but there is no expected database identity/readiness gate. No filesystem permissions were changed to induce this scenario.
- **Expected:** production uses one explicitly configured persistent database and fails clearly if it cannot access it.
- **Recommendation:** restrict fallback to deliberate development/bootstrap use. Pin the production absolute path, validate expected database identity and permissions, and expose a nonsecret identity/version in readiness diagnostics. Provide an explicit recovery procedure rather than silently moving to temporary storage.

### O03 — Test coverage and CI do not gate the most dangerous workflows

- **Severity:** High. **Component:** automated verification/release gating. **Status:** Confirmed — repository review and passing tests with reproduced gaps. **Confidence:** High. **Complexity:** Medium–Large.
- **Evidence:** tests in `LigaCup.Domain.Tests/StandingsCalculatorTests.cs`, `MatchClockTests.cs`, `TournamentSchedulingTests.cs`; frontend suite `ligacup-web/tests/scheduling.test.ts`. Workflow `deploy-to-simply.yml:56–68` runs .NET tests conditionally; `:177–216` installs/builds frontend without running `npm test`. Trigger is main push/manual dispatch, with no PR test workflow found.
- **Actual:** all tests pass while F01/F02/F06/S01 remain reproducible. The suites do not cover rendered rich-editor initialization, multi-editor conflicts, auth revocation, DTO HTTP shape, knockout correction, save-all partial failure, public structural updates or deployment recovery. Existing manual scripts are not a comprehensive isolated CI gate.
- **Expected:** changes to these workflows cannot reach release without representative service/API/browser regression coverage.
- **Recommendation:** run both existing suites on PRs and before deployment. Add focused tests for the confirmed defects first; then SQLite-backed service/API authorization/validation tests and a small browser journey covering create → teams → schedule → save/reload → live scoring → public result. Avoid broad snapshot tests that merely mirror markup.

### O04 — Health/configuration handling can report success while operation is degraded

- **Severity:** Medium. **Component:** readiness/diagnostics. **Status:** Confirmed — code/configuration. **Confidence:** High. **Complexity:** Medium.
- **Evidence:** `Program.cs:119` returns a timestamp health response without a database query. `Program.cs:38–53` creates an ephemeral production signing key on missing/short configuration; admin seeding can log an error and continue without an account. Workflow `:367` probes `DEFAULT_API_ORIGIN`, even though build configuration supports an overridden API origin; recovery paths hard-code `ligacup.api`. `LigaCup.API/web.config` enables stdout logs, with no repository-defined retention/alerting.
- **Actual:** a running process can pass health despite a later database fault, unavailable administration or an ephemeral key that invalidates sessions on restart. An overridden deployment origin can be checked against the wrong site. Startup logging exists, but no verified alert/recovery operational loop is defined in the repository.
- **Expected:** liveness and readiness have distinct meanings; required production configuration is validated; checks target the deployed artifact/origin.
- **Recommendation:** fail configuration validation where the service cannot operate as intended, add database/schema/auth-configuration readiness and release identity, use one resolved deployment origin/path throughout, and set log retention plus actionable alerts. Do not expose secrets in diagnostics.

### Production-readiness matrix

| Area | Assessment |
|---|---|
| Basic buildability/domain baseline | Good: both builds and existing suites pass. |
| Small single-organizer league | Substantial functionality, but not dependable enough to assume schedule/draft preservation without the listed fixes and a realistic rehearsal. |
| Multi-pitch/time-slot generation | Not ready for unattended use; F01 is reproduced. |
| Knockout/general-format support | Incomplete; F03–F05 require workflow corrections and service tests. |
| Concurrent editing/live scoring | Not ready to promise correctness under overlapping actions; S01/S04/S05. |
| Public spectator use | Useful read experience; structural consistency and publication policy need correction. |
| Untrusted editor accounts | Not ready; global privileges and the rich-HTML path are material risks. |
| Mobile/accessibility | Intentional responsive implementation, but unverified on actual devices/assistive tools; U02 is a known defect. |
| Recovery/deployment resilience | Insufficiently demonstrated; TLS cleanup, database identity, backup/restore and readiness need work. |

## 9. Technical debt

### D01 — Setup behavior is concentrated in one large component

- **Severity:** Medium. **Component:** frontend maintainability. **Status:** Confirmed code concentration; refactoring is a Suggestion. **Confidence:** High. **Complexity:** Large if done at once, Medium incrementally.
- **Evidence:** `pages/admin/admin-setup.ts` contains approximately 2,600 lines of inline template/styles plus rich-text handling, settings, teams, groups, generation, schedule editing, snapshots, confirmations and navigation protection. Save/reload decisions are repeated across methods around lines 1619, 2030, 2160, 2300 and 2390.
- **Actual:** similar actions preserve drafts differently, as S01 demonstrates. Fixes must currently account for many interacting methods in one file. This is a concrete maintenance risk, not a requirement to rewrite the UI framework.
- **Expected:** form ownership, draft lifecycle, command behavior and rendered sections have clear boundaries.
- **Recommendation:** after regression tests are in place, extract draft/command orchestration and settings/schedule/roster/rich-editor components in small steps. Keep shared date/DTO helpers; avoid introducing a second parallel save system.

### D02 — Every live mutation rebuilds a large tournament read model

- **Severity:** Medium. **Component:** API/database/broadcast performance. **Status:** Confirmed query pattern; scalability impact Suspected. **Confidence:** High for design, Medium for capacity. **Complexity:** Medium.
- **Evidence:** `TournamentService.BuildGraphQuery:39–49` loads groups, teams, players, matches and events; `MatchService.PublishAsync:343` reloads that graph and rebuilds tables, bracket and scorers for each mutation. `GetAllAsync:14` returns all tournaments; `DtoMapper.ToSummary:16–17` includes rules/parking HTML in summaries. There is no paging contract for these reads.
- **Actual:** work per goal grows with the full tournament/event graph, and summaries carry content unnecessary for a list. No load benchmark was performed, so a maximum supported crowd/tournament size cannot be claimed. `AsSplitQuery` and `AsNoTracking` help but do not bound total work or response size.
- **Expected:** measured response/query/broadcast cost and a documented capacity envelope for event day.
- **Recommendation:** first instrument query counts, latency, payload size and SQLite contention with representative data. Project lightweight summaries; avoid loading unrelated roster/history fields for each update; selectively cache derived read models with revision-based invalidation. Introduce pagination/retention where actual sizes justify it. Do not migrate to another database simply to conceal correctness problems.

### D03 — Operational documentation disagrees with actual behavior

- **Severity:** Low. **Component:** README/configuration guidance. **Status:** Confirmed — code/document comparison. **Confidence:** High. **Complexity:** Small.
- **Evidence:** `README.md:142` says invalid production JWT configuration prevents startup; `Program.cs:38` instead creates an ephemeral key. `README.md:115` claims explicit App_Data/database-extension blocking in web.config, but the checked-in API `web.config` contains only ASP.NET Core handler/process configuration. `README.md:155` describes encrypted uploads while SEC04 identifies an unencrypted cleanup path.
- **Actual:** an operator following the README can assume controls that are not implemented as described. The web.config discrepancy does not prove that the database is publicly downloadable: ASP.NET serves static content from wwwroot, and IIS-level controls were not inspected.
- **Expected:** documentation accurately describes effective controls, failure modes and recovery procedures.
- **Recommendation:** align documentation with corrected implementation and add a short deploy/readiness/restore checklist. Remove unsupported claims; distinguish repository configuration from provider-managed settings.

Other debt worth handling within the above work includes duplicated domain/frontend contract definitions (F08), ad hoc exception mapping (SEC03/U01), direct rich-text DOM manipulation (F09/SEC01), and global-store draft coupling (S01). These should be addressed through the relevant fixes, not logged as unrelated refactors.

## 10. Missing or incomplete functionality

The following gaps are grounded in the current workflows. Items labeled “opportunity” are not commitments the product already makes.

| Capability | Classification and user impact | Evidence/finding | Completion criterion |
|---|---|---|---|
| Robust save-all transaction/conflict handling | Incomplete; organizers can lose work or misunderstand partial saves | S01/S04/S05 | Survive a concurrent score update, a stale editor and a mid-save failure without silent loss. |
| General knockout entry and correction | Incomplete; placeholder brackets and stale/wrong successors | F03/F04 | Direct seeding, group qualification, safe corrections and downstream status checks all work through UI/API. |
| Non-power-of-two brackets and best third qualifiers | Incomplete; entrant count silently shrinks and a persisted option has no effect | F05 | Explicit supported policy, no silent exclusions, tested 3/6/10-entrant and best-third cases if supported. |
| Persisted lottery/manual tie resolution | Incomplete; an incidental order can qualify a team | F07 | Organizer records a resolution with visible reason and stable public result. |
| Pitch/team collision detection | Missing control; generated/copied/manual games can overlap | F01 | Validate intervals, rest and resources before schedule commit. |
| Team metadata/points adjustment UI | Partial; API/domain fields exist but are not fully editable in setup | S02; `admin-setup.ts:419` displays adjustments | Deliberate edit scope and preservation; if deductions are used, record reason/history. |
| Cards/registration settings consistency | Partial | `live-console.ts:472` always offers card event types; `TrackCards` is stored, not used there | Define what disabling card tracking means and enforce consistently; test Names/Numbers/NamesAndNumbers public display. |
| Public/private publication model | Missing explicit gate | SEC05 | Draft visibility and public roster fields reflect an agreed policy. |
| Per-tournament/scorer/team-manager permissions | Product opportunity before wider access | U03 | A scorer cannot edit unrelated events; a team manager can maintain only their authorized roster. |
| Registration workflow | Not implemented; current “registration mode” configures player entry | Admin roster form/models | Only add invitations/self-service approval if it reduces real organizer data entry; do not label current roster fields as registration management. |
| Change history/restore | Missing reliability capability | S04/S05/O01; hard-delete endpoints and no history entity | Identify who changed a result/schedule, inspect previous versions and restore deliberately. |
| Durable uploads lifecycle | Partial | SEC06/O01; files under API wwwroot | Back up/restore assets with records, prevent quotas/orphans, and verify redeploy retention. Current FTP sync behavior for remote-only assets was not tested. |
| Self-service password/session management | Partial | `UserEndpoints.cs:51`, `AuthService` | Secure account recovery or administrator reset with session revocation; optional active-session management. No email delivery system was found. |
| Exportable event-day schedule | Opportunity | Public fixtures/round view exists; no export flow found in reviewed routes | A printable/offline-friendly schedule that includes revision/time so volunteers know whether it is current. |

Supported scope should be made explicit now. A small trusted-organizer product can legitimately omit self-service registration, multi-tenant ownership or a complex venue calendar. It should not silently offer competition settings it cannot honor, or depend on unprotected drafts for essential scheduling work.

## 11. Recommended improvements

The first improvements should remove data-integrity and security risks already evidenced, rather than expand the feature list.

| Priority | Improvement | Findings addressed | Concrete value |
|---|---|---|---|
| 1 | Preserve drafts, fix partial team updates and unify save scope | S01/S02/S03/F08/F09 | Organizers can edit many matches confidently and keep custom rules/team data. |
| 2 | Close privileged HTML/session/transport gaps and enforce server invariants | SEC01–SEC04 | Prevent editor content from becoming a privileged execution path, revoke compromised sessions and reject corrupt competition data. |
| 3 | Make schedules and knockout progression correct before adding formats | F01–F07 | Teams receive a playable schedule and correct qualifying opponents. |
| 4 | Introduce transactional, versioned, retry-safe commands and complete live synchronization | S04/S05/S06 | Two organizers, network failures and connected visitors no longer silently diverge. |
| 5 | Establish release gates, database identity, backup/restore and meaningful readiness | O01–O04 | A successful build/deploy becomes evidence of a recoverable, operable event service. |

The ordering is a practical work grouping, not permission to defer urgent security corrections until a large draft-state refactor is finished. The small FTP/DTO/team-payload/clock corrections can be delivered independently with focused tests when implementation is authorized.

Product opportunities, separate from confirmed defects:

| ID | Suggestion and evidence | Severity / confidence / complexity | Expected outcome and recommendation |
|---|---|---|---|
| P01 | Schedule preview with conflicts and a change summary. Current generator commits directly and copying retains old kickoff values (`admin-setup.ts:2300/:2441`, F01). | Medium / High value confidence / Medium–Large | Show match count, rounds, pitch overlaps, missing teams and before/after times before committing. This addresses the user's fear of losing a carefully edited program. |
| P02 | Revision history and selective undo. No audit/change-history entity exists in `Entities.cs`; writes/delete routes are destructive. | Medium / High / Large | Record actor/time/reason and previous schedule/result state; offer restore of a known revision subject to downstream integrity checks. Helps recover real organizer mistakes without asking for database repairs. |
| P03 | Event-day printable/offline-friendly view. Public fixtures already provide round/all views (`pages/tournament/tournament.ts:117`). | Low / Medium, needs user validation / Small–Medium | Give pitch volunteers a compact schedule with revision, printed time and link/QR to current results. Avoid promising offline live scoring before conflict-safe writes exist. |
| P04 | Targeted delegation for scorers/roster managers. All Editors currently have global write access (`AuthorizationPolicies.cs:18`, U03). | Medium / Medium, depends on intended audience / Large | Let volunteers score assigned matches without deleting tournaments, and reduce central roster entry. Start with scorer permissions if that is the real event-day bottleneck. |

All four are suggestions, not claims that their absence is an exploitable defect or that a competitor's feature list should determine LigaCup's scope. P01/P02 have the strongest direct connection to the reported user pain.

## 12. Prioritized implementation roadmap

This is a proposed sequence only. No implementation, migration, commit, push or deployment is authorized by this audit task.

| Phase | Scope and relative effort | Dependencies | Acceptance gate |
|---|---|---|---|
| **0 — Protect and establish a baseline** | Small–Medium: verify backup/restore on an isolated copy, inventory actual deployed revision/config, add PR gates for both existing suites, require TLS in every deployment path | Access to hosting configuration/backup evidence in a separate authorized task | Restorable DB/assets; known deployed version; no FTP downgrade path; tests required before merge. |
| **1 — Stop immediate data-loss/security paths** | Medium overall: fix S02 partial updates, F08 DTO responses, F09 editor loading, SEC01 HTML policy, SEC02 revocation, F06 repeated status; implement key SEC03 relationship checks | Regression cases for each path; agree allowed rich-text features | Populated metadata survives reassignment; returned DTO is complete; saved rules load before edit; hostile HTML inert; pre-reset sessions rejected; repeated Live preserves clock; invalid associations return 400/409. |
| **2 — Make editing predictable** | Large: stable draft models, save scopes, per-form dirty protection, bulk schedule command, revisions/conflict UI, pending/error feedback and accessible confirmations | Contract decisions in phase 1 | Edit several matches while live scores arrive; copy/add/remove unrelated records; navigate/back/expire login; no silent loss. Stale changes produce conflicts. Mid-save failure has a truthful result. Cancel+Enter never confirms deletion. |
| **3 — Correct the competition engine and preview** | Medium–Large: multi-slot allocation/conflict checks, mixed byes, bracket-size policy, direct knockout seeding, safe correction, complete qualification/tiebreakers | Domain policy decisions; transactional commands | Eight teams/two pitches have zero overlaps; partial bye selection succeeds or validates clearly; repeated generation is safe; every supported entrant is accounted for; corrected semifinals/third-place participants remain consistent. |
| **4 — Make connected operation reliable** | Medium–Large: atomic/retry-safe scoring and finalization, complete revision events, reconnect recovery, public DTO/publication policy | Revisions and invariant validation | Two clients do not lose increments; retry does not duplicate an event; visitors see deletions/new schedules/advanced participants without manual reload; Draft/private fields follow policy. |
| **5 — Rehearse release and event day** | Medium: pinned DB identity, configuration/readiness checks, coordinated deployment/rollback, diagnostics, representative load/mobile/accessibility rehearsal | Correctness gates above; isolated representative dataset | Restore drill succeeds; failed release rolls back safely; DB fault fails readiness; intended event load meets measured targets; organizer/scorer/visitor journeys pass on target devices. |
| **6 — Add evidence-led product improvements** | Variable: P01 preview/change review, P02 history, then P03/P04 if validated | Stable core workflows | Organizers complete realistic setup/correction tasks with fewer errors and clear recovery; no new unsupported competition options. |

### Minimum regression scenarios before claiming production readiness

1. Preserve multiple unsaved schedule edits across a score event, settings save, group assignment, copy round, reconnect and failed request; show conflicts instead of losing drafts.
2. Preserve custom rules/parking through delayed initialization, save, reload, tab changes and unrelated settings updates; verify safe HTML at every render/edit boundary.
3. Keep team metadata and points adjustments intact on group/name changes; reject cross-tournament associations and invalid event player/team combinations.
4. Generate schedules across 2/3/4 pitches, multiple groups and multiple slots per round; verify pair coverage, team/pitch non-overlap, dates, intervals, byes and retained manual fixtures.
5. Rehearse UTC/local conversion across winter/summer and clients in different zones. Current browser-local behavior needs an explicit event-time-zone policy if organizers/visitors operate outside Denmark; that policy was not tested here.
6. Exercise supported knockout field sizes, direct seeding, group qualification, third place, ties/penalties, repeated generation, premature reseeding and corrections after dependent matches start.
7. Drive simultaneous score/event/settings writes from two clients with stale revisions; inject response/broadcast failures after commit and verify idempotent recovery.
8. Test every protected API as anonymous/Viewer/Editor/Admin and with tokens issued before reset, demotion, deactivation and deletion; test concurrent refresh rotation.
9. Verify public fixtures/bracket/rosters converge after every structural change and reconnection, including initial SignalR failure and retry exhaustion.
10. Restore a database and its images into an isolated environment; validate configuration/readiness, failed deploy rollback, realistic event-day load and keyboard/mobile journeys.

### Ten most important findings

1. **S01:** live updates and reloads can erase unsaved match work — reproduced.
2. **S02:** assigning a group clears other team details and points adjustments — payload reproduced, server overwrite confirmed.
3. **F01:** multi-slot rounds can overlap on the same pitch — reproduced.
4. **F03/F04:** knockout seeding and corrected-result progression are incomplete/unsafe — confirmed by code.
5. **SEC01:** stored rich HTML bypasses sanitization in the admin editor — confirmed unsafe path, exploit not attempted.
6. **SEC02:** password resets/security changes do not promptly revoke existing sessions — confirmed by code.
7. **SEC04:** deployment cleanup does not require encrypted FTP — confirmed by configuration.
8. **S04/S05:** bulk/concurrent writes lack atomicity, revision checks and safe retry semantics — mechanisms confirmed; races/failures need injected integration tests.
9. **SEC03/F08:** server relationship validation and match-response contracts can leave inconsistent data/state — code and serialization evidence.
10. **F09:** rich-text initialization can display defaults instead of saved custom content — reproduced with controlled lifecycle ordering; browser frequency remains unverified.

### Five highest-priority improvements

1. Separate drafts from live state and make saving preserve every unrelated field.
2. Sanitize rich content, revoke sessions on security changes, enforce required TLS and validate domain relationships.
3. Repair scheduling/knockout correctness and reject unsupported configurations explicitly.
4. Add transactional, versioned, retry-safe commands with complete public synchronization.
5. Gate releases with targeted API/browser tests, pinned database identity, meaningful readiness and a proven backup/restore procedure.

**Final assessment:** LigaCup is a viable foundation with functioning core features, passing builds and useful domain tests. It is not yet a dependable general-purpose production tournament system. The highest-value next work is to protect organizer edits and competition integrity, close the identified security paths, and prove recovery under realistic failure conditions before expanding features or deployment scope.
