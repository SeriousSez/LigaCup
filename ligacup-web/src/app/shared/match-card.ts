import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { Match } from '../core/models';

@Component({
  selector: 'app-match-card',
  imports: [DatePipe],
  template: `
    <article class="match" [class.is-live]="isLive()">
      <div class="meta">
        <span>{{ match().groupName ?? stageLabel() }}</span>
        @if (match().kickoffUtc) {
          <span>{{ match().kickoffUtc | date: 'EEE d MMM HH:mm' }}</span>
        }
        @if (match().venue) {
          <span>{{ match().venue }}</span>
        }
      </div>

      <div class="scoreline">
        <span class="side home">{{ match().homeTeamName }}</span>
        <span class="score">{{ match().homeScore }}&ndash;{{ match().awayScore }}</span>
        <span class="side away">{{ match().awayTeamName }}</span>
      </div>

      @if (match().homePenalties !== null && match().awayPenalties !== null) {
        <p class="muted penalties">
          Penalties {{ match().homePenalties }}&ndash;{{ match().awayPenalties }}
        </p>
      }

      <div class="status">
        @if (isLive()) {
          <span class="badge live"
            ><span class="pulse"></span>
            {{ match().status === 'HalfTime' ? 'Half time' : minuteLabel() }}</span
          >
        } @else {
          <span class="badge">{{ statusLabel() }}</span>
        }
      </div>

      @if (match().events.length) {
        <ul class="events">
          @for (event of goalEvents(); track event.id) {
            <li>
              <span class="minute">{{ event.minute }}'</span>
              <span>{{ event.playerName ?? event.teamName }}</span>
              @if (event.type === 'OwnGoal') {
                <span class="muted">(og)</span>
              }
              @if (event.type === 'PenaltyGoal') {
                <span class="muted">(pen)</span>
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

  isLive(): boolean {
    return this.match().status === 'Live' || this.match().status === 'HalfTime';
  }

  minuteLabel(): string {
    const minute = this.match().liveMinute;
    return minute === null ? 'Live' : `${minute}'`;
  }

  statusLabel(): string {
    const labels: Record<string, string> = {
      Scheduled: 'Scheduled',
      Finished: 'Full time',
      Postponed: 'Postponed',
      Abandoned: 'Abandoned',
    };

    return labels[this.match().status] ?? this.match().status;
  }

  stageLabel(): string {
    const labels: Record<string, string> = {
      Group: 'Group stage',
      RoundOf32: 'Round of 32',
      RoundOf16: 'Round of 16',
      QuarterFinal: 'Quarter-final',
      SemiFinal: 'Semi-final',
      ThirdPlacePlayOff: 'Third place',
      Final: 'Final',
    };

    return labels[this.match().stage] ?? this.match().stage;
  }

  goalEvents() {
    return this.match().events.filter(
      (event) => event.type === 'Goal' || event.type === 'OwnGoal' || event.type === 'PenaltyGoal',
    );
  }
}
