import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TournamentStore } from '../../core/tournament.store';
import { HeadingSkeleton, StandingsSkeleton } from '../../shared/loading-skeletons';
import { MatchCard } from '../../shared/match-card';
import { StandingsTable } from '../../shared/standings-table';

type Tab = 'tables' | 'fixtures' | 'bracket' | 'scorers' | 'rules';
type FixtureView = 'rounds' | 'all';

@Component({
  selector: 'app-tournament',
  imports: [DatePipe, RouterLink, StandingsTable, MatchCard, HeadingSkeleton, StandingsSkeleton],
  template: `
    @if (store.loading()) {
      <p class="sr-only" role="status">{{ t().common.loading }}</p>
      <app-heading-skeleton />
      <app-standings-skeleton [groups]="2" [rows]="4" />
    } @else if (store.error()) {
      <p class="error">{{ t().tournament.notFound }}</p>
    } @else if (detail(); as data) {
      <section class="spread heading" data-guide-target="tournament-header">
        <div>
          <h1>{{ data.tournament.name }}</h1>
          <p class="muted">
            {{ data.teams.length }} {{ t().common.teams }} &middot;
            {{ t().format[data.tournament.format] }}
            @if (data.tournament.tournamentDateUtc) {
              &middot; {{ data.tournament.tournamentDateUtc | date: 'd MMM yyyy HH:mm' : undefined : locale() }}
            }
          </p>
        </div>

        <div class="row">
          <span class="badge" data-guide-target="tournament-status" [class.connected]="store.connectionState() === 'connected'">
            @if (store.connectionState() === 'connected') {
              <span class="pulse"></span> {{ t().connection.live }}
            } @else {
              {{
                store.connectionState() === 'connecting'
                  ? t().connection.connecting
                  : t().connection.offline
              }}
            }
          </span>
          @if (auth.isLoggedIn()) {
            <a [routerLink]="['/admin', data.tournament.slug]">
              <button class="ghost" type="button">{{ t().tournament.setup }}</button>
            </a>
            <a class="live-console-link" [routerLink]="['/admin', data.tournament.slug, 'live']">
              {{ t().tournament.liveConsole }}
            </a>
          }
        </div>
      </section>

      @if (liveMatches().length) {
        <section class="stack live-strip">
          <h2>{{ t().tournament.playingNow }}</h2>
          <div class="grid-auto">
            @for (match of liveMatches(); track match.id) {
              <app-match-card [match]="match" [tournament]="data.tournament" />
            }
          </div>
        </section>
      }

      <nav class="tabs" data-guide-target="tournament-tabs">
        @for (option of tabs(); track option.id) {
          @if (option.id !== 'bracket' || data.bracket.length) {
            @if (option.id !== 'scorers' || data.tournament.trackPlayers) {
              <button
                type="button"
                [attr.data-guide-tab]="option.id"
                [class.active]="tab() === option.id"
                (click)="tab.set(option.id)"
              >
                {{ option.label }}
              </button>
            }
          }
        }
      </nav>

      @switch (tab()) {
        @case ('tables') {
          <div class="tables-grid" data-guide-target="tournament-table">
            @for (table of data.tables; track table.groupId) {
              <app-standings-table [table]="table" />
            } @empty {
              <p class="muted">{{ t().tournament.noTables }}</p>
            }
          </div>
        }
        @case ('fixtures') {
          <div class="stack" data-guide-target="tournament-fixtures">
            @if (data.matches.length) {
              <div class="fixture-view" role="group" [attr.aria-label]="t().tournament.fixtureViewLabel">
                <button
                  type="button"
                  [class.active]="fixtureView() === 'rounds'"
                  [attr.aria-pressed]="fixtureView() === 'rounds'"
                  (click)="fixtureView.set('rounds')"
                >
                  {{ t().tournament.byRounds }}
                </button>
                <button
                  type="button"
                  [class.active]="fixtureView() === 'all'"
                  [attr.aria-pressed]="fixtureView() === 'all'"
                  (click)="fixtureView.set('all')"
                >
                  {{ t().tournament.allMatches }}
                </button>
              </div>
            }

            @if (fixtureView() === 'rounds') {
              @for (round of fixtureRounds(); track round.key) {
                <section class="stack">
                  <h3>{{ round.key }}</h3>
                  @if (round.byeTeams.length) {
                    <p class="muted bye-team">
                      {{ t().tournament.bye }}: {{ round.byeTeams.join(', ') }}
                    </p>
                  }
                  <div class="grid-auto">
                    @for (match of round.matches; track match.id) {
                      <div data-guide-target="tournament-match">
                        <app-match-card [match]="match" [tournament]="data.tournament" />
                      </div>
                    }
                  </div>
                </section>
              } @empty {
                <p class="muted">{{ t().tournament.noFixtures }}</p>
              }
            } @else {
              <div class="grid-auto">
                @for (match of fixtureMatches(); track match.id) {
                  <div data-guide-target="tournament-match">
                    <app-match-card [match]="match" [tournament]="data.tournament" />
                  </div>
                } @empty {
                  <p class="muted">{{ t().tournament.noFixtures }}</p>
                }
              </div>
            }
          </div>
        }
        @case ('bracket') {
          <div class="bracket" data-guide-target="tournament-bracket">
            @for (stage of bracketStages(); track stage.key) {
              <section class="stage">
                <h3>{{ stage.key }}</h3>
                @for (item of stage.matches; track item.match.id) {
                  <div data-guide-target="tournament-match">
                    <app-match-card [match]="item.match" [tournament]="data.tournament" />
                  </div>
                }
              </section>
            }
          </div>
        }
        @case ('scorers') {
          <div class="card">
            <table>
              <thead>
                <tr>
                  <th class="numeric">#</th>
                  <th>{{ t().tournament.scorers.player }}</th>
                  <th>{{ t().tournament.scorers.team }}</th>
                  <th class="numeric">{{ t().tournament.scorers.goals }}</th>
                  <th class="numeric">{{ t().tournament.scorers.assists }}</th>
                </tr>
              </thead>
              <tbody>
                @for (scorer of data.topScorers; track scorer.playerId) {
                  <tr>
                    <td class="numeric">{{ $index + 1 }}</td>
                    <td>{{ scorer.playerName }}</td>
                    <td class="muted">{{ scorer.teamName }}</td>
                    <td class="numeric">{{ scorer.goals }}</td>
                    <td class="numeric">{{ scorer.assists }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="muted">{{ t().tournament.scorers.empty }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        @case ('rules') {
          <article class="card rules-page">
            <h2>{{ t().setup.rulesContent }}</h2>
            @if (data.rules; as rules) {
              <div class="rules-content" [innerHTML]="rules"></div>
            } @else {
              <p class="muted">{{ t().tournament.noRules }}</p>
            }
          </article>
        }
      }
    }
  `,
  styles: `
    .heading {
      margin-bottom: 1rem;
    }

    .heading p {
      margin: 0;
      font-size: 0.9rem;
    }

    .live-console-link {
      padding: 0.6rem 0.9rem;
      border: 1px solid var(--accent-strong);
      border-radius: 10px;
      background: var(--accent-strong);
      color: var(--pitch-900);
      font-weight: 600;
      text-decoration: none;
    }

    .live-strip {
      margin-bottom: 1.25rem;
    }

    .bye-team {
      margin: 0;
      font-size: 0.85rem;
    }

    .fixture-view {
      display: inline-flex;
      width: fit-content;
      padding: 0.2rem;
      border: 1px solid var(--surface-line);
      border-radius: 8px;
      background: var(--surface);
    }

    .fixture-view button {
      min-height: 2.25rem;
      padding: 0.4rem 0.75rem;
      border-color: transparent;
      background: transparent;
      color: var(--text-muted);
    }

    .fixture-view button.active {
      background: var(--surface-raised);
      color: var(--text);
      border-color: var(--accent);
    }

    /* Sticks under the site header so switching view never needs a scroll back up. */
    .tabs {
      display: flex;
      gap: 0.35rem;
      margin-bottom: 1rem;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      position: sticky;
      top: var(--header-h);
      z-index: 5;
      background: var(--pitch-900);
      padding-block: 0.5rem;
      margin-inline: calc(var(--gutter) * -1);
      padding-inline: var(--gutter);
    }

    .tabs::-webkit-scrollbar {
      display: none;
    }

    .tabs button {
      background: transparent;
      border-color: transparent;
      color: var(--text-muted);
      white-space: nowrap;
      flex: none;
      padding-inline: 0.75rem;
    }

    .tabs button.active {
      background: var(--surface-raised);
      border-color: var(--accent);
      color: var(--text);
    }

    .tables-grid {
      display: grid;
      gap: 0.75rem;
      grid-template-columns: repeat(auto-fit, minmax(min(520px, 100%), 1fr));
    }

    .bracket {
      display: grid;
      gap: 1.25rem;
    }

    .stage {
      display: grid;
      gap: 0.75rem;
      align-content: start;
    }

    .rules-page {
      display: grid;
      gap: 0.8rem;
    }

    .rules-page p {
      margin: 0;
      white-space: pre-wrap;
    }

    @media (min-width: 700px) {
      .heading {
        margin-bottom: 1.5rem;
      }

      .tables-grid {
        gap: 1rem;
      }

      /* Wide screens show the rounds side by side like a real bracket. */
      .bracket {
        display: flex;
        gap: 1rem;
        overflow-x: auto;
        padding-bottom: 0.5rem;
      }

      .stage {
        min-width: 280px;
      }
    }
  `,
})
export class Tournament implements OnInit {
  readonly slug = input.required<string>();

  protected readonly store = inject(TournamentStore);
  protected readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly locale = this.i18n.locale;
  protected readonly tab = signal<Tab>('tables');
  protected readonly fixtureView = signal<FixtureView>('rounds');

  protected readonly tabs = computed<{ id: Tab; label: string }[]>(() => {
    const labels = this.t().tournament.tabs;
    return [
      { id: 'tables', label: labels.tables },
      { id: 'fixtures', label: labels.fixtures },
      { id: 'bracket', label: labels.bracket },
      { id: 'scorers', label: labels.scorers },
      { id: 'rules', label: labels.rules },
    ];
  });

  protected readonly detail = this.store.detail;
  protected readonly liveMatches = this.store.liveMatches;

  protected readonly fixtureMatches = computed(() =>
    [...(this.detail()?.matches ?? [])].sort((left, right) => {
      if (left.kickoffUtc && right.kickoffUtc) {
        return left.kickoffUtc.localeCompare(right.kickoffUtc);
      }

      if (left.kickoffUtc) {
        return -1;
      }

      if (right.kickoffUtc) {
        return 1;
      }

      return left.round - right.round;
    }),
  );

  protected readonly fixtureRounds = computed(() => {
    const detail = this.detail();
    const matches = detail?.matches ?? [];
    const strings = this.t();
    const buckets = new Map<string, typeof matches>();
    const isLeague = detail?.tournament.format === 'League';

    for (const match of matches) {
      const key =
        match.stage === 'Group' && isLeague
          ? `${strings.tournament.matchday} ${match.round}`
          : match.stage === 'Group'
            ? `${match.groupName ?? strings.tournament.league} - ${strings.tournament.matchday} ${match.round}`
            : strings.stagePlural[match.stage];

      buckets.set(key, [...(buckets.get(key) ?? []), match]);
    }

    return [...buckets.entries()].map(([key, group]) => {
      const firstMatch = group[0];
      const eligibleTeams = firstMatch.stage === 'Group'
        ? detail?.teams.filter((team) => isLeague || team.groupId === firstMatch.groupId) ?? []
        : [];
      const playingTeamIds = new Set(group.flatMap((match) => [match.homeTeamId, match.awayTeamId]));

      return {
        key,
        byeTeams: eligibleTeams
          .filter((team) => !playingTeamIds.has(team.id))
          .map((team) => this.i18n.teamName(team.name, team.id)),
        matches: [...group].sort((left, right) => {
          if (!left.kickoffUtc && right.kickoffUtc) {
            return 1;
          }

          if (left.kickoffUtc && !right.kickoffUtc) {
            return -1;
          }

          return left.kickoffUtc && right.kickoffUtc
            ? left.kickoffUtc.localeCompare(right.kickoffUtc)
            : left.round - right.round;
        }),
      };
    });
  });

  protected readonly bracketStages = computed(() => {
    const bracket = this.detail()?.bracket ?? [];
    const strings = this.t();
    const buckets = new Map<string, typeof bracket>();

    // Grouped by stage rather than the server's English label so the heading follows the language.
    for (const item of bracket) {
      const key = strings.stagePlural[item.stage as keyof typeof strings.stagePlural] ?? item.stageName;
      buckets.set(key, [...(buckets.get(key) ?? []), item]);
    }

    return [...buckets.entries()].map(([key, matches]) => ({ key, matches }));
  });

  ngOnInit(): void {
    void this.store.load(this.slug());
  }
}
