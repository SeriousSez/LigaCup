# LigaCup Copilot Instructions

## Repository shape

- Backend projects target .NET 10 and use ASP.NET Core minimal APIs, EF Core, and SQLite.
- The Angular client lives in `ligacup-web/` and uses standalone components, signals, and inline component templates/styles.
- The development database is `LigaCup.API/App_Data/ligacup.dev.db`.
- The API development URL is `http://localhost:5099` when `ASPNETCORE_ENVIRONMENT=Development` is set.

## Database and migrations

- Any entity or EF model change must include a migration in `LigaCup.Infrastructure/Migrations/`.
- Prefer `dotnet ef migrations add <Name> --project LigaCup.Infrastructure/LigaCup.Infrastructure.csproj --startup-project LigaCup.API/LigaCup.API.csproj` when `dotnet-ef` is available.
- If `dotnet-ef` is unavailable, a manually created migration must still have an explicit `[Migration("<migration-id>")]` attribute and match the existing namespace/style.
- Never assume `Database.MigrateAsync()` ran successfully. Verify the active SQLite file with `PRAGMA table_info(Tournaments)` and `__EFMigrationsHistory` when diagnosing `no such column` errors.
- After schema changes, restart the actual `LigaCup.API` process before testing. A running API can keep old binaries locked and can continue serving an old schema/session.
- Do not repair or alter tournament data as part of a feature unless explicitly requested. A direct local SQLite repair is acceptable only to recover a development database from a migration that was already intended and committed.
- `BreakDurationMinutes` means the break between periods inside a match. A pause between separate matches requires a separate setting such as `MatchIntervalMinutes`.

## Tournament defaults and rules

- The supplied U9 tournament document describes a single League/round-robin format, 1x10-minute matches, a 5-minute pause between matches, and a match clock that may still be enabled.
- New-tournament defaults should match the document where appropriate: League format, one 10-minute period, 5-minute match interval, and enabled clock.
- Keep the editable tournament rules content separate from structured tournament fields such as date/time, format, and schedule.
- The shared default rules are in `ligacup-web/src/app/core/default-rules.ts`. Existing custom rules must never be overwritten by defaults.
- Tournament date/time is stored as `TournamentDateUtc` and is edited with the custom date/time picker, not a visible season input. The backend season is derived from the selected date for UI-created tournaments.

## Angular UI conventions

- Check the current file before editing. User formatters or manual changes are common in this repository; work with them and do not revert unrelated edits.
- Use the existing Font Awesome kit from `ligacup-web/src/index.html` for icons. Do not add another icon library for ordinary UI icons.
- Keep icon-only actions accessible with `aria-label` and `title` tooltips.
- The global guide lives in `ligacup-web/src/app/shared/admin-guide.ts` and is rendered once from `app.ts`. Do not add duplicate guide launchers to individual pages.
- Guide steps that target tab content must first activate the relevant tab; never spotlight a hidden element. Wait/retry target measurement after route navigation and async page rendering.
- The guide backdrop must not close the guide. The explicit close button owns dismissal.

## Rich-text editor

- The tournament rules editor is a `contenteditable` surface, not a two-way `[innerHTML]` binding. Do not bind `[innerHTML]` while the user is typing because it resets the caret and selection.
- Toolbar commands must preserve the browser selection. Prevent toolbar mouse-down focus loss, save the current range, restore it before `document.execCommand`, and synchronize the resulting HTML.
- Keep the rules RTE inside the intended default-settings collapse when requested, and preserve the visible parent Rules card header.
- Sanitize or constrain any new HTML rendering path before exposing user-authored content publicly.

## Validation workflow

- From the repository root, build the API with `dotnet build LigaCup.API/LigaCup.API.csproj --no-restore`.
- Build the Angular client from `ligacup-web/` with `npm run build`, or from the root with `npm --prefix ligacup-web run build`.
- Run Angular tests with `npm test` from `ligacup-web/`; the existing test suite is the cheapest behavior check for frontend changes.
- On Windows PowerShell, use `;` rather than `&&` for command chaining.
- If a build reports locked DLLs, stop only the LigaCup API process with `Get-Process -Name LigaCup.API | Stop-Process -Force`, then rebuild. Do not kill unrelated VS Code or build-host processes.
- Validate the narrowest changed slice immediately after editing before broad exploration or unrelated refactoring.

## Scope discipline

- Prefer the smallest change that fixes the root behavior.
- Do not add tournament seed data, alter existing database records, or change unrelated formatting unless requested.
- Update relevant documentation/changelog files when a user-facing behavior change requires it.
