import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faLocationDot } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { mapsUrl } from '../../core/maps';
import { MatchClockService } from '../../core/match-clock.service';
import { TournamentStore } from '../../core/tournament.store';
import { HeadingSkeleton } from '../../shared/loading-skeletons';

@Component({
  selector: 'app-match-detail',
  imports: [DatePipe, RouterLink, FontAwesomeModule, HeadingSkeleton],
  template: `
    @if (store.loading()) {
      <p class="sr-only" role="status">{{ t().common.loading }}</p>
      <app-heading-skeleton />
    } @else if (store.error()) {
      <p class="error">{{ t().tournament.notFound }}</p>
    } @else if (detail(); as data) {
      @if (match(); as currentMatch) {
        <div class="page-actions">
          <a class="back-link" [routerLink]="['/', data.tournament.slug]">
            <fa-icon [icon]="faArrowLeft" aria-hidden="true" />
            {{ t().matchPage.back }}
          </a>
          @if (auth.isLoggedIn()) {
            <a
              class="live-console-link"
              [routerLink]="['/admin', data.tournament.slug, 'live']"
              [queryParams]="{ match: currentMatch.id }"
            >
              {{ t().tournament.liveConsole }}
            </a>
          }
        </div>

        <header class="match-header" data-guide-target="match-scoreboard">
          <div class="competition">
            <span>{{ data.tournament.name }}</span>
            <span aria-hidden="true">&middot;</span>
            <span>{{ stageLabel() }}</span>
          </div>

          <div class="scoreboard">
            <div class="team">
              @if (currentMatch.homeTeamLogoUrl) {
                <img [src]="currentMatch.homeTeamLogoUrl" [alt]="homeName()" />
              }
              <h1>{{ homeName() }}</h1>
            </div>

            <div class="result">
              <strong>{{ currentMatch.homeScore }}&ndash;{{ currentMatch.awayScore }}</strong>
              @if (isLive()) {
                <span class="badge live"><span class="pulse"></span> {{ minuteLabel() }}</span>
              } @else if (currentMatch.status === 'HalfTime') {
                <span class="badge">{{ breakLabel() }}</span>
              } @else {
                <span class="badge">{{ t().matchStatus[currentMatch.status] }}</span>
              }
              @if (currentMatch.homePenalties !== null && currentMatch.awayPenalties !== null) {
                <small>
                  {{ t().matchCard.penalties }}
                  {{ currentMatch.homePenalties }}&ndash;{{ currentMatch.awayPenalties }}
                </small>
              }
            </div>

            <div class="team away">
              @if (currentMatch.awayTeamLogoUrl) {
                <img [src]="currentMatch.awayTeamLogoUrl" [alt]="awayName()" />
              }
              <h1>{{ awayName() }}</h1>
            </div>
          </div>
        </header>

        <div class="content-grid">
          <section class="card stack" data-guide-target="match-events">
            <h2>{{ t().matchPage.events }}</h2>
            @if (currentMatch.events.length) {
              <ol class="timeline">
                @for (event of currentMatch.events; track event.id) {
                  <li>
                    <span class="minute">{{ event.minute }}'</span>
                    <div>
                      <strong>{{ t().eventType[event.type] }}</strong>
                      <p>{{ event.playerName ?? event.teamName }}</p>
                      @if (event.playerName) {
                        <small>{{ event.teamName }}</small>
                      }
                      @if (event.note) {
                        <small>{{ event.note }}</small>
                      }
                    </div>
                  </li>
                }
              </ol>
            } @else {
              <p class="muted empty">{{ t().matchPage.noEvents }}</p>
            }
          </section>

          <aside class="card stack details" data-guide-target="match-details">
            <h2>{{ t().matchPage.details }}</h2>
            @if (currentMatch.kickoffUtc) {
              <div>
                <span>{{ t().matchPage.kickoff }}</span>
                <strong>{{ currentMatch.kickoffUtc | date: 'EEEE d MMMM, HH:mm' : undefined : locale() }}</strong>
              </div>
            }
            @if (currentMatch.pitchNumber) {
              <div>
                <span>{{ t().matchCard.pitch }}</span>
                <strong>{{ currentMatch.pitchNumber }}</strong>
              </div>
            }
            @if (currentMatch.venue ?? data.tournament.location; as location) {
              <div>
                <span>{{ t().matchPage.venue }}</span>
                <a
                  class="venue-link"
                  [href]="mapsUrl(location)"
                  target="_blank"
                  rel="noopener noreferrer"
                  [attr.aria-label]="mapsLabel(location)"
                >
                  <fa-icon [icon]="faLocationDot" aria-hidden="true" />
                  <strong>{{ location }}</strong>
                </a>
              </div>
            }
            @if (currentMatch.notes) {
              <div>
                <span>{{ t().matchPage.notes }}</span>
                <strong>{{ currentMatch.notes }}</strong>
              </div>
            }
          </aside>
        </div>
      } @else {
        <p class="error">{{ t().matchPage.notFound }}</p>
      }
    }
  `,
  styles: `
    .page-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
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

    .match-header {
      padding: 1.5rem 0 2rem;
      border-bottom: 1px solid var(--surface-line);
      margin-bottom: 1.5rem;
    }

    .competition {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
      color: var(--text-muted);
      font-size: 0.85rem;
      margin-bottom: 1.5rem;
    }

    .scoreboard {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
      align-items: center;
      gap: clamp(0.75rem, 4vw, 3rem);
      max-width: 850px;
      margin-inline: auto;
    }

    .team {
      display: grid;
      justify-items: end;
      gap: 0.75rem;
      text-align: right;
    }

    .team.away {
      justify-items: start;
      text-align: left;
    }

    .team img {
      width: 72px;
      height: 72px;
      object-fit: contain;
    }

    .team h1 {
      margin: 0;
      font-size: clamp(1rem, 4vw, 1.75rem);
      overflow-wrap: anywhere;
    }

    .result {
      display: grid;
      justify-items: center;
      gap: 0.6rem;
      text-align: center;
    }

    .result > strong {
      font-size: clamp(2rem, 8vw, 4rem);
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }

    .result small {
      color: var(--text-muted);
    }

    .content-grid {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(240px, 1fr);
      gap: 1rem;
      align-items: start;
    }

    .timeline {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .timeline li {
      display: grid;
      grid-template-columns: 3rem 1fr;
      gap: 0.75rem;
      padding: 0.85rem 0;
      border-bottom: 1px solid var(--surface-line);
    }

    .timeline li:last-child {
      border-bottom: 0;
    }

    .timeline p,
    .timeline small,
    .empty {
      margin: 0;
    }

    .timeline small {
      display: block;
      color: var(--text-muted);
    }

    .minute {
      color: var(--accent);
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .details > div {
      display: grid;
      gap: 0.15rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--surface-line);
    }

    .details > div:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }

    .details span {
      color: var(--text-muted);
      font-size: 0.8rem;
    }

    .venue-link {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      width: fit-content;
      color: inherit;
      text-decoration: none;
    }

    .venue-link:hover strong { text-decoration: underline; }
    .venue-link fa-icon { color: var(--accent); }

    @media (max-width: 699px) {
      .scoreboard {
        gap: 0.6rem;
      }

      .team img {
        width: 48px;
        height: 48px;
      }

      .content-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class MatchDetail implements OnInit {
  protected readonly faArrowLeft = faArrowLeft;
  protected readonly faLocationDot = faLocationDot;
  protected readonly mapsUrl = mapsUrl;
  readonly slug = input.required<string>();
  readonly matchId = input.required<string>();

  protected readonly store = inject(TournamentStore);
  protected readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly clock = inject(MatchClockService);
  protected readonly t = this.i18n.t;
  protected readonly locale = this.i18n.locale;
  protected readonly detail = this.store.detail;

  protected mapsLabel(address: string): string {
    return this.i18n.format(this.t().matchCard.openMaps, { address });
  }

  protected readonly match = computed(() => {
    const matchId = Number(this.matchId());
    return this.detail()?.matches.find((match) => match.id === matchId) ?? null;
  });

  protected readonly homeName = computed(() => {
    const match = this.match();
    return match ? this.i18n.teamName(match.homeTeamName, match.homeTeamId) : '';
  });

  protected readonly awayName = computed(() => {
    const match = this.match();
    return match ? this.i18n.teamName(match.awayTeamName, match.awayTeamId) : '';
  });

  protected readonly stageLabel = computed(() => {
    const match = this.match();
    const tournament = this.detail()?.tournament;
    if (!match || !tournament) {
      return '';
    }

    return match.stage === 'Group' && tournament.format === 'League'
      ? this.t().tournament.league
      : match.groupName ?? this.t().stage[match.stage];
  });

  protected readonly minuteLabel = computed(() => {
    const match = this.match();
    const tournament = this.detail()?.tournament;
    if (!match || !tournament) {
      return '';
    }

    return this.clock.label(match, tournament) || this.t().connection.live;
  });

  protected readonly breakLabel = computed(() => {
    const match = this.match();
    const tournament = this.detail()?.tournament;
    return match && tournament ? this.clock.breakLabel(match, tournament) : '';
  });

  ngOnInit(): void {
    void this.store.load(this.slug());
  }

  protected isLive(): boolean {
    const status = this.match()?.status;
    return status === 'Live' || status === 'Paused';
  }
}