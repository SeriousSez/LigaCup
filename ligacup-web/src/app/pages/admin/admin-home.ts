import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { SaveTournamentRequest, TournamentFormat, TournamentSummary } from '../../core/models';

@Component({
    selector: 'app-admin-home',
    imports: [RouterLink, FormsModule],
    template: `
    <h1>Admin</h1>

    <section class="card stack create">
      <h3>New tournament</h3>
      <div class="form-grid">
        <label>
          Name
          <input [(ngModel)]="draft.name" placeholder="Liga Cup" />
        </label>
        <label>
          Season
          <input type="number" [(ngModel)]="draft.season" />
        </label>
        <label>
          Format
          <select [(ngModel)]="draft.format">
            <option value="GroupsThenKnockout">Groups then knockout</option>
            <option value="GroupsOnly">Group stage only</option>
            <option value="KnockoutOnly">Straight knockout</option>
          </select>
        </label>
      </div>
      <label class="checkbox">
        <input type="checkbox" [(ngModel)]="draft.trackPlayers" />
        Track players and goalscorers
      </label>
      <div class="row">
        <button class="primary" type="button" [disabled]="busy()" (click)="create()">
          Create tournament
        </button>
        @if (error()) {
          <span class="error">{{ error() }}</span>
        }
      </div>
    </section>

    <section class="stack">
      <h3>Your tournaments</h3>
      <div class="grid-auto">
        @for (tournament of tournaments(); track tournament.id) {
          <div class="card stack">
            <div class="spread">
              <strong>{{ tournament.name }}</strong>
              <span class="badge">{{ tournament.season }}</span>
            </div>
            <p class="muted">{{ tournament.teamCount }} teams, {{ tournament.matchCount }} matches</p>
            <div class="row">
              <a [routerLink]="['/admin', tournament.slug]"><button type="button">Set up</button></a>
              <a [routerLink]="['/admin', tournament.slug, 'live']">
                <button class="primary" type="button">Live console</button>
              </a>
              <a [routerLink]="['/', tournament.slug]"><button class="ghost" type="button">View</button></a>
            </div>
          </div>
        } @empty {
          <p class="muted">Nothing here yet. Create your first tournament above.</p>
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
            this.error.set('Give the tournament a name first.');
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
            matchDurationMinutes: 90,
            tiebreakers: null,
        };

        try {
            await firstValueFrom(this.api.createTournament(request));
            this.draft.name = '';
            await this.refresh();
        } catch {
            this.error.set('The tournament could not be created.');
        } finally {
            this.busy.set(false);
        }
    }
}
