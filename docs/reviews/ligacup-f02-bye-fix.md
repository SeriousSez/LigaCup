# LigaCup - F02 bye-selection fix

Date: 13 November 2026. Baseline: the existing uncommitted Phase 1 and Phase 2 working tree on `codex/scheduling-fixes`. The original application audit and both stabilization reports were read before implementation.

**Status: F02 resolved for standard round-robin bye selection.** Fully automatic, fully manual and mixed selections work. Invalid selections receive a clear HTTP 400 validation response, and the administration page displays the message without clearing the selections.

## Root cause and reproduction

`FixtureGenerator.BuildSingleRoundRobin` originally computed automatic candidates by excluding every natural bye from the team list. In an odd-team single round robin, every team has one natural bye, so this excluded every team. The next expression indexed that empty list for each automatic selection, using the round index rather than consuming unused candidates.

The reported five-team input `[3, null, null, null, null]` reproduced `ArgumentOutOfRangeException` at the original line 180. Fully automatic input skipped the broken branch, and fully manual input never evaluated the empty-list lookup, explaining why the existing tests passed.

Before changing the algorithm, the new domain suite produced **19 failures and 18 passes**. Failures included mixed selections for three, five, seven and nine teams, mixed return legs, and invalid requests producing incidental exceptions rather than validation errors.

## Implementation

The circle-method pairing generation is unchanged. The fix changes how its complete rounds are ordered:

1. Validate explicit selections: the round robin must have a natural bye, the selection list cannot extend beyond the rounds in one leg, selected team IDs must belong to that group, and each team may be selected only once per leg.
2. Reserve the manually selected team IDs.
3. Build automatic candidates from the natural bye order, excluding only those reserved IDs.
4. Keep each manual choice in its requested round and consume an unused candidate for every automatic slot. Omitted trailing entries also mean automatic.
5. Reorder the existing complete rounds by their selected bye teams. No pairing is added, removed or reconstructed.

When the first bye is automatic, selection respects the existing first-home-team requirement. If manual choices make that requirement impossible, the request explains that the first home team must play in the first round. This preserves the existing first-home feature; it adds no rest-period or pitch constraint.

`TournamentService` maps only bye-selection and first-home `ArgumentException` failures to the existing field-addressable validation contract. The editor now displays the returned validation message, with its existing generic fallback when no server message is available.

## Preserved behavior and boundaries

- Fully automatic generation retains the existing fixture order. Explicit all-null choices behave like omitted choices.
- Fully manual valid ordering remains supported, including `[3, 5, 1, 4, 2]` for five teams.
- Each standard odd-team leg has `n` rounds, `n(n-1)/2` matches and one bye per team. Each standard even-team leg has `n-1` rounds and no byes.
- Return legs repeat the chosen bye ordering and retain the existing alternating home/away reversal.
- Normal even-team generation remains unchanged. An explicit individual bye selection for a standard even-team round robin now gets an explanatory validation error instead of an incidental `Single()` exception.
- The existing option to schedule more teams sitting out, kickoff/pitch allocation, replacement/merge behavior, knockout generation and standings are unchanged. The existing multiple-sit-out tests still pass. This fix does not redesign manual bye semantics for that separate expanded-sit-out mode.
- Phase 2 transactions and idempotency remain in place. An invalid replacement request does not delete saved fixtures or leave a success receipt; a repeated successful generation with the same operation key does not duplicate fixtures.
- No new scheduling restrictions, pitch-overlap warnings, mandatory rest periods, schema changes, migrations, dependencies or API shape changes were introduced.

## Regression evidence

### Domain: 37 new cases

`ByeSelectionTests` covers:

- Three, five, seven and nine teams, each with all automatic choices, one manual choice, several manual choices and fully manual choices.
- The existing five-team fully manual ordering and a shortened mixed list whose omitted trailing entries are automatic.
- Identical fixture ordering between omitted choices and explicit all-null choices.
- Two, four, six and eight teams with correct complete round robins and no byes.
- Duplicate manual choices, an unknown team ID, the bye sentinel as an invalid ID, extra round selections, and explicit individual byes for even-team standard generation.
- Mixed selections with the first-home feature, contradictory first-home selections, and two/three-leg competitions with correct home/away reversal.

For each valid schedule, the assertions check the exact match count, round count, per-round match count, no team playing twice in a round, every expected unordered pair present exactly once per leg, and exactly one bye per team for odd counts. Manual selections are checked at their requested round positions.

### HTTP/database: six new cases

`ByeSelectionApiTests` uses the real API/JWT/transaction pipeline and fresh synthetic in-memory SQLite databases:

- Mixed five-team generation produces all ten matches, respects both selected byes, and replays the same successful response without duplicate fixtures.
- Duplicate, foreign-team, excess-round, even-team and first-home-conflict requests return HTTP 400 with the correct field and explanatory message.
- Each invalid case requests fixture replacement after synthetic saved fixtures have custom venue/pitch/result values. The entire persisted match snapshot remains identical, the tournament's first-home value is unchanged, and no success receipt is created.

### Frontend: one new case

`f02.test.ts` exercises the actual setup component with mocked transport. It verifies that mixed choices are sent unchanged, a validation error is displayed, the failed selection remains available, the busy state clears, and correcting the selection permits successful generation/reload.

## Complete validation

| Check | Result |
|---|---|
| Targeted domain regressions before fix | **19 failed, 18 passed**, including the reported out-of-range exception. |
| Targeted domain regressions after fix | **37 passed, 0 failed.** |
| Complete backend suite: `dotnet test LigaCup.Domain.Tests -c Release --no-restore --disable-build-servers -m:1 --logger 'console;verbosity=minimal'` | **123 passed, 0 failed, 0 skipped**: all 80 existing cases plus 43 F02 cases. |
| Complete frontend suite: `npm test` in `ligacup-web` | **32 passed, 0 failed, 0 skipped**: all 31 existing cases plus one F02 case. |
| API production build: `dotnet build LigaCup.API/LigaCup.API.csproj -c Release --no-restore --disable-build-servers -m:1` | **Passed, 0 warnings, 0 errors.** |
| Frontend production build: `npm run build` in `ligacup-web` | **Passed.** Initial bundle approximately 476.15 kB / 124.51 kB estimated transfer. |
| Whitespace check | `git diff --check` passed. |

The backend test host used the execution permissions needed for local test IPC. All HTTP database fixtures are isolated and synthetic. No existing application database, existing tournament records, production endpoint or hosting service was used. The pre-existing local API/Visual Studio session was not stopped or restarted.

## Changed files for F02 only

The working tree also contains the earlier uncommitted stabilization work. This task changes only these **seven files** relative to that baseline:

| File | Change |
|---|---|
| `LigaCup.Domain/Scheduling/FixtureGenerator.cs` | Correct mixed bye assignment and validate explicit selections. |
| `LigaCup.ApplicationService/Services/TournamentService.cs` | Translate bye/first-home argument errors to field-addressable validation errors. |
| `ligacup-web/src/app/pages/admin/admin-setup.ts` | Display the server's fixture-generation validation message. |
| `LigaCup.Domain.Tests/ByeSelectionTests.cs` | Add 37 domain regression cases. |
| `LigaCup.Domain.Tests/ByeSelectionApiTests.cs` | Add six HTTP/persistence regression cases. |
| `ligacup-web/tests/f02.test.ts` | Add frontend validation/retry regression. |
| `docs/reviews/ligacup-f02-bye-fix.md` | This report. |

## Remaining limits and review boundary

No real-browser/device journey or production-data test was performed. Existing scheduling, knockout, synchronization, dependency and operational limitations documented in the audit and stabilization reports remain outside this fix; in particular, F01 pitch timing was not changed. Existing Phase 1/2 regression coverage remains passing.

No production access, existing tournament data changes, staging, commit, push, merge or deployment occurred. Implementation and validation stop here pending review.
