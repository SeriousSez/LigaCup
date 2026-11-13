# LigaCup stabilization — Phase 1

Date: 13 November 2026. Baseline: `codex/scheduling-fixes` at `1efdaa04d8c9aa02dc562ad115b60286992712b0`, with the existing untracked application audit retained unchanged.

The complete application audit was read before implementation. This phase addresses S02, F08, F09, SEC01, SEC02, SEC03, SEC04 and F06. It does not implement the other audit recommendations or change competition scoring, fixture generation algorithms, qualification policies or existing tournament records.

## Outcome

| Finding | Status | Verification |
|---|---|---|
| S02 — Group reassignment | **Resolved** | HTTP tests preserve metadata/points on reassignment and unassignment; client tests verify the narrow request. |
| F08 — Match-save DTO | **Resolved** | Actual HTTP POST/PUT responses contain names, group, clock, scheduled end, image/short-name fields and events. |
| F09 — Rich-editor initialization | **Resolved** | Rendered Angular/jsdom test delays the live connection, verifies editing remains unavailable, then checks saved content, typing and tab recreation. |
| SEC01 — Rich HTML sanitization | **Resolved for the audited HTML paths** | Server and client hostile-markup tests, formatting tests, legacy-read preservation and sanitized-write HTTP tests pass. |
| SEC02 — Session revocation | **Resolved** | HTTP tests reject old access and refresh tokens after security changes; concurrent refresh consumption and logout tested. |
| SEC03 — Server relationship validation | **Resolved for submitted entity relationships** | HTTP tests reject unrelated/missing entities and invalid values before writes, protect recorded participants, and preserve valid placeholder/roster workflows. |
| SEC04 — Required FTP TLS | **Resolved in configuration** | All five upload actions require FTPS/strict security, cleanup enables TLS, and four curl operations require TLS. Static regression checks pass; no FTP connection was made. |
| F06 — Repeated status | **Resolved** | Seven domain status cases and repeated-status HTTP tests preserve clocks and stored timestamps. |

There are no blocked items. “Resolved” describes the scoped implementation and validation, not production deployment, a penetration-test clearance or resolution of other audit findings. Important limits are recorded below.

## S02 — Group reassignment preserves unrelated team fields

**Root cause:** the dropdown called the full-team save with only name, short name and group. The client filled missing metadata with null and points adjustments with zero; the server then replaced those values.

**Implementation:** added `PUT /api/admin/tournaments/{id}/teams/{teamId}/group` accepting `{ groupId }`, including null for unassignment, and returning 204. `TournamentService.AssignTeamGroupAsync` loads the team within the route's tournament, verifies the group's tournament and assigns only `GroupId`. `ApiService.assignTeamGroup` and the setup dropdown use this operation. Existing full-team save contracts remain available for deliberate complete edits.

**Regression tests:** `Phase1ApiTests.GroupAssignmentChangesOnlyMembershipIncludingUnassignment` cycles through another group, null and the original group and verifies name, short name, manager, logo, color, sort order and a nonzero points adjustment. It also rejects a foreign group and a team outside the route's tournament. The frontend suite checks both request bodies and the component's API call.

**Validation:** HTTP and frontend tests passed.

**Remaining limits:** the dropdown still performs an immediate save followed by a store reload. S01's broader unsaved-draft/reload problem is outside this phase. Old cached clients still using the full-team endpoint need the updated frontend; the old replacement contract was not silently redefined.

## F08 — Match-save responses use the complete DTO

**Root cause:** `MatchService.SaveMatchAsync` returned a tracked domain entity even though Angular expected `MatchDto`. SignalR sent a DTO, while the HTTP response could replace it with an object missing required members.

**Implementation:** the service now returns the `MatchDto` produced by `PublishAsync`; the existing POST/PUT endpoints therefore return the same complete contract as live updates. The frontend already consumes this DTO and requires no incompatible model change. A local transaction covers match validation and persistence; it commits before publication.

**Regression tests:** `MatchPostAndPutReturnCompleteDtoWithEventsAndClock` creates a match through HTTP, adds a real event through HTTP, then updates schedule fields and validates the deserialized result. Assertions cover participant names, group name, short name/logo, clock, scheduled end, event player name, score and pitch. Placeholder names are verified separately.

**Validation:** both real HTTP response paths passed, including the real JSON serialization and service read model.

**Remaining limits:** database commit and SignalR notification are still separate boundaries. A broadcast failure can occur after persistence; retry-safe commands/outbox behavior remains S04 work. The fix does not claim every other entity-returning endpoint has been converted to DTOs.

## F09 — Saved rich content loads before editing

**Root cause:** detail became visible before the asynchronous load/live-watch sequence completed. A view-check hook could initialize the contenteditable element with default settings, then refuse to initialize the same element again. Rendered testing also exposed unreliable initialization after tab changes with that hook.

**Implementation:** the setup template is gated by `settingsLoaded`, set only after settings and their baseline have been populated. Each rich editor initializes through its `ViewChild` setter when its element is created, using sanitized saved/draft content. It is not rebound during typing. Removed the legacy date/time text substitution from loading custom rules. An explicitly empty saved string is retained rather than replaced by default rules; null still uses the existing default.

**Regression tests:** the rendered Angular test uses the real `TournamentStore` with a delayed live connection. It establishes that detail already exists while no contenteditable surface is rendered, then verifies the loaded rules and parking. Its custom content deliberately resembles the old default-date pattern, proving it is not stripped. It dispatches a real input event, checks change detection does not reset the text, switches tabs and verifies the draft survives element recreation.

**Validation:** the rendered regression and existing scheduling/frontend tests passed. The test harness now applies Angular's JIT transform so signal inputs and child controls are compiled correctly in tests.

**Remaining limits:** jsdom does not emulate all native browser selection/undo/clipboard behavior. The test proves rendering, lifecycle, input and tab behavior; it is not a real-device caret or clipboard test. Editor availability still depends on completion of the existing load/watch sequence; connection-timeout UX is unchanged.

## SEC01 — Sanitize stored and incoming rich HTML

**Root cause:** raw saved rules and parking were assigned to native `innerHTML`; serializing the editor only removed a selection class. Angular's public template sanitation did not protect those direct DOM insertions.

**Implementation:**

- Added `HtmlSanitizer` 11.0.26 and a small server policy wrapper, `Security/RichHtml.cs`. It parses HTML/CSS using the library rather than attempting to sanitize markup with regular expressions. The library's configurable tag/attribute/CSS/scheme policies are documented in its [primary repository](https://github.com/mganss/HtmlSanitizer).
- Sanitize rules and parking on explicit tournament save and on all summary/detail DTO reads. Legacy content becomes safe to display without a database rewrite or cleanup migration.
- Added DOMPurify 3.4.17 for the native editor insertion/serialization paths. DOMPurify handles HTML parsing and active markup removal; a restrictive post-sanitization policy limits permitted classes, style values and URL schemes. Its hook/configuration API is described in the [DOMPurify repository](https://github.com/cure53/DOMPurify).
- Intercept HTML paste and drop before insertion. Plain text remains text; image files continue through the existing upload flow. The test verifies sanitizer output reaches the insertion command, not raw clipboard HTML.
- Preserve supported headings, paragraphs, bold/italic/underline/strike, lists, tables, links, fonts/alignment/colors and known `rte-image-*` sizing classes. Restrict CSS to presentation properties; omit IDs, event attributes, arbitrary classes, script/iframe/form/SVG/MathML elements, data-image URLs and script URL schemes. HTTP/HTTPS images and relative image paths remain supported; links additionally support mailto/tel. No `bypassSecurityTrustHtml` path was added.

**Regression tests:** seven backend sanitizer cases cover hostile markup, encoded script URLs, unsafe CSS, foreign-content/malformed markup and legitimate formatting. Five client hostile-input cases plus a formatting/idempotence case inspect parsed DOM output. The rendered editor test covers sanitized paste/drop. `LegacyHtmlIsSafeOnReadWithoutRewritingDataAndWritesAreSanitized` verifies both sanitized DTO fields, confirms the raw legacy database record remains identical after reading, then verifies sanitation on an explicit save.

**Validation:** all sanitizer, HTTP and rendered frontend tests passed; both application builds passed.

**Remaining limits:** sanitation intentionally excludes unsupported embedded/active content and arbitrary layout styles. The existing Angular public binding can further restrict styling. There was no production content inventory or rewrite, independent penetration test, CSP rollout, external image privacy review or native-browser attack execution. Maintain both sanitizer dependencies as new advisories appear. This is not a general claim that every application dependency is secure.

## SEC02 — Invalidate affected access and refresh sessions

**Root cause:** password reset only changed the hash; account changes did not revoke refresh sessions. JWT authorization trusted claims until expiry even after account deletion/deactivation/demotion.

**Implementation:** reuse the existing `RefreshTokens` table; no entity or schema changes are needed. Each issued JWT carries a `session` claim containing the hash identifying its refresh record. `OnTokenValidated` calls `AuthService.IsSessionValidAsync`, checking that the record is unrevoked/unexpired, belongs to the token user, and that the user is still active with the same role. A missing/invalid session fails authentication.

Password reset and actual email/role/active-state changes revoke all refresh records for that account in the same transaction as the account change. Email is included because it is a login identifier. Deletion retains the existing cascade, and the per-request check rejects access tokens for missing accounts. Logout revokes its current session, invalidating that session's access token too. Other accounts' sessions are unaffected.

Login, refresh and security-sensitive account operations use transactions. Refresh consumes its old record and issues the replacement atomically; on SQLite this serializes competing consumption/revocation. Successful rotation invalidates the preceding access session. The last-administrator/self-protection behavior is retained.

**Regression tests:** five HTTP cases cover password reset, role change, deactivation, email change and deletion. Each opens two target sessions, checks both access and refresh tokens are rejected afterwards, and verifies the acting administrator remains signed in. Password tests verify old-password rejection/new-password login; reactivation does not revive old sessions. Separate tests cover refresh rotation, logout, two simultaneous refresh requests yielding exactly one success, and rejected last-admin demotion preserving the account/session.

**Validation:** all cases passed through the real JWT middleware and separate HTTP requests. The concurrency test uses separate EF connections to the same isolated, named in-memory SQLite database.

**Remaining limits/compatibility:**

- Old JWTs without a session claim receive 401. The existing Angular interceptor can exchange a still-valid old refresh token for a new-format session. If refresh is unavailable/revoked, sign-in is required. The external auth-response shape is unchanged.
- Requests already authorized before a revocation commits are not forcibly cancelled. Public read-only SignalR connections are not forcibly disconnected.
- Competing browser tabs can still lose a refresh race and need to sign in again; cross-tab session coordination was not redesigned. Refresh rotation invalidates the previous access token, so callers must use the returned pair.
- Validation adds a database lookup to authenticated requests. SQLite writer contention/load and multi-process operation were not load-tested. The transactions address the tested session race, not every application concurrency problem.

## SEC03 — Validate server-side entity relationships

**Root cause:** foreign keys established that IDs existed, but not that groups/teams belonged to the same tournament or players belonged to an event's team. Match editing could reassign existing scores/events to different participants.

**Implementation:** added targeted validation helpers and explicit request exceptions. API middleware returns field-addressable 400 responses, 404 for missing scoped resources and 409 for operations that would conflict with recorded history.

The service boundary now checks:

- Tournament existence when creating groups/teams/matches; group membership in the requested tournament.
- Distinct home/away teams, their tournament membership, supported match stages and positive round/pitch values. Schedule placeholders remain valid before participants are known.
- Two assigned, distinct, same-tournament participants before recording scores/events or changing to a playing/finished status.
- Event team participation and player membership in that team; supported event/status enum values, nonnegative event minutes/scores/penalties and relevant string bounds.
- Player target-team existence; no cross-tournament reparenting; no team transfer once player-attributed events exist. Same-tournament transfers without history remain supported.
- No changes to match participants/group/stage through the edit endpoint after play, scores/penalties or events are recorded. Kickoff/pitch/venue/order edits remain possible.
- Supported tournament/registration/tiebreaker enums and generator first-home/bye IDs belonging to the tournament.

Match edits, player transfers and event insertion validate/write inside transactions so these related operations cannot interleave their validation and mutation on SQLite. Existing stored records are not repaired or reclassified.

**Regression tests:** actual HTTP requests test foreign/missing groups/teams/players, same-team matches, invalid enum/round/pitch/minute values, cross-tournament player moves, event-player/team mismatches, history-protected moves and participant changes. Rejected event requests leave both event count and score unchanged. Additional tests prove placeholder creation/assignment, valid play after assignment, schedule editing with recorded events, and a valid same-tournament roster transfer still work.

**Validation:** all service/API relationship regressions passed alongside the existing domain/scheduling suites.

**Remaining limits:** this is integrity validation, not new per-tournament ownership authorization. Editors remain global. It does not require both teams to share the same group: intentional inter-group fixtures and group reassignment workflows are preserved. It does not backfill existing bad records, resolve stale-edit conflicts, repair knockout progression/reseeding or redesign every lifecycle transition. F03/F04/S01/S04/S05 remain separate audit work. No sustained concurrent match-edit/score/roster stress test was performed.

## SEC04 — Require TLS for every deployment FTP operation

**Root cause:** the main uploads used an FTPS setting, but the .NET cleanup request did not enable TLS. Recovery/log-download curl commands used optional TLS, and documentation suggested downgrading when TLS failed.

**Implementation:** all five FTP deployment action invocations now explicitly use `protocol: ftps` and `security: strict`; removed the switchable `FTP_PROTOCOL` environment setting. The .NET cleanup request sets `EnableSsl = true`. All four FTP curl commands use `--ssl-reqd`, with no insecure-certificate flag or plaintext fallback. README guidance now requires TLS failure to be repaired rather than downgraded. The action supports strict security in its [versioned input contract](https://raw.githubusercontent.com/SamKirkland/FTP-Deploy-Action/v4.3.5/action.yml); curl documents required TLS separately from optional TLS in its [manual](https://curl.se/docs/manpage.html#--ssl-reqd).

**Regression tests:** the frontend Node suite reads the workflow and asserts all upload protocol/security entries, the .NET TLS setting, required TLS on every authenticated curl command, and absence of optional-TLS/insecure/variable-downgrade settings.

**Validation:** configuration regression passed. No deployment, FTP login, certificate probe or remote operation was performed.

**Remaining limits:** actual host TLS/certificate compatibility is unverified. A noncompliant host will fail, intentionally. Existing best-effort log-download error handling remains, but does not retry over plaintext. Broader atomic deployment/rollback and credential-history review are outside Phase 1.

## F06 — Repeated status changes preserve clocks

**Root cause:** applying Live to an already Live match replaced its running-start time; repeated Finished also replaced the finish time. The live UI allowed redundant status clicks.

**Implementation:** `MatchClock.ApplyStatusChange` returns immediately when the status is unchanged. `MatchService.UpdateStatusAsync` returns the current mapped DTO without saving or re-running progression for a repeated state. The currently selected status button is disabled. Other existing status transitions retain their behavior.

**Regression tests:** a seven-case domain theory verifies that repeated Live/Paused/HalfTime/Finished/Scheduled/Postponed/Abandoned leaves serialized state unchanged, with an explicit running elapsed-time assertion. HTTP tests repeat the main statuses and compare all stored match fields, including timestamps. Existing clock-transition tests continue to pass.

**Validation:** domain and HTTP tests passed.

**Remaining limits:** this is idempotence for a repeated current status, not a complete concurrent-command or knockout-correction design. Repeating Finished no longer re-runs advancement; F04 needs a dedicated correction workflow in a later phase.

## Complete validation results

| Check | Result |
|---|---|
| Full backend suite: `dotnet test LigaCup.Domain.Tests -c Release --no-restore --disable-build-servers -m:1 --logger 'console;verbosity=minimal'` | **73 passed, 0 failed, 0 skipped**. Includes all 45 existing cases plus 28 new cases. |
| Full frontend suite: `npm test` from `ligacup-web` | **18 passed, 0 failed, 0 skipped**. Includes all nine existing cases plus nine new cases. |
| API build: `dotnet build LigaCup.API/LigaCup.API.csproj -c Release --no-restore --disable-build-servers -m:1` | **Passed, 0 warnings, 0 errors.** |
| Frontend production build: `npm run build` from `ligacup-web` | **Passed.** Initial bundle approximately 474.89 kB; estimated transfer 123.97 kB. |
| Diff whitespace check | `git diff --check` passed. |
| Dependency advisory review | **32 npm advisories remain:** 20 moderate, nine high, three critical. No affected node is new or version-changed relative to the baseline lockfile. DOMPurify/jsdom have no direct entries in this audit result. No unrelated automatic upgrades were applied. |

The first Debug backend test/build attempt hit DLLs locked by an already running local API/Visual Studio process. Validation was rerun successfully using the separate Release output. No existing API process was stopped or restarted. Backend HTTP tests launch only an in-process test server with synthetic, named in-memory SQLite databases and the application's migrations; no application database file is used. Package restores/test-host execution required sandbox escalation and completed successfully.

The new frontend tests use jsdom 31.0.1 and Angular's installed JIT transform. Scripts/resource loading are not enabled for hostile fixtures. The dependency lockfile changes include DOMPurify/jsdom and their dependency resolution, including parse5/entities required by the DOM test dependency. No production Angular version upgrade was made.

The npm advisories include existing Angular/router and build-tool dependencies; critical entries include `@angular/build`, `piscina` and `proxy-addr`. These remain a material follow-up risk even though the scoped fixes and tests pass. The full local audit JSON is an ignored test artifact under `.angular/phase1-dependency-audit.json`, not a production artifact or a claim of exploitability in this deployment.

Not verified: real mobile/desktop clipboard and caret interactions, deployed TLS certificates, production authentication traffic, production data/content, broad dependency remediation, sustained load, all concurrent score/edit interleavings, or backup/restore/deployment behavior. The original audit's unselected findings remain open.

## Complete changed-file list

Paths are relative to `C:\Repos\LigaCup`. This phase changes **28 files: 20 modified and eight added**, including this report. No generated build/test outputs are part of this list.

| File | Change | Purpose |
|---|---|---|
| `.github/workflows/deploy-to-simply.yml` | Modified | Required TLS and strict FTPS security for every FTP path. |
| `LigaCup.API/Endpoints/TournamentEndpoints.cs` | Modified | Narrow group-assignment route. |
| `LigaCup.API/Endpoints/RequestErrors.cs` | Added | Validation/conflict/not-found response mapping. |
| `LigaCup.API/Program.cs` | Modified | Persisted-session JWT validation, error middleware and test entry point. |
| `LigaCup.ApplicationService/Contracts/Contracts.cs` | Modified | Additive group-assignment request. |
| `LigaCup.ApplicationService/LigaCup.ApplicationService.csproj` | Modified | Server HTML sanitizer dependency. |
| `LigaCup.ApplicationService/Mapping/DtoMapper.cs` | Modified | Safe HTML in summary DTOs. |
| `LigaCup.ApplicationService/Security/AuthService.cs` | Modified | Session claims, validation, transactional token rotation and revocation. |
| `LigaCup.ApplicationService/Security/UserService.cs` | Modified | Atomic account-change revocation and valid roles. |
| `LigaCup.ApplicationService/Security/RichHtml.cs` | Added | Server rich-content allowlist policy. |
| `LigaCup.ApplicationService/Services/MatchService.cs` | Modified | Complete DTO saves, relationship/history checks and repeated-status handling. |
| `LigaCup.ApplicationService/Services/TournamentService.cs` | Modified | Safe content, narrow membership writes and entity relationship validation. |
| `LigaCup.ApplicationService/Services/RequestValidation.cs` | Added | Small shared validation helpers and typed request errors. |
| `LigaCup.Domain/Timing/MatchClock.cs` | Modified | Repeated status is a no-op. |
| `LigaCup.Domain.Tests/LigaCup.Domain.Tests.csproj` | Modified | Real API integration-test dependency/reference. |
| `LigaCup.Domain.Tests/MatchClockTests.cs` | Modified | Seven repeated-state cases. |
| `LigaCup.Domain.Tests/Phase1ApiTests.cs` | Added | Isolated HTTP/session/relationship/content regressions. |
| `LigaCup.Domain.Tests/RichHtmlTests.cs` | Added | Server sanitizer safety/formatting regressions. |
| `ligacup-web/package.json` | Modified | DOMPurify and jsdom dependencies. |
| `ligacup-web/package-lock.json` | Modified | Locked dependency resolution. |
| `ligacup-web/scripts/test-scheduling.mjs` | Modified | Run all test files and compile Angular signal-input metadata. |
| `ligacup-web/src/app/core/api.service.ts` | Modified | Dedicated group-assignment client method. |
| `ligacup-web/src/app/core/rich-html.ts` | Added | DOMPurify policy for editor HTML, URLs and presentation styles. |
| `ligacup-web/src/app/pages/admin/admin-setup.ts` | Modified | Loaded-state gate, editor initialization, safe paste/drop and group-assignment consumer. |
| `ligacup-web/src/app/pages/admin/live-console.ts` | Modified | Disable the current status action. |
| `ligacup-web/tests/phase1.test.ts` | Added | Rendered editor/client sanitizer/group request/FTP configuration regressions. |
| `README.md` | Modified | Remove plaintext-FTP downgrade guidance. |
| `docs/reviews/ligacup-stabilization-phase1.md` | Added | This implementation and validation report. |

`docs/reviews/ligacup-application-audit.md` was already untracked when Phase 1 started. It was read and preserved unchanged; it is not a Phase 1 modification.

## Review boundary

No entity/schema changes or migrations were created. No existing tournament data or production systems were accessed or modified. No staging, commit, push, merge or deployment was performed. Application builds and tests produced normal ignored local outputs only.

Review should pay particular attention to the HTML allowlist, session rotation/revocation semantics, the distinction between safe group assignment and full-team replacement, and the intentionally retained limitations above. Implementation stops here pending review; no next-phase work has started.
