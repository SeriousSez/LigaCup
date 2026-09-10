import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TournamentStore } from '../../core/tournament.store';
import { MatchCard } from '../../shared/match-card';
import { StandingsTable } from '../../shared/standings-table';

type Tab = 'tables' | 'fixtures' | 'bracket' | 'scorers';

@Component({
  selector: 'app-tournament',
  imports: [RouterLink, StandingsTable, MatchCard],
  template: `
    @if (store.loading()) {
      <p class="muted">Loading...</p>
    } @else if (store.error()) {
      <p class="error">{{ store.error() }}</p>
    } @else if (detail(); as data) {
      <section class="spread heading">
        <div>
          <h1>{{ data.tournament.name }}</h1>
          <p class="muted">
            {{ data.tournament.season }} &middot; {{ data.teams.length }} teams &middot;
            {{ formatLabel(data.tournament.format) }}
          </p>
        </div>

        <div class="row">
          <span class="badge" [class.connected]="store.connectionState() === 'connected'">
            @if (store.connectionState() === 'connected') {
              <span class="pulse"></span> Live
            } @else {
              {{ store.connectionState() === 'connecting' ? 'Connecting' : 'Offline' }}
            }
          </span>
          @if (auth.isLoggedIn()) {
            <a [routerLink]="['/admin', data.tournament.slug, 'live']">
              <button type="button">Live console</button>
            </a>
          }
        </div>
      </section>

      @if (liveMatches().length) {
        <section class="stack live-strip">
          <h2>Playing now</h2>
          <div class="grid-auto">
            @for (match of liveMatches(); track match.id) {
              <app-match-card [match]="match" />
            }
          </div>
        </section>
      }

      <nav class="tabs">
        @for (option of tabs; track option.id) {
          @if (option.id !== 'bracket' || data.bracket.length) {
            @if (option.id !== 'scorers' || data.tournament.trackPlayers) {
              <button
                type="button"
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
          <div class="tables-grid">
            @for (table of data.tables; track table.groupId) {
              <app-standings-table [table]="table" />
            } @empty {
              <p class="muted">No group tables yet. Add teams and generate the fixtures.</p>
            }
          </div>
        }
        @case ('fixtures') {
          <div class="stack">
            @for (round of fixtureRounds(); track round.key) {
              <section class="stack">
                <h3>{{ round.key }}</h3>
                <div class="grid-auto">
                  @for (match of round.matches; track match.id) {
                    <app-match-card [match]="match" />
                  }
                </div>
              </section>
            } @empty {
              <p class="muted">No fixtures have been generated yet.</p>
            }
          </div>
        }
        @case ('bracket') {
          <div class="bracket">
            @for (stage of bracketStages(); track stage.key) {
              <section class="stage">
                <h3>{{ stage.key }}</h3>
                @for (item of stage.matches; track item.match.id) {
                  <app-match-card [match]="item.match" />
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
                  <th>Player</th>
                  <th>Team</th>
                  <th class="numeric">Goals</th>
                  <th class="numeric">Assists</th>
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
                    <td colspan="5" class="muted">No goals recorded yet.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    }
  `,
  styles: `
    .heading {
      margin-bottom: 1.5rem;
    }

    .heading p {
      margin: 0;
    }

    .live-strip {
      margin-bottom: 1.75rem;
    }

    .tabs {
      display: flex;
      gap: 0.4rem;
      margin-bottom: 1.25rem;
      overflow-x: auto;
      padding-bottom: 0.25rem;
    }

    .tabs button {
      background: transparent;
      border-color: transparent;
      color: var(--text-muted);
    }

    .tabs button.active {
      background: var(--surface-raised);
      border-color: var(--accent);
      color: var(--text);
    }

    .tables-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(520px, 1fr));
    }

    @media (max-width: 560px) {
      .tables-grid {
        grid-template-columns: 1fr;
      }
    }

    .bracket {
      display: flex;
      gap: 1rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
    }

    .stage {
      min-width: 280px;
      display: grid;
      gap: 0.75rem;
      align-content: start;
    }
  `,
})
export class Tournament implements OnInit {
  readonly slug = input.required<string>();

  protected readonly store = inject(TournamentStore);
  protected readonly auth = inject(AuthService);
  protected readonly tab = signal<Tab>('tables');

  protected readonly tabs: { id: Tab; label: string }[] = [
    { id: 'tables', label: 'Tables' },
    { id: 'fixtures', label: 'Fixtures & results' },
    { id: 'bracket', label: 'Knockout' },
    { id: 'scorers', label: 'Top scorers' },
  ];

  protected readonly detail = this.store.detail;
  protected readonly liveMatches = this.store.liveMatches;

  protected readonly fixtureRounds = computed(() => {
    const matches = this.detail()?.matches ?? [];
    const buckets = new Map<string, typeof matches>();

    for (const match of matches) {
      const key =
        match.stage === 'Group'
          ? `${match.groupName ?? 'League'} - matchday ${match.round}`
          : this.stageLabel(match.stage);

      buckets.set(key, [...(buckets.get(key) ?? []), match]);
    }

    return [...buckets.entries()].map(([key, group]) => ({ key, matches: group }));
  });

  protected readonly bracketStages = computed(() => {
    const bracket = this.detail()?.bracket ?? [];
    const buckets = new Map<string, typeof bracket>();

    for (const item of bracket) {
      buckets.set(item.stageName, [...(buckets.get(item.stageName) ?? []), item]);
    }

    return [...buckets.entries()].map(([key, matches]) => ({ key, matches }));
  });

  ngOnInit(): void {
    void this.store.load(this.slug());
  }

  formatLabel(format: string): string {
    const labels: Record<string, string> = {
      GroupsOnly: 'Group stage only',
      GroupsThenKnockout: 'Groups then knockout',
      KnockoutOnly: 'Straight knockout',
    };

    return labels[format] ?? format;
  }

  private stageLabel(stage: string): string {
    const labels: Record<string, string> = {
      RoundOf32: 'Round of 32',
      RoundOf16: 'Round of 16',
      QuarterFinal: 'Quarter-finals',
      SemiFinal: 'Semi-finals',
      ThirdPlacePlayOff: 'Third place play-off',
      Final: 'Final',
    };

    return labels[stage] ?? stage;
  }
}
