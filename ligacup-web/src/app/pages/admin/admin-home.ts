import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { SaveTournamentRequest, TournamentFormat, TournamentSummary } from '../../core/models';

@Component({
    selector: 'app-admin-home',
    imports: [RouterLink, FormsModule],
    template: `
    <h1>{{ t().adminHome.title }}</h1>

    <section class="card stack create">
      <h3>{{ t().adminHome.newTournament }}</h3>
      <div class="form-grid">
        <label>
          {{ t().common.name }}
          <input [(ngModel)]="draft.name" placeholder="Liga Cup" />
        </label>
        <label>
          {{ t().common.season }}
          <input type="number" inputmode="numeric" [(ngModel)]="draft.season" />
        </label>
        <label>
          {{ t().setup.format }}
          <select [(ngModel)]="draft.format">
            <option value="GroupsThenKnockout">{{ t().format.GroupsThenKnockout }}</option>
            <option value="GroupsOnly">{{ t().format.GroupsOnly }}</option>
            <option value="KnockoutOnly">{{ t().format.KnockoutOnly }}</option>
          </select>
        </label>
      </div>
      <label class="checkbox">
        <input type="checkbox" [(ngModel)]="draft.trackPlayers" />
        {{ t().adminHome.trackPlayers }}
      </label>
      <div class="row">
        <button class="primary" type="button" [disabled]="busy()" (click)="create()">
          {{ t().adminHome.create }}
        </button>
        @if (error()) {
          <span class="error">{{ error() }}</span>
        }
      </div>
    </section>

    <section class="stack">
      <h3>{{ t().adminHome.yourTournaments }}</h3>
      <div class="grid-auto">
        @for (tournament of tournaments(); track tournament.id) {
          <div class="card stack">
            <div class="spread">
              <strong>{{ tournament.name }}</strong>
              <span class="badge">{{ tournament.season }}</span>
            </div>
            <p class="muted">
              {{ tournament.teamCount }} {{ t().common.teams }}, {{ tournament.matchCount }}
              {{ t().common.matches }}
            </p>
            <div class="row">
              <a [routerLink]="['/admin', tournament.slug]">
                <button type="button">{{ t().adminHome.setup }}</button>
              </a>
              <a [routerLink]="['/admin', tournament.slug, 'live']">
                <button class="primary" type="button">{{ t().adminHome.liveConsole }}</button>
              </a>
              <a [routerLink]="['/', tournament.slug]">
                <button class="ghost" type="button">{{ t().adminHome.view }}</button>
              </a>
            </div>
          </div>
        } @empty {
          <p class="muted">{{ t().adminHome.empty }}</p>
        }
      </div>
    </section>
  `,
    styles: `
    .create {
      margin-bottom: 1.75rem;
    }

    .create p {
      margin: 0;
    }
  `,
})
export class AdminHome {
    private readonly api = inject(ApiService);

    protected readonly t = inject(I18nService).t;
    protected readonly tournaments = signal<TournamentSummary[]>([]);
    protected readonly busy = signal(false);
    protected readonly error = signal<string | null>(null);

    protected draft = {
        name: '',
        season: new Date().getFullYear(),
        format: 'GroupsThenKnockout' as TournamentFormat,
        trackPlayers: false,
    };

    constructor() {
        void this.refresh();
    }

    async refresh(): Promise<void> {
        this.tournaments.set(await firstValueFrom(this.api.getTournaments()));
    }

    async create(): Promise<void> {
        if (!this.draft.name.trim()) {
            this.error.set(this.t().adminHome.nameRequired);
            return;
        }

        this.busy.set(true);
        this.error.set(null);

        const request: SaveTournamentRequest = {
            name: this.draft.name.trim(),
            slug: null,
            description: null,
            season: this.draft.season,
            format: this.draft.format,
            status: 'Draft',
            pointsForWin: 3,
            pointsForDraw: 1,
            pointsForLoss: 0,
            groupRounds: 1,
            teamsAdvancingPerGroup: 2,
            includeBestThirdPlaced: false,
            hasThirdPlacePlayOff: false,
            trackPlayers: this.draft.trackPlayers,
            trackCards: false,
            periodCount: 2,
            periodDurationMinutes: 45,
            breakDurationMinutes: 15,
            trackMatchClock: true,
            allowTimeouts: false,
            useStoppageTime: true,
            tiebreakers: null,
        };

        try {
            await firstValueFrom(this.api.createTournament(request));
            this.draft.name = '';
            await this.refresh();
        } catch {
            this.error.set(this.t().adminHome.createFailed);
        } finally {
            this.busy.set(false);
        }
    }
}
