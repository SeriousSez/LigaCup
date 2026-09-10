import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TournamentStore } from '../../core/tournament.store';
import { FormSkeleton, HeadingSkeleton } from '../../shared/loading-skeletons';
import { SelectField, SelectOption } from '../../shared/select-field';
import { Group, SaveTournamentRequest, TiebreakerRule, TournamentFormat, TournamentStatus } from '../../core/models';

@Component({
    selector: 'app-admin-setup',
    imports: [FormsModule, RouterLink, HeadingSkeleton, FormSkeleton, SelectField],
    template: `
    @if (detail(); as data) {
      <section class="spread heading">
        <div>
          <h1>{{ data.tournament.name }}</h1>
          <p class="muted">{{ t().setup.subtitle }}</p>
        </div>
        <div class="row">
          <a [routerLink]="['/admin', data.tournament.slug, 'live']">
            <button class="primary" type="button">{{ t().tournament.liveConsole }}</button>
          </a>
          <a [routerLink]="['/', data.tournament.slug]">
            <button class="ghost" type="button">{{ t().setup.publicPage }}</button>
          </a>
        </div>
      </section>

      <section class="card stack">
        <h3>{{ t().setup.rules }}</h3>
        <div class="form-grid">
          <label>
            {{ t().common.name }}
            <input [(ngModel)]="settings.name" />
          </label>
          <label>
            {{ t().common.season }}
            <input type="number" inputmode="numeric" [(ngModel)]="settings.season" />
          </label>
          <label>
            {{ t().setup.status }}
            <app-select [options]="statusOptions()" [(ngModel)]="settings.status" />
          </label>
          <label>
            {{ t().setup.format }}
            <app-select [options]="formatOptions()" [(ngModel)]="settings.format" />
          </label>
          <label>
            {{ t().setup.pointsWin }}
            <input type="number" inputmode="numeric" [(ngModel)]="settings.pointsForWin" />
          </label>
          <label>
            {{ t().setup.pointsDraw }}
            <input type="number" inputmode="numeric" [(ngModel)]="settings.pointsForDraw" />
          </label>
          <label>
            {{ t().setup.pointsLoss }}
            <input type="number" inputmode="numeric" [(ngModel)]="settings.pointsForLoss" />
          </label>
          <label>
            {{ t().setup.groupRounds }}
            <input type="number" inputmode="numeric" min="1" max="4" [(ngModel)]="settings.groupRounds" />
          </label>
          <label>
            {{ t().setup.advancing }}
            <input
              type="number"
              inputmode="numeric"
              min="0"
              [(ngModel)]="settings.teamsAdvancingPerGroup"
            />
          </label>
        </div>

        <div class="row toggles">
          <label class="checkbox">
            <input type="checkbox" [(ngModel)]="settings.trackPlayers" />
            {{ t().setup.trackPlayers }}
          </label>
          <label class="checkbox">
            <input type="checkbox" [(ngModel)]="settings.trackCards" />
            {{ t().setup.trackCards }}
          </label>
          <label class="checkbox">
            <input type="checkbox" [(ngModel)]="settings.hasThirdPlacePlayOff" />
            {{ t().setup.thirdPlace }}
          </label>
        </div>

        <div class="stack">
          <h4>{{ t().setup.clockSection }}</h4>
          <p class="muted">{{ t().setup.clockHelp }}</p>
          <div class="form-grid">
            <label>
              {{ t().setup.periodCount }}
              <input
                type="number"
                inputmode="numeric"
                min="1"
                max="4"
                [(ngModel)]="settings.periodCount"
              />
            </label>
            <label>
              {{ t().setup.periodDuration }}
              <input
                type="number"
                inputmode="numeric"
                min="1"
                max="90"
                [(ngModel)]="settings.periodDurationMinutes"
              />
            </label>
            <label>
              {{ t().setup.breakDuration }}
              <input
                type="number"
                inputmode="numeric"
                min="0"
                max="60"
                [(ngModel)]="settings.breakDurationMinutes"
              />
            </label>
          </div>
          <div class="row toggles">
            <label class="checkbox">
              <input type="checkbox" [(ngModel)]="settings.trackMatchClock" />
              {{ t().setup.trackMatchClock }}
            </label>
            <label class="checkbox">
              <input type="checkbox" [(ngModel)]="settings.useStoppageTime" />
              {{ t().setup.useStoppageTime }}
            </label>
            <label class="checkbox">
              <input type="checkbox" [(ngModel)]="settings.allowTimeouts" />
              {{ t().setup.allowTimeouts }}
            </label>
          </div>
        </div>

        <div class="stack">
          <h4>{{ t().setup.tiebreakersTitle }}</h4>
          <p class="muted">{{ t().setup.tiebreakersHelp }}</p>
          <div class="tiebreakers">
            @for (rule of tiebreakers(); track rule; let index = $index) {
              <div class="rule">
                <span>{{ index + 1 }}. {{ t().tiebreaker[rule] }}</span>
                <button
                  type="button"
                  class="ghost"
                  [attr.aria-label]="t().setup.moveUp"
                  (click)="moveRule(index, -1)"
                  [disabled]="index === 0"
                >
                  &uarr;
                </button>
                <button
                  type="button"
                  class="ghost"
                  [attr.aria-label]="t().setup.moveDown"
                  (click)="moveRule(index, 1)"
                  [disabled]="index === tiebreakers().length - 1"
                >
                  &darr;
                </button>
                <button type="button" class="danger" (click)="removeRule(index)">
                  {{ t().common.remove }}
                </button>
              </div>
            }
          </div>
          <div class="add-rule">
            <app-select
              [options]="availableRuleOptions()"
              [ngModel]="ruleToAdd ?? availableRules()[0]"
              (ngModelChange)="ruleToAdd = $event"
            />
            <button type="button" (click)="addRule()" [disabled]="!availableRules().length">
              {{ t().common.add }}
            </button>
          </div>
        </div>

        <div class="row">
          <button class="primary" type="button" (click)="saveSettings()" [disabled]="busy()">
            {{ t().setup.saveRules }}
          </button>
          @if (message()) {
            <span class="muted">{{ message() }}</span>
          }
        </div>
      </section>

      <section class="card stack">
        <h3>{{ t().setup.groups }}</h3>
        <div class="row">
          @for (group of data.groups; track group.id) {
            <span class="badge">
              {{ group.name }}
              <button type="button" class="danger tiny" (click)="removeGroup(group.id)">&times;</button>
            </span>
          } @empty {
            <span class="muted">{{ t().setup.noGroups }}</span>
          }
        </div>
        <div class="add-player">
          <input [(ngModel)]="newGroupName" [placeholder]="t().setup.groupPlaceholder" />
          <button type="button" (click)="addGroup()">{{ t().setup.addGroup }}</button>
        </div>
      </section>

      <section class="card stack">
        <h3>{{ t().setup.teams }}</h3>
        <div class="team-rows">
          @for (team of data.teams; track team.id) {
            <div class="team-row">
              <div class="team-main">
                <strong>{{ team.name }}</strong>
                <span class="muted">
                  {{ team.shortName ?? t().setup.noShortName }}
                  @if (team.pointsAdjustment !== 0) {
                    &middot; {{ team.pointsAdjustment > 0 ? '+' : '' }}{{ team.pointsAdjustment }}
                    {{ t().setup.pointsSuffix }}
                  }
                </span>
              </div>
              <div class="controls">
                <app-select
                  [options]="groupOptions(data.groups)"
                  [ngModel]="team.groupId"
                  (ngModelChange)="assignGroup(team.id, team.name, team.shortName, $event)"
                />
                <button type="button" class="danger" (click)="removeTeam(team.id)">
                  {{ t().common.remove }}
                </button>
              </div>
            </div>
          } @empty {
            <p class="muted">{{ t().setup.teams }}: 0</p>
          }
        </div>

        <div class="add-team">
          <input [(ngModel)]="newTeamName" [placeholder]="t().setup.teamPlaceholder" />
          <input
            class="tiny-input"
            [(ngModel)]="newTeamShort"
            [placeholder]="t().setup.shortPlaceholder"
            maxlength="10"
          />
          <app-select [options]="groupOptions(data.groups)" [(ngModel)]="newTeamGroupId" />
          <button type="button" (click)="addTeam()">{{ t().setup.addTeam }}</button>
        </div>
      </section>

      @if (data.tournament.trackPlayers) {
        <section class="card stack">
          <h3>{{ t().setup.squads }}</h3>
          @for (team of data.teams; track team.id) {
            <div class="squad">
              <strong>{{ team.name }}</strong>
              <div class="row players">
                @for (player of team.players; track player.id) {
                  <span class="badge">
                    @if (player.shirtNumber !== null) {
                      {{ player.shirtNumber }}
                    }
                    {{ player.name }}
                    <button type="button" class="danger tiny" (click)="removePlayer(player.id)">
                      &times;
                    </button>
                  </span>
                } @empty {
                  <span class="muted">{{ t().setup.noPlayers }}</span>
                }
              </div>
              <div class="add-player">
                <input [(ngModel)]="playerDrafts[team.id]" [placeholder]="t().setup.playerPlaceholder" />
                <button type="button" (click)="addPlayer(team.id)">{{ t().common.add }}</button>
              </div>
            </div>
          }
        </section>
      }

      <section class="card stack">
        <h3>{{ t().setup.fixtures }}</h3>
        <p class="muted">{{ t().setup.fixturesHelp }}</p>
        <div class="row">
          <label class="checkbox">
            <input type="checkbox" [(ngModel)]="generateGroups" />
            {{ t().setup.groupStage }}
          </label>
          <label class="checkbox">
            <input type="checkbox" [(ngModel)]="generateKnockout" />
            {{ t().setup.knockoutBracket }}
          </label>
          <label class="checkbox">
            <input type="checkbox" [(ngModel)]="replaceExisting" />
            {{ t().setup.replaceExisting }}
          </label>
        </div>
        <div class="row">
          <button class="primary" type="button" (click)="generate()" [disabled]="busy()">
            {{ t().setup.generate }}
          </button>
          <button type="button" (click)="seedKnockout()" [disabled]="busy()">
            {{ t().setup.seedKnockout }}
          </button>
        </div>
        @if (fixtureMessage()) {
          <p class="muted">{{ fixtureMessage() }}</p>
        }
      </section>
    } @else {
      <p class="sr-only" role="status">{{ t().common.loading }}</p>
      <app-heading-skeleton />
      <app-form-skeleton [sections]="2" [fields]="4" />
    }
  `,
    styles: `
    .heading {
      margin-bottom: 1.25rem;
    }

    .heading p {
      margin: 0;
    }

    section.card {
      margin-bottom: 1rem;
    }

    .toggles {
      gap: 0.5rem;
      display: grid;
    }

    .narrow {
      width: 100%;
    }

    .add-team {
      display: grid;
      grid-template-columns: 1fr 90px;
      gap: 0.5rem;
    }

    .add-team button,
    .add-team select {
      grid-column: 1 / -1;
    }

    .add-player {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.5rem;
    }

    .team-rows {
      display: grid;
    }

    .team-row {
      display: grid;
      gap: 0.5rem;
      padding-block: 0.7rem;
      border-bottom: 1px solid var(--surface-line);
    }

    .team-main {
      display: grid;
      gap: 0.1rem;
      min-width: 0;
    }

    .team-main strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .team-main span {
      font-size: 0.8rem;
    }

    .controls {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.5rem;
    }

    .tiny-input {
      max-width: 100%;
    }

    .tiny {
      padding: 0 0.35rem;
      min-height: 0;
      border: none;
      background: transparent;
      line-height: 1;
    }

    .tiebreakers {
      display: grid;
      gap: 0.4rem;
    }

    .rule {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      background: var(--surface-raised);
      border-radius: 10px;
      padding: 0.35rem 0.5rem;
    }

    .rule span {
      flex: 1;
      font-size: 0.9rem;
    }

    .rule button {
      min-height: 38px;
      padding-inline: 0.6rem;
    }

    .add-rule {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.5rem;
    }

    .squad {
      border-top: 1px solid var(--surface-line);
      padding-top: 0.75rem;
      display: grid;
      gap: 0.5rem;
    }

    .players {
      gap: 0.4rem;
    }

    h4 {
      margin: 0;
    }

    @media (min-width: 700px) {
      section.card {
        margin-bottom: 1.25rem;
      }

      .toggles {
        display: flex;
        gap: 1.25rem;
      }

      .narrow {
        max-width: 220px;
      }

      .add-team {
        display: flex;
        flex-wrap: wrap;
      }

      .add-team input,
      .add-team select {
        max-width: 220px;
      }

      .add-team .tiny-input {
        max-width: 90px;
      }

      .add-team button,
      .add-team select {
        grid-column: auto;
      }

      .add-player {
        max-width: 420px;
      }

      .add-rule {
        max-width: 420px;
      }

      .team-row {
        grid-template-columns: 1fr 200px auto;
        align-items: center;
        gap: 1rem;
      }

      /* display: contents lets the select and button join the parent grid on wide screens. */
      .controls {
        display: contents;
      }
    }
  `,
})
export class AdminSetup implements OnInit {
    readonly slug = input.required<string>();

    private readonly api = inject(ApiService);
    private readonly i18n = inject(I18nService);
    protected readonly t = this.i18n.t;
    protected readonly store = inject(TournamentStore);
    protected readonly detail = this.store.detail;

    protected readonly busy = signal(false);
    protected readonly message = signal<string | null>(null);
    protected readonly fixtureMessage = signal<string | null>(null);
    protected readonly tiebreakers = signal<TiebreakerRule[]>([]);

    protected readonly allRules: TiebreakerRule[] = [
        'GoalDifference',
        'GoalsScored',
        'GoalsConceded',
        'Wins',
        'HeadToHeadPoints',
        'HeadToHeadGoalDifference',
        'HeadToHeadGoalsScored',
        'DisciplinaryPoints',
        'TeamName',
    ];

    protected readonly availableRules = computed(() =>
        this.allRules.filter((rule) => !this.tiebreakers().includes(rule)),
    );

    protected readonly availableRuleOptions = computed<SelectOption<TiebreakerRule>[]>(() =>
        this.availableRules().map((rule) => ({ value: rule, label: this.t().tiebreaker[rule] })),
    );

    protected readonly statusOptions = computed<SelectOption<TournamentStatus>[]>(() => {
        const labels = this.t().tournamentStatus;
        return [
            { value: 'Draft', label: labels.Draft },
            { value: 'InProgress', label: labels.InProgress },
            { value: 'Completed', label: labels.Completed },
            { value: 'Archived', label: labels.Archived },
        ];
    });

    protected readonly formatOptions = computed<SelectOption<TournamentFormat>[]>(() => {
        const labels = this.t().format;
        return [
            { value: 'GroupsThenKnockout', label: labels.GroupsThenKnockout },
            { value: 'GroupsOnly', label: labels.GroupsOnly },
            { value: 'KnockoutOnly', label: labels.KnockoutOnly },
        ];
    });

    groupOptions(groups: Group[]): SelectOption<number | null>[] {
        return [
            { value: null, label: this.t().common.unassigned },
            ...groups.map((group) => ({ value: group.id as number | null, label: group.name })),
        ];
    }

    protected ruleToAdd: TiebreakerRule | null = null;
    protected newGroupName = '';
    protected newTeamName = '';
    protected newTeamShort = '';
    protected newTeamGroupId: number | null = null;
    protected playerDrafts: Record<number, string> = {};
    protected generateGroups = true;
    protected generateKnockout = true;
    protected replaceExisting = false;

    protected settings: SaveTournamentRequest = {
        name: '',
        slug: null,
        description: null,
        season: new Date().getFullYear(),
        format: 'GroupsThenKnockout',
        status: 'Draft',
        pointsForWin: 3,
        pointsForDraw: 1,
        pointsForLoss: 0,
        groupRounds: 1,
        teamsAdvancingPerGroup: 2,
        includeBestThirdPlaced: false,
        hasThirdPlacePlayOff: false,
        trackPlayers: false,
        trackCards: false,
        periodCount: 2,
        periodDurationMinutes: 45,
        breakDurationMinutes: 15,
        trackMatchClock: true,
        allowTimeouts: false,
        useStoppageTime: true,
        tiebreakers: null,
    };

    async ngOnInit(): Promise<void> {
        await this.store.load(this.slug());
        const data = this.detail();
        if (!data) {
            return;
        }

        this.settings = {
            ...this.settings,
            name: data.tournament.name,
            slug: data.tournament.slug,
            description: data.tournament.description,
            season: data.tournament.season,
            format: data.tournament.format,
            status: data.tournament.status,
            trackPlayers: data.tournament.trackPlayers,
            trackCards: data.tournament.trackCards,
            periodCount: data.tournament.periodCount,
            periodDurationMinutes: data.tournament.periodDurationMinutes,
            breakDurationMinutes: data.tournament.breakDurationMinutes,
            trackMatchClock: data.tournament.trackMatchClock,
            allowTimeouts: data.tournament.allowTimeouts,
            useStoppageTime: data.tournament.useStoppageTime,
        };

        this.tiebreakers.set(['GoalDifference', 'GoalsScored', 'HeadToHeadPoints', 'Wins', 'TeamName']);
    }

    addRule(): void {
        const rule = this.ruleToAdd ?? this.availableRules()[0];
        if (rule && !this.tiebreakers().includes(rule)) {
            this.tiebreakers.update((rules) => [...rules, rule]);
            this.ruleToAdd = null;
        }
    }

    removeRule(index: number): void {
        this.tiebreakers.update((rules) => rules.filter((_, position) => position !== index));
    }

    moveRule(index: number, offset: number): void {
        this.tiebreakers.update((rules) => {
            const next = [...rules];
            const target = index + offset;
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    }

    async saveSettings(): Promise<void> {
        const data = this.detail();
        if (!data) {
            return;
        }

        this.busy.set(true);
        this.message.set(null);

        try {
            await firstValueFrom(
                this.api.updateTournament(data.tournament.id, {
                    ...this.settings,
                    tiebreakers: this.tiebreakers(),
                }),
            );
            await this.store.reload();
            this.message.set(this.t().common.saved);
        } catch {
            this.message.set(this.t().setup.saveFailed);
        } finally {
            this.busy.set(false);
        }
    }

    async addGroup(): Promise<void> {
        const data = this.detail();
        if (!data || !this.newGroupName.trim()) {
            return;
        }

        await firstValueFrom(
            this.api.createGroup(data.tournament.id, this.newGroupName.trim(), data.groups.length),
        );
        this.newGroupName = '';
        await this.store.reload();
    }

    async removeGroup(groupId: number): Promise<void> {
        const data = this.detail();
        if (!data) {
            return;
        }

        await firstValueFrom(this.api.deleteGroup(data.tournament.id, groupId));
        await this.store.reload();
    }

    async addTeam(): Promise<void> {
        const data = this.detail();
        if (!data || !this.newTeamName.trim()) {
            return;
        }

        await firstValueFrom(
            this.api.saveTeam(data.tournament.id, null, {
                name: this.newTeamName.trim(),
                shortName: this.newTeamShort.trim() || null,
                groupId: this.newTeamGroupId,
            }),
        );

        this.newTeamName = '';
        this.newTeamShort = '';
        await this.store.reload();
    }

    async assignGroup(
        teamId: number,
        name: string,
        shortName: string | null,
        groupId: number | null,
    ): Promise<void> {
        const data = this.detail();
        if (!data) {
            return;
        }

        await firstValueFrom(this.api.saveTeam(data.tournament.id, teamId, { name, shortName, groupId }));
        await this.store.reload();
    }

    async removeTeam(teamId: number): Promise<void> {
        const data = this.detail();
        if (!data) {
            return;
        }

        try {
            await firstValueFrom(this.api.deleteTeam(data.tournament.id, teamId));
            await this.store.reload();
        } catch {
            this.message.set(this.t().setup.removeTeamBlocked);
        }
    }

    async addPlayer(teamId: number): Promise<void> {
        const name = (this.playerDrafts[teamId] ?? '').trim();
        if (!name) {
            return;
        }

        await firstValueFrom(this.api.savePlayer(null, { teamId, name }));
        this.playerDrafts[teamId] = '';
        await this.store.reload();
    }

    async removePlayer(playerId: number): Promise<void> {
        await firstValueFrom(this.api.deletePlayer(playerId));
        await this.store.reload();
    }

    async generate(): Promise<void> {
        const data = this.detail();
        if (!data) {
            return;
        }

        this.busy.set(true);
        this.fixtureMessage.set(null);

        try {
            const result = await firstValueFrom(
                this.api.generateFixtures(
                    data.tournament.id,
                    this.generateGroups,
                    this.generateKnockout,
                    this.replaceExisting,
                ),
            );
            await this.store.reload();
            this.fixtureMessage.set(
                this.i18n.format(this.t().setup.generated, { count: result.generated }),
            );
        } catch {
            this.fixtureMessage.set(this.t().setup.generateBlocked);
        } finally {
            this.busy.set(false);
        }
    }

    async seedKnockout(): Promise<void> {
        const data = this.detail();
        if (!data) {
            return;
        }

        this.busy.set(true);

        try {
            const result = await firstValueFrom(this.api.seedKnockout(data.tournament.id));
            await this.store.reload();
            this.fixtureMessage.set(this.i18n.format(this.t().setup.seeded, { count: result.seeded }));
        } catch {
            this.fixtureMessage.set(this.t().setup.seedFailed);
        } finally {
            this.busy.set(false);
        }
    }
}
