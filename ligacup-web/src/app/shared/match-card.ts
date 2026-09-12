import { DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faLocationDot } from '@fortawesome/free-solid-svg-icons';
import { I18nService } from '../core/i18n/i18n.service';
import { mapsUrl } from '../core/maps';
import { MatchClockService } from '../core/match-clock.service';
import { Match, TournamentSummary } from '../core/models';

@Component({
  selector: 'app-match-card',
  imports: [DatePipe, RouterLink, FontAwesomeModule],
  template: `
    <article class="match" [class.is-live]="isLive()">
      <a
        class="match-link"
        [routerLink]="['/', tournament().slug, 'matches', match().id]"
        [attr.aria-label]="detailLabel()"
      >
      <div class="meta">
        <span>{{ stageLabel() }}</span>
        @if (match().kickoffUtc) {
          <span>
            {{ match().kickoffUtc | date: 'EEE d MMM HH:mm' : undefined : locale() }}
            @if (match().scheduledEndUtc) {
              &ndash;{{ match().scheduledEndUtc | date: 'HH:mm' : undefined : locale() }}
            }
          </span>
        }
        @if (match().pitchNumber) {
          <span>{{ t().matchCard.pitch }} {{ match().pitchNumber }}</span>
        }
      </div>

      <div class="scoreline">
        <span class="side home">{{ homeName() }}</span>
        <span class="score">{{ match().homeScore }}&ndash;{{ match().awayScore }}</span>
        <span class="side away">{{ awayName() }}</span>
      </div>

      @if (match().homePenalties !== null && match().awayPenalties !== null) {
        <p class="muted penalties">
          {{ t().matchCard.penalties }} {{ match().homePenalties }}&ndash;{{ match().awayPenalties }}
        </p>
      }

      <div class="status">
        @if (isLive()) {
          <span class="badge live"><span class="pulse"></span> {{ minuteLabel() }}</span>
        } @else if (match().status === 'HalfTime') {
          <span class="badge">{{ breakLabel() }}</span>
        } @else {
          <span class="badge">{{ t().matchStatus[match().status] }}</span>
        }
      </div>

      @if (match().events.length) {
        <ul class="events">
          @for (event of goalEvents(); track event.id) {
            <li>
              <span class="minute">{{ event.minute }}'</span>
              <span>{{ event.playerName ?? event.teamName }}</span>
              @if (event.type === 'OwnGoal') {
                <span class="muted">{{ t().matchCard.ownGoalShort }}</span>
              }
              @if (event.type === 'PenaltyGoal') {
                <span class="muted">{{ t().matchCard.penaltyShort }}</span>
              }
            </li>
          }
        </ul>
      }
      </a>

      @if (location(); as address) {
        <a
          class="location muted"
          [href]="mapsUrl(address)"
          target="_blank"
          rel="noopener noreferrer"
          [attr.aria-label]="mapsLabel(address)"
        >
          <fa-icon [icon]="faLocationDot" aria-hidden="true" />
          <span>{{ address }}</span>
        </a>
      }
    </article>
  `,
  styles: `
    .match-link {
      display: grid;
      gap: 0.6rem;
      color: inherit;
      text-decoration: none;
      border-radius: var(--radius);
    }

    .match-link:hover {
      text-decoration: none;
    }

    .match:hover {
      border-color: var(--accent);
      background: var(--surface-raised);
    }

    .match-link:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 3px;
    }

    .match {
      background: var(--surface);
      border: 1px solid var(--surface-line);
      border-radius: var(--radius);
      padding: 1rem;
      display: grid;
      gap: 0.6rem;
      height: 100%;
      transition: background 120ms ease, border-color 120ms ease;
    }

    .match.is-live {
      border-color: rgb(244 72 91 / 55%);
    }

    .meta {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .scoreline {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 0.75rem;
    }

    .side {
      font-weight: 600;
    }

    .side.away {
      text-align: right;
    }

    .score {
      font-size: 1.5rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.02em;
    }

    .penalties {
      margin: 0;
      text-align: center;
      font-size: 0.8rem;
    }

    .status {
      display: flex;
      justify-content: center;
    }

    .events {
      list-style: none;
      margin: 0;
      padding: 0.5rem 0 0;
      border-top: 1px solid var(--surface-line);
      display: grid;
      gap: 0.2rem;
      font-size: 0.85rem;
    }

    .events li {
      display: flex;
      gap: 0.4rem;
    }

    .minute {
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
      min-width: 2.2rem;
    }

    .location {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin: 0;
      padding-top: 0.5rem;
      border-top: 1px solid var(--surface-line);
      font-size: 0.78rem;
      color: var(--text-muted);
      text-decoration: none;
    }

    .location:hover span { text-decoration: underline; }

    .location fa-icon {
      display: flex;
      flex: none;
      color: var(--accent);
    }
  `,
})
export class MatchCard {
  protected readonly faLocationDot = faLocationDot;
  protected readonly mapsUrl = mapsUrl;
  readonly match = input.required<Match>();
  readonly tournament = input.required<TournamentSummary>();

  private readonly i18n = inject(I18nService);
  private readonly clock = inject(MatchClockService);
  protected readonly t = this.i18n.t;
  protected readonly locale = this.i18n.locale;

  protected readonly homeName = computed(() =>
    this.i18n.teamName(this.match().homeTeamName, this.match().homeTeamId),
  );

  protected readonly awayName = computed(() =>
    this.i18n.teamName(this.match().awayTeamName, this.match().awayTeamId),
  );

  protected readonly stageLabel = computed(() =>
    this.match().stage === 'Group' && this.tournament().format === 'League'
      ? this.t().tournament.league
      : this.match().groupName ?? this.t().stage[this.match().stage],
  );

  protected readonly location = computed(() => this.match().venue ?? this.tournament().location);

  protected readonly detailLabel = computed(() =>
    this.i18n.format(this.t().matchPage.open, {
      home: this.homeName(),
      away: this.awayName(),
    }),
  );

  protected mapsLabel(address: string): string {
    return this.i18n.format(this.t().matchCard.openMaps, { address });
  }

  protected readonly minuteLabel = computed(() => {
    const label = this.clock.label(this.match(), this.tournament());
    return label === '' ? this.t().connection.live : label;
  });

  protected readonly breakLabel = computed(() =>
    this.clock.breakLabel(this.match(), this.tournament()),
  );

  isLive(): boolean {
    return this.match().status === 'Live' || this.match().status === 'Paused';
  }

  goalEvents() {
    return this.match().events.filter(
      (event) => event.type === 'Goal' || event.type === 'OwnGoal' || event.type === 'PenaltyGoal',
    );
  }
}
