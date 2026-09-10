import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { TournamentStore } from '../../core/tournament.store';
import { SaveTournamentRequest, TiebreakerRule } from '../../core/models';

@Component({
  selector: 'app-admin-setup',
  imports: [FormsModule, RouterLink],
  template: `
    @if (detail(); as data) {
      <section class="spread heading">
        <div>
          <h1>{{ data.tournament.name }}</h1>
          <p class="muted">Setup and rules</p>
        </div>
        <div class="row">
          <a [routerLink]="['/admin', data.tournament.slug, 'live']">
            <button class="primary" type="button">Live console</button>
          </a>
          <a [routerLink]="['/', data.tournament.slug]">
            <button class="ghost" type="button">Public page</button>
          </a>
        </div>
      </section>

      <section class="card stack">
        <h3>Rules</h3>
        <div class="form-grid">
          <label>
            Name
            <input [(ngModel)]="settings.name" />
          </label>
          <label>
            Season
            <input type="number" [(ngModel)]="settings.season" />
          </label>
          <label>
            Status
            <select [(ngModel)]="settings.status">
              <option value="Draft">Draft</option>
              <option value="InProgress">In progress</option>
              <option value="Completed">Completed</option>
              <option value="Archived">Archived</option>
            </select>
          </label>
          <label>
            Format
            <select [(ngModel)]="settings.format">
              <option value="GroupsThenKnockout">Groups then knockout</option>
              <option value="GroupsOnly">Group stage only</option>
              <option value="KnockoutOnly">Straight knockout</option>
            </select>
          </label>
          <label>
            Points for a win
            <input type="number" [(ngModel)]="settings.pointsForWin" />
          </label>
          <label>
            Points for a draw
            <input type="number" [(ngModel)]="settings.pointsForDraw" />
          </label>
          <label>
            Points for a loss
            <input type="number" [(ngModel)]="settings.pointsForLoss" />
          </label>
          <label>
            Times each pair meets
            <input type="number" min="1" max="4" [(ngModel)]="settings.groupRounds" />
          </label>
          <label>
            Teams advancing per group
            <input type="number" min="0" [(ngModel)]="settings.teamsAdvancingPerGroup" />
          </label>
          <label>
            Match length (minutes)
            <input type="number" min="1" [(ngModel)]="settings.matchDurationMinutes" />
          </label>
        </div>

        <div class="row toggles">
          <label class="checkbox">
            <input type="checkbox" [(ngModel)]="settings.trackPlayers" />
            Track players and goalscorers
          </label>
          <label class="checkbox">
            <input type="checkbox" [(ngModel)]="settings.trackCards" />
            Track cards
          </label>
          <label class="checkbox">
            <input type="checkbox" [(ngModel)]="settings.hasThirdPlacePlayOff" />
            Third place play-off
          </label>
        </div>

        <div class="stack">
          <h4>Tiebreakers, in order</h4>
          <p class="muted">
            Applied after points. Head-to-head rules only compare the teams that are still level.
          </p>
          <div class="tiebreakers">
            @for (rule of tiebreakers(); track rule; let index = $index) {
              <div class="rule">
                <span>{{ index + 1 }}. {{ tiebreakerLabel(rule) }}</span>
                <button type="button" class="ghost" (click)="moveRule(index, -1)" [disabled]="index === 0">
                  &uarr;
                </button>
                <button
                  type="button"
                  class="ghost"
                  (click)="moveRule(index, 1)"
                  [disabled]="index === tiebreakers().length - 1"
                >
                  &darr;
                </button>
                <button type="button" class="danger" (click)="removeRule(index)">Remove</button>
              </div>
            }
          </div>
          <div class="row">
            <select [(ngModel)]="ruleToAdd">
              @for (rule of availableRules(); track rule) {
                <option [value]="rule">{{ tiebreakerLabel(rule) }}</option>
              }
            </select>
            <button type="button" (click)="addRule()" [disabled]="!availableRules().length">Add</button>
          </div>
        </div>

        <div class="row">
          <button class="primary" type="button" (click)="saveSettings()" [disabled]="busy()">
            Save rules
          </button>
          @if (message()) {
            <span class="muted">{{ message() }}</span>
          }
        </div>
      </section>

      <section class="card stack">
        <h3>Groups</h3>
        <div class="row">
          @for (group of data.groups; track group.id) {
            <span class="badge">
              {{ group.name }}
              <button type="button" class="danger tiny" (click)="removeGroup(group.id)">&times;</button>
            </span>
          } @empty {
            <span class="muted">No groups. Teams without a group form one combined league.</span>
          }
        </div>
        <div class="row">
          <input class="narrow" [(ngModel)]="newGroupName" placeholder="Group A" />
          <button type="button" (click)="addGroup()">Add group</button>
        </div>
      </section>

      <section class="card stack">
        <h3>Teams</h3>
        <table>
          <thead>
            <tr>
              <th>Team</th>
              <th>Short</th>
              <th>Group</th>
              <th class="numeric">Points adj.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (team of data.teams; track team.id) {
              <tr>
                <td>{{ team.name }}</td>
                <td class="muted">{{ team.shortName ?? '-' }}</td>
                <td>
                  <select
                    [ngModel]="team.groupId"
                    (ngModelChange)="assignGroup(team.id, team.name, team.shortName, $event)"
                  >
                    <option [ngValue]="null">Unassigned</option>
                    @for (group of data.groups; track group.id) {
                      <option [ngValue]="group.id">{{ group.name }}</option>
                    }
                  </select>
                </td>
                <td class="numeric">{{ team.pointsAdjustment }}</td>
                <td>
                  <button type="button" class="danger" (click)="removeTeam(team.id)">Remove</button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="muted">No teams yet.</td>
              </tr>
            }
          </tbody>
        </table>

        <div class="row">
          <input class="narrow" [(ngModel)]="newTeamName" placeholder="Team name" />
          <input class="tiny-input" [(ngModel)]="newTeamShort" placeholder="ABC" maxlength="10" />
          <select [(ngModel)]="newTeamGroupId" class="narrow">
            <option [ngValue]="null">Unassigned</option>
            @for (group of data.groups; track group.id) {
              <option [ngValue]="group.id">{{ group.name }}</option>
            }
          </select>
          <button type="button" (click)="addTeam()">Add team</button>
        </div>
      </section>

      @if (data.tournament.trackPlayers) {
        <section class="card stack">
          <h3>Squads</h3>
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
                  <span class="muted">No players yet.</span>
                }
              </div>
              <div class="row">
                <input class="narrow" [(ngModel)]="playerDrafts[team.id]" placeholder="Player name" />
                <button type="button" (click)="addPlayer(team.id)">Add player</button>
              </div>
            </div>
          }
        </section>
      }

      <section class="card stack">
        <h3>Fixtures</h3>
        <p class="muted">
          Group fixtures are a full round robin. The knockout bracket is created with placeholders and
          fills itself in as ties are decided.
        </p>
        <div class="row">
          <label class="checkbox">
            <input type="checkbox" [(ngModel)]="generateGroups" />
            Group stage
          </label>
          <label class="checkbox">
            <input type="checkbox" [(ngModel)]="generateKnockout" />
            Knockout bracket
          </label>
          <label class="checkbox">
            <input type="checkbox" [(ngModel)]="replaceExisting" />
            Replace existing fixtures
          </label>
        </div>
        <div class="row">
          <button class="primary" type="button" (click)="generate()" [disabled]="busy()">
            Generate fixtures
          </button>
          <button type="button" (click)="seedKnockout()" [disabled]="busy()">
            Seed knockout from tables
          </button>
        </div>
        @if (fixtureMessage()) {
          <p class="muted">{{ fixtureMessage() }}</p>
        }
      </section>
    } @else {
      <p class="muted">Loading...</p>
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
      margin-bottom: 1.25rem;
    }

    .toggles {
      gap: 1.25rem;
    }

    .narrow {
      max-width: 220px;
    }

    .tiny-input {
      max-width: 90px;
    }

    .tiny {
      padding: 0 0.25rem;
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
      gap: 0.5rem;
      background: var(--surface-raised);
      border-radius: 10px;
      padding: 0.35rem 0.6rem;
    }

    .rule span {
      flex: 1;
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
  `,
})
export class AdminSetup implements OnInit {
  readonly slug = input.required<string>();

  private readonly api = inject(ApiService);
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

  protected ruleToAdd: TiebreakerRule = 'GoalDifference';
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
    matchDurationMinutes: 90,
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
    };

    this.tiebreakers.set(['GoalDifference', 'GoalsScored', 'HeadToHeadPoints', 'Wins', 'TeamName']);
  }

  tiebreakerLabel(rule: TiebreakerRule): string {
    const labels: Record<TiebreakerRule, string> = {
      GoalDifference: 'Goal difference',
      GoalsScored: 'Goals scored',
      GoalsConceded: 'Fewest goals conceded',
      Wins: 'Most wins',
      HeadToHeadPoints: 'Head-to-head points',
      HeadToHeadGoalDifference: 'Head-to-head goal difference',
      HeadToHeadGoalsScored: 'Head-to-head goals scored',
      DisciplinaryPoints: 'Fewest disciplinary points',
      TeamName: 'Alphabetical',
    };

    return labels[rule];
  }

  addRule(): void {
    if (this.ruleToAdd && !this.tiebreakers().includes(this.ruleToAdd)) {
      this.tiebreakers.update((rules) => [...rules, this.ruleToAdd]);
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
      this.message.set('Saved.');
    } catch {
      this.message.set('Could not save the rules.');
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
      this.message.set('Delete the team fixtures before removing the team.');
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
      this.fixtureMessage.set(`Generated ${result.generated} fixtures.`);
    } catch {
      this.fixtureMessage.set(
        'Fixtures already exist. Tick "replace existing fixtures" to regenerate them.',
      );
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
      this.fixtureMessage.set(`Filled ${result.seeded} knockout ties from the group tables.`);
    } catch {
      this.fixtureMessage.set('The knockout bracket could not be seeded.');
    } finally {
      this.busy.set(false);
    }
  }
}
