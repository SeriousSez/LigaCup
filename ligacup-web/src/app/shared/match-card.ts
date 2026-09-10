import { DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { MatchClockService } from '../core/match-clock.service';
import { Match, TournamentSummary } from '../core/models';

@Component({
    selector: 'app-match-card',
    imports: [DatePipe],
    template: `
    <article class="match" [class.is-live]="isLive()">
      <div class="meta">
        <span>{{ match().groupName ?? t().stage[match().stage] }}</span>
        @if (match().kickoffUtc) {
          <span>{{ match().kickoffUtc | date: 'EEE d MMM HH:mm' : undefined : locale() }}</span>
        }
        @if (match().venue) {
          <span>{{ match().venue }}</span>
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
    </article>
  `,
    styles: `
    .match {
      background: var(--surface);
      border: 1px solid var(--surface-line);
      border-radius: var(--radius);
      padding: 1rem;
      display: grid;
      gap: 0.6rem;
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
  `,
})
export class MatchCard {
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
