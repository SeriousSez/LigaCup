import { Injectable, computed, inject, signal } from '@angular/core';
import { I18nService } from './i18n/i18n.service';
import { Match, TournamentSummary } from './models';

/**
 * Ticks once a second so every running clock on screen recalculates itself.
 * Without this the minute would only move when the server happened to broadcast.
 */
@Injectable({ providedIn: 'root' })
export class ClockTicker {
  private readonly now = signal(Date.now());

  constructor() {
    setInterval(() => this.now.set(Date.now()), 1000);
  }

  readonly nowMs = this.now.asReadonly();
}

@Injectable({ providedIn: 'root' })
export class MatchClockService {
  private readonly ticker = inject(ClockTicker);
  private readonly i18n = inject(I18nService);

  /** Seconds played in the current period, counting the running spell client-side. */
  elapsedSeconds(match: Match): number {
    const clock = match.clock;
    if (!clock.isRunning || !clock.clockStartedUtc) {
      return clock.periodElapsedSeconds;
    }

    const startedMs = new Date(clock.clockStartedUtc).getTime();
    const running = Math.max(0, (this.ticker.nowMs() - startedMs) / 1000);
    return clock.periodElapsedSeconds + Math.floor(running);
  }

  /** Renders the scoreboard minute, using the 45+2 form once a period runs long. */
  label(match: Match, tournament: TournamentSummary): string {
    if (!tournament.trackMatchClock) {
      return '';
    }

    const periodDuration = Math.max(1, tournament.periodDurationMinutes);
    let minuteInPeriod = Math.floor(this.elapsedSeconds(match) / 60);

    if (!tournament.useStoppageTime) {
      minuteInPeriod = Math.min(minuteInPeriod, periodDuration);
    }

    const period = Math.max(1, match.clock.period);
    const regulationEnd = period * periodDuration;
    const displayMinute = (period - 1) * periodDuration + minuteInPeriod;

    return displayMinute > regulationEnd
      ? `${regulationEnd}+${displayMinute - regulationEnd}'`
      : `${displayMinute}'`;
  }

  /** Half time, or the short break label for formats with more than two periods. */
  breakLabel(match: Match, tournament: TournamentSummary): string {
    const strings = this.i18n.t();
    return tournament.periodCount === 2
      ? strings.matchStatus.HalfTime
      : `${strings.clock.breakAfterPeriod} ${match.clock.period}`;
  }

  periodLabel(match: Match, tournament: TournamentSummary): string {
    const strings = this.i18n.t();

    if (tournament.periodCount === 2) {
      return match.clock.period === 1 ? strings.clock.firstHalf : strings.clock.secondHalf;
    }

    return this.i18n.format(strings.clock.period, { n: match.clock.period });
  }
}
