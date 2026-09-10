# Liga Cup

A live tournament site for the Liga Cup. The organiser updates scores from a phone during matches, and every group table, knockout bracket and top scorer list on the public site updates itself instantly.

- Backend: ASP.NET Core 10 minimal APIs, EF Core, SignalR
- Frontend: Angular 21 standalone components with signals
- Database: a SQLite file that survives deploys

## How it is put together

| Project                      | What lives there                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `LigaCup.Domain`             | Entities, plus the standings calculator and fixture generator. Pure logic with no dependencies, so it is fully unit tested. |
| `LigaCup.Infrastructure`     | EF Core context, migrations and the database provider configuration.                                                        |
| `LigaCup.ApplicationService` | Services, DTOs, JWT auth and password hashing.                                                                              |
| `LigaCup.API`                | Minimal API endpoints and the SignalR hub.                                                                                  |
| `LigaCup.Domain.Tests`       | xUnit tests for the football rules.                                                                                         |
| `ligacup-web`                | The Angular client.                                                                                                         |

## Running it locally

Start the API:

```powershell
cd LigaCup.API
dotnet run
```

It listens on `http://localhost:5099` and creates `App_Data/ligacup.dev.db` on first run. The administrator username and email come from `appsettings.Development.json`, and the password is read from .NET user secrets so it never lands in the repository. Set it once with:

```powershell
dotnet user-secrets set "Admin:Password" "<your password>" --project LigaCup.API
```

That file also holds a fixed token signing key so restarting the API does not sign you out. Everything in it is a local development value that production never loads.

## Language

The site is in Danish by default. A DA/EN button in the header switches language instantly and the choice is remembered in local storage. Translations live in [ligacup-web/src/app/core/i18n/strings.ts](ligacup-web/src/app/core/i18n/strings.ts), where the `Strings` interface forces both languages to stay in step: miss a key in one and the build fails.

Start the frontend in a second terminal:

```powershell
cd ligacup-web
npm start
```

Then open `http://localhost:4200`.

Run the tests:

```powershell
dotnet test LigaCup.Domain.Tests
```

There is also an end to end check that drives the real API through a full tournament. Start the API first, then:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\smoke-test.ps1
```

## Tournament rules

Everything about the format is configurable per tournament from the setup screen.

- **Format**: group stage only, groups followed by a knockout bracket, or straight knockout.
- **Points**: the values for a win, a draw and a loss are all editable, so three points for a win is a default rather than a rule.
- **Group rounds**: play each pairing once, twice or more. Home advantage flips on every return leg.
- **Tiebreakers**: an ordered list applied after points. Goal difference, goals scored, fewest conceded, most wins, head to head points, head to head goal difference, head to head goals scored, fewest disciplinary points and alphabetical. Head to head rules are worked out as a mini league between only the teams that are still level, which is how the real competitions do it.
- **Points adjustments**: an organiser can deduct or award points to a team, for example after a forfeit.
- **Players**: optional. Leave player tracking switched off and the app runs as a lightweight teams and scores tool. Switch it on and you get squads, a goalscorer feed and a top scorer table.

Group fixtures are generated with the circle method, so every team plays every other team and an odd number of teams gives each team exactly one bye. The knockout bracket is created up front with placeholders such as `Winner QF1`, and those resolve into real teams the moment a tie finishes. Level knockout ties are decided on the penalty shootout score.

## Live updates

The API owns every calculation. When a score changes, the server recomputes the tables, bracket and scorer list and pushes the whole lot down the SignalR hub at `/hubs/live`. Clients join a group per tournament, so a busy match only sends data to the people actually watching it. The frontend patches its cached state from that message, meaning no polling and no recalculation in the browser.

The match clock is derived from the stored kickoff timestamp rather than counted in the browser, so every viewer sees the same minute.

## Deploying to Simply.com

The workflow in `.github/workflows/deploy-to-simply.yml` publishes a self contained `win-x64` build and uploads it over FTP. The Angular app is built separately and deployed to its own directory.

### Keeping the database safe

This is the part that matters most. The SQLite file lives in `App_Data` next to the application, and three things stop a deploy from destroying it:

1. The FTP step excludes `**/App_Data/**`, `**/*.db`, `**/*.db-shm` and `**/*.db-wal`, so the live database is never overwritten.
2. `dangerous-clean-slate` is set to `false`, so the deploy never wipes the remote directory first.
3. A build step deletes any stray `.db` file from the publish output before it is uploaded, in case one is ever produced by accident.

`web.config` also blocks `App_Data` and the `.db` extensions from being served over HTTP, so the database cannot be downloaded.

`DatabaseConfiguration` probes for a writable location and prefers an existing database file, which means the app keeps running even if the hosting account restricts writes to the application directory.

Take a copy of the file over FTP before a tournament if you want a backup. It is a single file.

### Secrets and variables to configure

In the repository settings, add these secrets:

| Secret                                       | Purpose                                            |
| -------------------------------------------- | -------------------------------------------------- |
| `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` | Simply.com FTP credentials.                        |
| `JWT_KEY`                                    | Signing key for tokens, at least 32 characters.    |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_EMAIL` | Creates the administrator account if it is missing. An existing account is never modified, so changing the password later is safe. |

And one variable:

| Variable     | Purpose                                            |
| ------------ | -------------------------------------------------- |
| `WEB_ORIGIN` | The public site URL, used for the CORS allow list. |

The API refuses to start in production without a valid `JWT_KEY`, and will not create an administrator without a password, so a misconfigured deploy fails loudly instead of coming up insecure.

### Before the first deploy

Update `ligacup-web/src/environments/environment.production.ts` with the real API URL, and adjust `API_SERVER_DIR` and `WEB_SERVER_DIR` in the workflow to match the directories on the hosting account.

## Switching to MySQL later

The provider seam is already in place. `Database:Provider` in configuration selects the provider, and `DatabaseConfiguration.Configure` is the single place that decides which one to use.

The MySQL package is deliberately not referenced yet. Pomelo, the provider used by the other projects, has no EF Core 10 release at the moment, and pinning the whole solution back to EF Core 9 to get it would be a poor trade for a tournament app. When Pomelo ships EF Core 10 support, add the package, add a `UseMySql` branch in `DatabaseConfiguration.Configure`, and set `Database:Provider` to `MySql`. Nothing else needs to change.
