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
            {{ data.tournament.season }} &middot; {{ data.teams.length }} {{ t().common.teams }}
            &middot; {{ t().format[data.tournament.format] }}
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
            <a [routerLink]="['/admin', data.tournament.slug, 'live']">
              <button type="button">{{ t().tournament.liveConsole }}</button>
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
            @for (round of fixtureRounds(); track round.key) {
              <section class="stack">
                <h3>{{ round.key }}</h3>
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

    .live-strip {
      margin-bottom: 1.25rem;
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

  protected readonly fixtureRounds = computed(() => {
    const matches = this.detail()?.matches ?? [];
    const strings = this.t();
    const buckets = new Map<string, typeof matches>();

    for (const match of matches) {
      const key =
        match.stage === 'Group'
          ? `${match.groupName ?? strings.tournament.league} - ${strings.tournament.matchday} ${match.round}`
          : strings.stagePlural[match.stage];

      buckets.set(key, [...(buckets.get(key) ?? []), match]);
    }

    return [...buckets.entries()].map(([key, group]) => ({ key, matches: group }));
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
