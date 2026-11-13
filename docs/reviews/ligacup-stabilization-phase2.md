# LigaCup stabilization - Phase 2: reliable editing

Date: 13 November 2026. Implementation baseline: the uncommitted Phase 1 working tree on `codex/scheduling-fixes` (Git HEAD `1efdaa04d8c9aa02dc562ad115b60286992712b0`). The original application audit and complete Phase 1 report were read before implementation. The file list below describes changes **since Phase 1**, not the combined Git diff, which still contains Phase 1 work.

## Outcome

| Finding | Status | Implemented boundary |
|---|---|---|
| S01 - Draft preservation | Resolved for application reloads/live updates | Match, team and account drafts have separate server baselines and editable objects. Settings and creation/live inputs remain local forms. Reconnects and structural reloads preserve drafts; overlapping edits and deleted dirty records require a decision. |
| S03 - Consistent saving | Resolved for existing administration forms | Explicit tournament-settings, schedule, team and account save scopes; guarded creation/generation/live inputs; route/unload protection; pending/error feedback. No universal Save button. |
| S04 - Bulk operations and retries | Resolved for the HTTP command paths | Atomic bulk match saves and copy-round; durable idempotency receipts; serialized immediate commands; notification delivery occurs after commit and cannot turn a committed write into an HTTP failure. |
| S05 - Concurrent editing | Resolved for versioned replacement forms and concurrent score commands | Content revisions checked inside SQLite write transactions; meaningful HTTP 409 errors; explicit draft/server conflict choices; concurrent score increments and goal events are serialized. |

These statuses describe the scoped implementation, not production readiness. Browser/session durability, notification recovery, receipt retention, load and other audit findings remain limited as detailed below. No competition algorithms or scoring rules were changed.

## S01 - Separate server records from editable drafts

**Root cause:** setup fields edited the objects in `TournamentStore.detail`. SignalR/reload replaced those objects, and object-identity-based dirty snapshots interpreted the replacement as a clean form. Account-list refreshes similarly replaced edited rows.

**Implementation:** `EditDrafts<T>` owns a server baseline, local value, latest server value and conflicting field names per stable ID. Setup builds its editing view from this collection rather than mutating the canonical store. Matches use schedule fields; teams use their editable metadata/membership fields; account rows use email, role and active state.

- Untouched fields adopt server changes. Score/event/display fields therefore update without erasing a schedule draft.
- Independently changed fields merge around local edits. For example, group reassignment can update membership while an unsaved team name remains local.
- If a locally edited field also changes remotely, its draft and original revision remain intact. Saving is blocked until the conflict is resolved.
- A remotely deleted dirty row remains visible as a deletion conflict. It is not silently dropped or recreated.
- A successful save acknowledges the submitted values, preserving any edits made while the request was pending. Removed the old `WeakMap` schedule baselines and ad hoc add-match draft copying.
- Account refreshes reconcile rows after both successful and failed requests. Saving one account cannot erase another row's draft.
- Settings remain a separate whole-form draft. A revision mismatch is surfaced explicitly, rather than automatically replacing the form. Settings use the revision returned by their own write, not a later reload's revision; this prevents adopting another administrator's newer baseline without adopting their values.

**Conflict UI:** show affected record/fields and expandable draft/server values. The user can keep the draft for review against the latest revision, or discard that scope and use server values. Neither choice automatically saves. Deleted records allow discard only. Settings compare the visible form with expandable server settings. HTML in comparison output is text interpolation, not a new HTML execution path.

**Regression evidence:** actual `AdminSetup` plus `TournamentStore` tests exercise score pushes, reconnect callbacks, membership reload and round-copy reload with dirty schedules and team names. Further tests cover overlapping edits, deletion conflicts, non-overlapping membership changes preserving points, failed/409 bulk requests, edits during pending saves, account refresh, and the settings save/reload race. All Phase 1 rendered rich-editor and sanitizer tests remain passing.

**Limits:** drafts live in the current page/component session. Ordinary application reloads and reconnects preserve them; browser unload is guarded, but explicitly discarding, force-closing the browser or losing the process does not restore drafts. There is no offline durable draft store. Whole-form settings conflicts require an explicit whole-form decision rather than a field-by-field automatic merge.

## S03 - Save scopes and navigation protection

**Root cause:** settings buttons named individual sections while saving the full settings object, and dirty detection omitted teams, creation inputs, account rows and live form inputs.

**Save boundaries:**

| Workflow | Boundary |
|---|---|
| Tournament settings | Every settings save is labeled **Save all tournament settings** and includes rules, parking and display/configuration fields. |
| Match schedules | Per-match save writes that match's schedule; **Save all match changes** uses one atomic schedule batch. It does not write settings, team forms or live scores. |
| Team metadata | Explicit save per team; immediate membership assignment still uses the Phase 1 narrow endpoint. |
| Accounts | Explicit save per account; password reset is a separate immediate action. |
| New tournament/group/team/player/account | Create/Add commits that form. Failed requests retain the input. |
| Fixture generation | Generation options apply on Generate. Existing settings-save-before-generation behavior is retained; those are explicitly separate commits. Dirty schedules still block generation. |
| Live score/status/events | Immediate acknowledged commands with scoped pending/error handling. |
| Penalties / added time | Separate explicit actions. Penalty replacement uses a live revision so a stale score cannot overwrite intervening goals. |
| Leaving setup | The optional action explicitly says **Save tournament settings and match schedules**. It does not claim to save team/creation/generation inputs, and it does not leave while those remain dirty. |

Setup dirty detection covers settings, schedule/team edits, new group/team/roster inputs and generation options. Account, tournament creation and live-console routes now use the unsaved-change guard and `beforeunload` warning. Live match switching and password-reset context switching ask before dropping unfinished inputs. Form controls are disabled while relevant requests are pending, and immediate live/structural commands reject overlapping clicks.

HTTP failure messages retain drafts and surface server conflict reasons. Settings, add-match and copy-round distinguish a known successful write from a subsequent reload failure. The shared confirmation handler no longer intercepts Enter to force Save/Discard/Delete: Enter follows the focused native button. This is a targeted navigation-safety correction, not a full accessible-dialog rewrite.

**Regression evidence:** navigation cancel/unload tests include unfinished roster inputs; every administration route has a guard. Tests exercise account-save failure, failed group creation, live penalty conflicts, blocked overlapping live clicks, protected match switching, settings save scope and confirmation Enter behavior. Existing generation/visibility preservation tests now edit the real local draft rather than a server object.

**Limits:** new explanatory/conflict text is currently English, including when the established interface language is Danish. Native browser confirmation, focus trapping, screen-reader behavior and real-device unload prompts were not exercised. Some failures after an already acknowledged structural action still use the generic error text; a reload preserves other drafts and shows the authoritative result. No cross-form transaction is claimed for leaving the page or saving settings before generation.

## S04 - Atomic writes, retry receipts and notification isolation

**Root cause:** bulk-save and copy-round were sequences of independent requests. Earlier writes could commit before a later failure; retrying creation could duplicate records. Broadcasting was part of the apparent request-success boundary.

**Implementation:**

1. `PUT /api/admin/tournaments/{id}/matches/bulk` accepts `{ matches: [{ id, revision, changes }] }`. It rejects duplicate IDs and batches outside 1-500 records, validates every expected revision, then applies every item in one transaction. Any invalid item rolls the whole batch back. The response is the complete `MatchDto[]` contract.
2. `POST /api/admin/tournaments/{id}/rounds/copy` accepts `{ sourceRound, targetRound }`. It copies the **saved** group-stage round in one transaction and rejects an occupied target. It retains existing kickoff/pitch semantics; collision detection and time shifting are not added silently.
3. `EditingCommands` wraps JSON administration/live mutation endpoints in a SQLite write transaction. Application services join that transaction through `BeginWriteAsync`; direct service calls retain ownership of their own existing transactions. This also places finalization and its existing progression writes in a single HTTP transaction without changing qualification/progression rules.
4. An optional `Idempotency-Key` identifies a command for its authenticated actor. The server stores the request hash, status and complete response in `CommandReceipts` in the same transaction. A repeat returns the saved response, even if the original acknowledgement was lost. Reusing the key for a different method/path/body returns 409. Failed commands do not create a success receipt. Authorization still runs before replay.
5. The frontend interceptor supplies operation IDs for administration/live JSON writes. It retains an ID after ambiguous transport/server failure and clears it after acknowledgement or a definite 4xx rejection. There is no automatic write retry. Copy target, add-match payload and group ordering are retained across an ambiguous failure so a reconnect cannot accidentally turn Retry into a different creation request.
6. `PendingNotifications` queues live payloads during the command. After a successful commit/HTTP response, it attempts delivery. Delivery exceptions are logged and cannot roll back committed data or produce a failure response that encourages duplicate increments. Transaction rollback also discards queued notifications.

**Migration:** additive `20261113000000_CommandReceipts` creates only the receipt table and primary key. Existing entity fields are not backfilled or changed; revisions are computed, not migrated. The model snapshot matches the runtime model. The upgrade regression first migrates an isolated SQLite database to the previous migration, inserts synthetic custom tournament content, upgrades, and verifies that content is byte-for-byte unchanged, the new migration is recorded, and the receipt table exists. No destructive migration was run. Existing application databases and the pre-existing local API process were not migrated/restarted; validation uses isolated test hosts, not the running development instance.

**Regression evidence:** a batch with a valid first item and invalid second item persists neither change and no receipt; a valid batch replays exactly and a new stale batch fails. Copy replay through a new HTTP client creates no duplicate round, including with an injected throwing broadcaster. An occupied target rejects a different copy operation. Group creation and goal events replay without duplication; key/payload mismatch is rejected. Frontend tests verify operation-key retention and a copy retry after reconnect discovers the committed target round.

**Limits:** receipts have no pruning/retention policy yet and contain response DTOs. They must not be arbitrarily deleted while retries are expected. Client pending operation IDs are memory-only, so after browser/process loss the user must inspect server state before repeating an action; callers must reuse the same key and payload for replay. Legacy callers that omit the key do not gain generic retry deduplication. Notifications are best-effort after commit, not a durable outbox: process loss or delivery failure can leave subscribers stale until reload/reconnect. There is no notification retry worker. Uploads are outside the JSON command transaction. Large bulk operations still rebuild read models per item; sustained load and the 500-item limit were not performance-tested.

## S05 - SQLite concurrency and conflict handling

**Root cause:** replacement forms had no expected version. Simultaneous read/modify/write score adjustments could read the same score and lose an increment.

**Implementation:** `EditRevision.For` hashes persisted scalar editing state into an opaque revision. Settings, teams, players, accounts and match DTOs expose it; their replacement request contracts accept `revision`. The HTTP boundary rejects a missing or stale revision with HTTP 409 and an explanation directing the user to reload/review the preserved draft. The check and subsequent update run inside the same SQLite write transaction, preventing a second writer from changing the checked row between comparison and commit. This is application-managed optimistic validation using SQLite serialization, not an EF `rowversion` column.

Match schedule revisions deliberately exclude scores, clocks and event state. A live goal therefore does not invalidate a schedule-only edit, and that schedule endpoint never replaces the score. `MatchDto.liveRevision` covers the raw live match state for full score/penalty replacement. Login timestamps and password hashes do not invalidate unrelated account metadata drafts. Immediate commands such as score deltas, status changes and group assignment remain commands rather than stale replacement forms. Concurrent deltas/events execute in serialized transactions, and operation IDs protect retries.

**Compatibility:** replacement clients must echo the returned revision. `PUT /api/admin/tournaments/{id}` now returns `TournamentSummaryDto` rather than a slug string so the caller can acknowledge its precise saved revision; tournament creation still returns the slug. Angular consumers, typed .NET contracts, existing HTTP test clients and the affected local PowerShell user/score scripts are updated. The scripts were updated but **not executed** against any existing data. Old cached frontends/third-party callers without revisions will receive 409 and require updating; there is no unversioned replacement bypass.

**Regression evidence:** two independently authenticated HTTP clients attempt stale tournament, team, player and match updates; the first succeeds and stale/missing revisions fail without overwriting it. A separate stale account test preserves the newer security change. Eight simultaneous score increments from two sessions all persist; replaying one does not add a ninth. A retried goal event is recorded once. A schedule edit remains valid after those goals, while stale full-score replacement is rejected. Frontend tests prove explicit conflict review and keeping/discarding drafts.

**Limits:** versions describe content, not an ordered audit/history sequence; identical restored content has the same version. HTTP is the concurrency boundary: future background jobs/direct service callers must use equivalent transaction/revision checks. There is no cross-tab refresh-token coordination, global event ordering, cross-tournament ownership model or extended SQLite contention benchmark. Phase 1 session revocation remains active.

## Validation results

| Check | Result |
|---|---|
| Complete backend suite: `dotnet test LigaCup.Domain.Tests -c Release --no-restore --disable-build-servers -m:1 --logger 'console;verbosity=minimal'` | **80 passed, 0 failed, 0 skipped**: all 73 Phase 1/baseline cases plus seven Phase 2 cases. |
| Complete frontend suite: `npm test` in `ligacup-web` | **31 passed, 0 failed, 0 skipped**: all 18 Phase 1/baseline cases plus 13 Phase 2 cases. |
| API production build: `dotnet build LigaCup.API/LigaCup.API.csproj -c Release --no-restore --disable-build-servers -m:1` | **Passed; 0 warnings, 0 errors.** |
| Frontend production build: `npm run build` in `ligacup-web` | **Passed.** Initial bundle approximately 476.15 kB; estimated transfer 124.51 kB. |
| Migration/model validation | Synthetic prior-schema upgrade preserved existing content; migration/table present; `HasPendingModelChanges()` false. |
| Whitespace | `git diff --check` passed. |

The sandboxed backend test host initially could not establish its IPC connection and timed out. Running the isolated test host with the required execution permissions succeeded. No failing application assertion remains. Intermediate frontend failures identified obsolete server-object assumptions in the existing test harness and a test-mock typo; those were corrected, retaining the original behavioral assertions. Builds use separate Release output without stopping the user's existing API/Visual Studio session.

The Phase 1 eight-finding regressions remain passing: narrow group writes preserve metadata/points; complete match DTOs; delayed safe rich-editor initialization; server/client sanitizers; session revocation; relationship validation; FTP TLS configuration; repeated-status clock idempotence. No package/dependency upgrade was made in Phase 2. The 32 previously documented npm advisories remain a follow-up risk; this phase did not rerun a network advisory scan or fix that dependency tree.

Not verified: real browser/device interaction, a physical network disconnect after commit, process-kill recovery, existing local/production database migration, production data, deployment/FTP, sustained load, all possible command interleavings or public structural-change convergence. Notification failure was injected in the real HTTP pipeline; transport/reconnect cases use frontend mocks. F01-F05 competition issues, full S06 spectator synchronization, publication/ownership controls and operational backup/restore concerns remain outside this phase.

## Changed files since Phase 1

The following list excludes ignored build outputs and unchanged Phase 1 files. The original audit and Phase 1 report are unchanged.

**35 files** (24 modified, 11 added). Paths are relative to `C:\Repos\LigaCup`.

| File | Change |
|---|---|
| `LigaCup.API/Endpoints/EditingCommands.cs` | Added |
| `LigaCup.API/Endpoints/PendingNotifications.cs` | Added |
| `LigaCup.API/Endpoints/TournamentEndpoints.cs` | Modified |
| `LigaCup.API/Hubs/LiveHub.cs` | Modified |
| `LigaCup.API/Program.cs` | Modified |
| `LigaCup.ApplicationService/Contracts/Contracts.cs` | Modified |
| `LigaCup.ApplicationService/Mapping/DtoMapper.cs` | Modified |
| `LigaCup.ApplicationService/Security/UserService.cs` | Modified |
| `LigaCup.ApplicationService/Services/MatchService.cs` | Modified |
| `LigaCup.ApplicationService/Services/TournamentService.cs` | Modified |
| `LigaCup.Domain.Tests/Phase1ApiTests.cs` | Modified |
| `LigaCup.Domain.Tests/Phase2ApiTests.cs` | Added |
| `LigaCup.Domain/Entities/CommandReceipt.cs` | Added |
| `LigaCup.Domain/Entities/EditRevision.cs` | Added |
| `LigaCup.Domain/Entities/Entities.cs` | Modified |
| `LigaCup.Infrastructure/LigaCupContext.cs` | Modified |
| `LigaCup.Infrastructure/Migrations/20261113000000_CommandReceipts.cs` | Added |
| `LigaCup.Infrastructure/Migrations/LigaCupContextModelSnapshot.cs` | Modified |
| `LigaCup.Infrastructure/WriteTransaction.cs` | Added |
| `docs/reviews/ligacup-stabilization-phase2.md` | Added |
| `ligacup-web/src/app/app.config.ts` | Modified |
| `ligacup-web/src/app/app.routes.ts` | Modified |
| `ligacup-web/src/app/core/api.service.ts` | Modified |
| `ligacup-web/src/app/core/command-retry.ts` | Added |
| `ligacup-web/src/app/core/edit-drafts.ts` | Added |
| `ligacup-web/src/app/core/models.ts` | Modified |
| `ligacup-web/src/app/pages/admin/admin-home.ts` | Modified |
| `ligacup-web/src/app/pages/admin/admin-setup.ts` | Modified |
| `ligacup-web/src/app/pages/admin/admin-users.ts` | Modified |
| `ligacup-web/src/app/pages/admin/live-console.ts` | Modified |
| `ligacup-web/src/app/shared/confirm-dialog.ts` | Modified |
| `ligacup-web/tests/phase2.test.ts` | Added |
| `ligacup-web/tests/scheduling.test.ts` | Modified |
| `scripts/seed-demo-data.ps1` | Modified |
| `scripts/user-test.ps1` | Modified |

## Review boundary

No production access or production data changes. No existing tournament records were repaired or rewritten. No destructive migration, staging, commit, push, merge or deployment was performed. The new additive migration was validated only on synthetic isolated databases. Implementation stops here for review; no next-phase work has started.
