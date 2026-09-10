import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { MatchClockService } from '../../core/match-clock.service';
import { TournamentStore } from '../../core/tournament.store';
import { HeadingSkeleton, ScoreboardSkeleton } from '../../shared/loading-skeletons';
import { SelectField, SelectOption } from '../../shared/select-field';
import { Match, MatchEventType, MatchStatus, TournamentSummary } from '../../core/models';

@Component({
  selector: 'app-live-console',
  imports: [FormsModule, RouterLink, HeadingSkeleton, ScoreboardSkeleton, SelectField],
  template: `
    @if (detail(); as data) {
      <section class="heading">
        <div class="spread">
          <h1>{{ t().live.title }}</h1>
          <span class="badge" [class.connected]="store.connectionState() === 'connected'">
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
        </div>
        <p class="muted">{{ data.tournament.name }}</p>
        <div class="links">
          <a [routerLink]="['/admin', data.tournament.slug]">
            <button type="button">{{ t().live.setup }}</button>
          </a>
          <a [routerLink]="['/', data.tournament.slug]">
            <button class="ghost" type="button">{{ t().live.publicPage }}</button>
          </a>
        </div>
      </section>

      <section class="card picker" data-guide-target="admin-match-picker">
        <label>
          {{ t().live.match }}
          <app-select
            [options]="matchOptions(data.matches)"
            [ngModel]="selectedId()"
            (ngModelChange)="selectMatch($event)"
          />
        </label>
      </section>

      @if (selected(); as match) {
        <section class="card control">
          @if (data.tournament.trackMatchClock) {
            <div class="clock">
              @if (match.status === 'Live') {
                <span class="badge live"><span class="pulse"></span> {{ minuteLabel(match) }}</span>
              } @else if (match.status === 'Paused') {
                <span class="badge">{{ minuteLabel(match) }} &middot; {{ t().matchStatus.Paused }}</span>
              } @else if (match.status === 'HalfTime') {
                <span class="badge">{{ breakLabel(match) }} &middot; {{ minuteLabel(match) }}</span>
              } @else {
                <span class="badge">{{ t().matchStatus[match.status] }}</span>
              }
              <span class="period muted">{{ periodLabel(match) }}</span>
            </div>
          } @else {
            <div class="clock">
              <span class="badge">{{ t().matchStatus[match.status] }}</span>
            </div>
          }

          <div class="scorer" data-guide-target="admin-score-control">
            <div class="team">
              <span class="name">{{ i18n.teamName(match.homeTeamName, match.homeTeamId) }}</span>
              <div class="counter">
                <button
                  type="button"
                  [attr.aria-label]="t().live.homeGoalRemove"
                  (click)="adjust(match.id, 'home', -1)"
                >
                  &minus;
                </button>
                <span class="value">{{ match.homeScore }}</span>
                <button
                  class="primary"
                  type="button"
                  [attr.aria-label]="t().live.homeGoalAdd"
                  (click)="adjust(match.id, 'home', 1)"
                >
                  +
                </button>
              </div>
            </div>

            <div class="team">
              <span class="name">{{ i18n.teamName(match.awayTeamName, match.awayTeamId) }}</span>
              <div class="counter">
                <button
                  type="button"
                  [attr.aria-label]="t().live.awayGoalRemove"
                  (click)="adjust(match.id, 'away', -1)"
                >
                  &minus;
                </button>
                <span class="value">{{ match.awayScore }}</span>
                <button
                  class="primary"
                  type="button"
                  [attr.aria-label]="t().live.awayGoalAdd"
                  (click)="adjust(match.id, 'away', 1)"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div class="statuses" data-guide-target="admin-status-control">
            @for (status of statuses(data.tournament); track status) {
              <button
                type="button"
                [class.primary]="match.status === status"
                (click)="setStatus(match.id, status)"
              >
                {{ t().matchStatus[status] }}
              </button>
            }
          </div>

          @if (data.tournament.trackMatchClock && data.tournament.useStoppageTime) {
            <div class="stoppage">
              <label>
                {{ t().clock.addedTime }}
                <input type="number" inputmode="numeric" min="0" max="30" [(ngModel)]="stoppage" />
              </label>
              <div class="align-end">
                <button type="button" (click)="saveStoppage(match.id)">{{ t().live.setStoppage }}</button>
              </div>
            </div>
          }

          @if (isKnockout(match)) {
            <div class="form-grid">
              <label>
                {{ t().live.homePenalties }}
                <input type="number" inputmode="numeric" min="0" [(ngModel)]="homePenalties" />
              </label>
              <label>
                {{ t().live.awayPenalties }}
                <input type="number" inputmode="numeric" min="0" [(ngModel)]="awayPenalties" />
              </label>
              <div class="align-end">
                <button type="button" (click)="savePenalties(match)">
                  {{ t().live.saveShootout }}
                </button>
              </div>
            </div>
          }
        </section>

        @if (data.tournament.trackPlayers) {
          <section class="card stack">
            <h3>{{ t().live.recordEvent }}</h3>
            <div class="form-grid">
              <label>
                {{ t().live.team }}
                <app-select
                  [options]="teamOptions(match)"
                  [ngModel]="eventTeamId()"
                  (ngModelChange)="eventTeamId.set($event)"
                />
              </label>
              <label>
                {{ t().live.player }}
                <app-select [options]="playerOptions()" [(ngModel)]="eventPlayerId" />
              </label>
              <label>
                {{ t().live.type }}
                <app-select [options]="eventTypeOptions()" [(ngModel)]="eventType" />
              </label>
              <label>
                {{ t().live.minute }}
                <input type="number" inputmode="numeric" min="0" [(ngModel)]="eventMinute" />
              </label>
              <div class="align-end">
                <button class="primary" type="button" (click)="addEvent(match.id)">
                  {{ t().live.addEvent }}
                </button>
              </div>
            </div>
            <p class="muted note">{{ t().live.eventNote }}</p>
          </section>
        }

        @if (match.events.length) {
          <section class="card stack">
            <h3>{{ t().live.eventFeed }}</h3>
            <div class="scroll-x">
              <table>
                <thead>
                  <tr>
                    <th class="numeric">{{ t().live.minuteShort }}</th>
                    <th>{{ t().live.type }}</th>
                    <th>{{ t().live.team }}</th>
                    <th>{{ t().live.player }}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (event of match.events; track event.id) {
                    <tr>
                      <td class="numeric">{{ event.minute }}'</td>
                      <td>{{ t().eventType[event.type] }}</td>
                      <td>{{ event.teamName }}</td>
                      <td class="muted">{{ event.playerName ?? '-' }}</td>
                      <td>
                        <button type="button" class="danger" (click)="removeEvent(match.id, event.id)">
                          {{ t().live.undo }}
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        }

        <section class="stack">
          <h3>{{ t().live.tablesAuto }}</h3>
          <div class="grid-auto">
            @for (table of data.tables; track table.groupId) {
              <div class="card">
                <h4>{{ table.groupName }}</h4>
                <table>
                  <tbody>
                    @for (row of table.rows; track row.teamId) {
                      <tr>
                        <td class="numeric">{{ row.position }}</td>
                        <td>{{ row.teamName }}</td>
                        <td class="numeric">{{ row.played }}</td>
                        <td class="numeric">
                          {{ row.goalDifference > 0 ? '+' : '' }}{{ row.goalDifference }}
                        </td>
                        <td class="numeric points">{{ row.points }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </section>
      }
    } @else {
      <p class="sr-only" role="status">{{ t().common.loading }}</p>
      <app-heading-skeleton />
      <app-scoreboard-skeleton />
    }
  `,
  styles: `
    .heading {
      margin-bottom: 1rem;
      display: grid;
      gap: 0.5rem;
    }

    .heading h1 {
      margin: 0;
    }

    .heading p {
      margin: 0;
      font-size: 0.9rem;
    }

    .links {
      display: flex;
      gap: 0.5rem;
    }

    .links a {
      flex: 1;
    }

    .links button {
      width: 100%;
    }

    section.card {
      margin-bottom: 1rem;
    }

    .picker label {
      max-width: 520px;
    }

    .clock {
      display: flex;
      justify-content: center;
      margin-bottom: 0.9rem;
    }

    /* Each team gets its own full-width row so the buttons stay thumb-sized. */
    .scorer {
      display: grid;
      gap: 0.9rem;
    }

    .team {
      display: grid;
      gap: 0.5rem;
      justify-items: center;
      text-align: center;
    }

    .name {
      font-weight: 700;
      font-size: 1.05rem;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .counter {
      display: grid;
      grid-template-columns: 1fr 3ch 1fr;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
    }

    .counter button {
      height: 60px;
      font-size: 1.6rem;
      font-weight: 700;
      width: 100%;
    }

    .value {
      font-size: 2.6rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      text-align: center;
      line-height: 1;
    }

    .statuses {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
      margin-top: 1.1rem;
    }

    .clock {
      display: grid;
      justify-items: center;
      gap: 0.3rem;
      margin-bottom: 0.9rem;
    }

    .period {
      font-size: 0.8rem;
    }

    .stoppage {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.5rem;
      align-items: end;
      margin-top: 1rem;
    }

    .align-end {
      display: flex;
      align-items: flex-end;
    }

    .align-end button {
      width: 100%;
    }

    .note {
      margin: 0;
      font-size: 0.85rem;
    }

    .points {
      font-weight: 700;
    }

    h4 {
      margin-top: 0;
    }

    @media (min-width: 700px) {
      .heading {
        margin-bottom: 1.25rem;
      }

      .links a {
        flex: none;
      }

      .scorer {
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
      }

      .counter button {
        height: 52px;
        font-size: 1.4rem;
      }

      .statuses {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
      }
    }
  `,
})
export class LiveConsole implements OnInit {
  readonly slug = input.required<string>();

  private readonly api = inject(ApiService);
  private readonly clock = inject(MatchClockService);
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly store = inject(TournamentStore);
  protected readonly detail = this.store.detail;

  protected readonly selectedId = signal<number | null>(null);
  protected readonly eventTeamId = signal<number | null>(null);

  protected eventType: MatchEventType = 'Goal';
  protected eventPlayerId: number | null = null;
  protected eventMinute = 1;
  protected homePenalties: number | null = null;
  protected awayPenalties: number | null = null;
  protected stoppage = 0;

  protected readonly playerOptions = computed<SelectOption<number | null>[]>(() => [
    { value: null, label: this.t().live.notRecorded },
    ...this.squad().map((player) => ({ value: player.id as number | null, label: player.name })),
  ]);

  protected readonly eventTypeOptions = computed<SelectOption<MatchEventType>[]>(() => {
    const labels = this.t().eventType;
    return [
      { value: 'Goal', label: labels.Goal },
      { value: 'PenaltyGoal', label: labels.PenaltyGoal },
      { value: 'OwnGoal', label: labels.OwnGoal },
      { value: 'Assist', label: labels.Assist },
      { value: 'YellowCard', label: labels.YellowCard },
      { value: 'RedCard', label: labels.RedCard },
      { value: 'PenaltyMissed', label: labels.PenaltyMissed },
    ];
  });

  matchOptions(matches: Match[]): SelectOption<number>[] {
    return matches.map((match) => ({ value: match.id, label: this.matchLabel(match) }));
  }

  teamOptions(match: Match): SelectOption<number | null>[] {
    return [
      { value: match.homeTeamId, label: this.i18n.teamName(match.homeTeamName, match.homeTeamId) },
      { value: match.awayTeamId, label: this.i18n.teamName(match.awayTeamName, match.awayTeamId) },
    ].filter((option) => option.value !== null);
  }

  selectMatch(matchId: number | null): void {
    this.selectedId.set(matchId);

    const match = this.detail()?.matches.find((candidate) => candidate.id === matchId);
    if (match) {
      this.eventTeamId.set(match.homeTeamId);
      this.homePenalties = match.homePenalties;
      this.awayPenalties = match.awayPenalties;
      this.stoppage = match.clock.stoppageMinutes;
    }
  }

  /** The timeout button only appears when the tournament allows stopping the clock. */
  statuses(tournament: TournamentSummary): MatchStatus[] {
    const base: MatchStatus[] = ['Scheduled', 'Live', 'HalfTime', 'Finished'];
    return tournament.allowTimeouts ? ['Scheduled', 'Live', 'Paused', 'HalfTime', 'Finished'] : base;
  }

  minuteLabel(match: Match): string {
    const tournament = this.detail()?.tournament;
    return tournament ? this.clock.label(match, tournament) : '';
  }

  breakLabel(match: Match): string {
    const tournament = this.detail()?.tournament;
    return tournament ? this.clock.breakLabel(match, tournament) : '';
  }

  periodLabel(match: Match): string {
    const tournament = this.detail()?.tournament;
    return tournament ? this.clock.periodLabel(match, tournament) : '';
  }

  async saveStoppage(matchId: number): Promise<void> {
    this.store.patchMatch(await firstValueFrom(this.api.setStoppage(matchId, this.stoppage)));
  }

  protected readonly selected = computed(
    () => this.detail()?.matches.find((match) => match.id === this.selectedId()) ?? null,
  );

  protected readonly squad = computed(() => {
    const teamId = this.eventTeamId();
    return this.detail()?.teams.find((team) => team.id === teamId)?.players ?? [];
  });

  async ngOnInit(): Promise<void> {
    await this.store.load(this.slug());

    const matches = this.detail()?.matches ?? [];
    // Jump straight to whatever is in progress, otherwise the next kickoff.
    const preferred =
      matches.find((match) => match.status === 'Live' || match.status === 'HalfTime') ??
      matches.find((match) => match.status === 'Scheduled') ??
      matches[0];

    if (preferred) {
      this.selectedId.set(preferred.id);
      this.eventTeamId.set(preferred.homeTeamId);
      this.homePenalties = preferred.homePenalties;
      this.awayPenalties = preferred.awayPenalties;
      this.stoppage = preferred.clock.stoppageMinutes;
    }
  }

  matchLabel(match: Match): string {
    const stage = match.groupName ?? this.t().stage[match.stage];
    const home = this.i18n.teamName(match.homeTeamName, match.homeTeamId);
    const away = this.i18n.teamName(match.awayTeamName, match.awayTeamId);
    return `${stage} - ${home} ${match.homeScore}-${match.awayScore} ${away}`;
  }

  isKnockout(match: Match): boolean {
    return match.stage !== 'Group';
  }

  async adjust(matchId: number, side: 'home' | 'away', delta: 1 | -1): Promise<void> {
    this.store.patchMatch(await firstValueFrom(this.api.adjustScore(matchId, side, delta)));
  }

  async setStatus(matchId: number, status: MatchStatus): Promise<void> {
    this.store.patchMatch(await firstValueFrom(this.api.setStatus(matchId, status)));
    await this.store.reload();
  }

  async savePenalties(match: Match): Promise<void> {
    this.store.patchMatch(
      await firstValueFrom(
        this.api.setScore(
          match.id,
          match.homeScore,
          match.awayScore,
          this.homePenalties,
          this.awayPenalties,
        ),
      ),
    );
  }

  async addEvent(matchId: number): Promise<void> {
    const teamId = this.eventTeamId();
    if (!teamId) {
      return;
    }

    this.store.patchMatch(
      await firstValueFrom(
        this.api.addEvent(matchId, teamId, this.eventPlayerId, this.eventType, this.eventMinute, null),
      ),
    );

    this.eventPlayerId = null;
  }

  async removeEvent(matchId: number, eventId: number): Promise<void> {
    this.store.patchMatch(await firstValueFrom(this.api.deleteEvent(matchId, eventId)));
  }
}
