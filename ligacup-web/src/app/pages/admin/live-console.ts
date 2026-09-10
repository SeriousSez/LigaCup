import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TournamentStore } from '../../core/tournament.store';
import { Match, MatchEventType, MatchStatus } from '../../core/models';

@Component({
    selector: 'app-live-console',
    imports: [FormsModule, RouterLink],
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

      <section class="card picker">
        <label>
          {{ t().live.match }}
          <select [ngModel]="selectedId()" (ngModelChange)="selectedId.set(+$event)">
            @for (match of data.matches; track match.id) {
              <option [value]="match.id">
                {{ matchLabel(match) }}
              </option>
            }
          </select>
        </label>
      </section>

      @if (selected(); as match) {
        <section class="card control">
          <div class="clock">
            @if (match.status === 'Live') {
              <span class="badge live"><span class="pulse"></span> {{ match.liveMinute }}'</span>
            } @else {
              <span class="badge">{{ t().matchStatus[match.status] }}</span>
            }
          </div>

          <div class="scorer">
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

          <div class="statuses">
            @for (status of statuses; track status) {
              <button
                type="button"
                [class.primary]="match.status === status"
                (click)="setStatus(match.id, status)"
              >
                {{ t().matchStatus[status] }}
              </button>
            }
          </div>

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
                <select [ngModel]="eventTeamId()" (ngModelChange)="eventTeamId.set(+$event)">
                  @if (match.homeTeamId) {
                    <option [value]="match.homeTeamId">{{ match.homeTeamName }}</option>
                  }
                  @if (match.awayTeamId) {
                    <option [value]="match.awayTeamId">{{ match.awayTeamName }}</option>
                  }
                </select>
              </label>
              <label>
                {{ t().live.player }}
                <select [ngModel]="eventPlayerId" (ngModelChange)="eventPlayerId = $event">
                  <option [ngValue]="null">{{ t().live.notRecorded }}</option>
                  @for (player of squad(); track player.id) {
                    <option [ngValue]="player.id">{{ player.name }}</option>
                  }
                </select>
              </label>
              <label>
                {{ t().live.type }}
                <select [(ngModel)]="eventType">
                  <option value="Goal">{{ t().eventType.Goal }}</option>
                  <option value="PenaltyGoal">{{ t().eventType.PenaltyGoal }}</option>
                  <option value="OwnGoal">{{ t().eventType.OwnGoal }}</option>
                  <option value="Assist">{{ t().eventType.Assist }}</option>
                  <option value="YellowCard">{{ t().eventType.YellowCard }}</option>
                  <option value="RedCard">{{ t().eventType.RedCard }}</option>
                  <option value="PenaltyMissed">{{ t().eventType.PenaltyMissed }}</option>
                </select>
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
      <p class="muted">{{ t().common.loading }}</p>
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
    protected readonly i18n = inject(I18nService);
    protected readonly t = this.i18n.t;
    protected readonly store = inject(TournamentStore);
    protected readonly detail = this.store.detail;

    protected readonly selectedId = signal<number | null>(null);
    protected readonly eventTeamId = signal<number | null>(null);

    protected readonly statuses: MatchStatus[] = ['Scheduled', 'Live', 'HalfTime', 'Finished'];
    protected eventType: MatchEventType = 'Goal';
    protected eventPlayerId: number | null = null;
    protected eventMinute = 1;
    protected homePenalties: number | null = null;
    protected awayPenalties: number | null = null;

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
