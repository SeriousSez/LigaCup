import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { defaultTournamentRulesWithoutDate } from '../../core/default-rules';
import { CardListSkeleton } from '../../shared/loading-skeletons';
import { SelectField, SelectOption } from '../../shared/select-field';
import { DateTimePicker } from '../../shared/date-time-picker';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import { SaveTournamentRequest, TournamentFormat, TournamentSummary } from '../../core/models';


@Component({
  selector: 'app-admin-home',
  imports: [RouterLink, FormsModule, DatePipe, CardListSkeleton, SelectField, DateTimePicker, ConfirmDialog],
  template: `
    <h1>{{ t().adminHome.title }}</h1>

    @if (auth.isAdmin()) {
      <p>
        <a routerLink="/admin/users"><button type="button">{{ t().users.manage }}</button></a>
      </p>
    }

    <section class="card stack create" data-guide-target="admin-create">
      <h3>{{ t().adminHome.newTournament }}</h3>
      <div class="form-grid">
        <label>
          {{ t().common.name }}
          <input [(ngModel)]="draft.name" placeholder="Liga Cup" />
        </label>
        <label>
          {{ t().common.tournamentDateTime }}
          <app-date-time-picker [(ngModel)]="draft.tournamentDateUtc" />
        </label>
        <label>
          {{ t().setup.format }}
          <app-select data-guide-target="admin-create-format" [options]="formatOptions()" [(ngModel)]="draft.format" />
        </label>
      </div>
      <label class="checkbox">
        <input type="checkbox" [(ngModel)]="draft.trackPlayers" />
        {{ t().adminHome.trackPlayers }}
      </label>
      <div class="row">
        <button class="primary" data-guide-target="admin-create-submit" type="button" [disabled]="busy()" (click)="create()">
          {{ t().adminHome.create }}
        </button>
        @if (error()) {
          <span class="error">{{ error() }}</span>
        }
      </div>
    </section>

    <section class="stack">
      <h3>{{ t().adminHome.yourTournaments }}</h3>
      @if (loading()) {
        <p class="sr-only" role="status">{{ t().common.loading }}</p>
        <app-card-list-skeleton [count]="2" />
      } @else {
        <div class="tournament-grid">
        @for (tournament of tournaments(); track tournament.id) {
          <article class="card stack tournament-card">
            <div class="spread">
              <strong>{{ tournament.name }}</strong>
              <span class="badge">
                {{ tournament.tournamentDateUtc ? (tournament.tournamentDateUtc | date: 'dd.MM.yyyy HH:mm') : tournament.season }}
              </span>
            </div>
            <p class="muted">
              {{ tournament.teamCount }} {{ t().common.teams }}, {{ tournament.matchCount }}
              {{ t().common.matches }}
            </p>
            <div class="tournament-actions">
              <a [routerLink]="['/admin', tournament.slug]">
                <button type="button">{{ t().adminHome.setup }}</button>
              </a>
              <a [routerLink]="['/admin', tournament.slug, 'live']">
                <button class="primary" type="button">{{ t().adminHome.liveConsole }}</button>
              </a>
              <a [routerLink]="['/', tournament.slug]">
                <button class="ghost" type="button">{{ t().adminHome.view }}</button>
              </a>
              <button class="danger" type="button" (click)="askDeleteTournament(tournament)">
                {{ t().adminHome.delete }}
              </button>
            </div>
          </article>
        } @empty {
          <p class="muted">{{ t().adminHome.empty }}</p>
        }
        </div>
      }
    </section>

    <app-confirm-dialog
      [open]="pendingDelete() !== null"
      [title]="t().adminHome.delete"
      [message]="pendingDelete() ? t().adminHome.deleteConfirm + '\n\n' + pendingDelete()!.name : ''"
      [confirmLabel]="t().adminHome.delete"
      [cancelLabel]="t().common.cancel"
      (confirmed)="confirmDeleteTournament()"
      (cancelled)="pendingDelete.set(null)"
    />
  `,
  styles: `
    .create {
      margin-bottom: 1.75rem;
    }

    .create p {
      margin: 0;
    }

    .tournament-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 0.85rem;
    }

    .tournament-card {
      min-width: 0;
    }

    .tournament-card p {
      margin: 0;
    }

    .tournament-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      align-items: center;
    }

    .tournament-actions a {
      display: contents;
    }
  `,
})
export class AdminHome {
  private readonly api = inject(ApiService);

  protected readonly auth = inject(AuthService);
  protected readonly t = inject(I18nService).t;
  protected readonly tournaments = signal<TournamentSummary[]>([]);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly pendingDelete = signal<TournamentSummary | null>(null);

  protected readonly formatOptions = computed<SelectOption<TournamentFormat>[]>(() => {
    const labels = this.t().format;
    return [
      { value: 'League', label: labels.League },
      { value: 'GroupsThenKnockout', label: labels.GroupsThenKnockout },
      { value: 'GroupsOnly', label: labels.GroupsOnly },
      { value: 'KnockoutOnly', label: labels.KnockoutOnly },
    ];
  });

  protected draft = {
    name: '',
    tournamentDateUtc: '2026-09-06T15:00',
    format: 'League' as TournamentFormat,
    trackPlayers: false,
  };

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    try {
      this.tournaments.set(await firstValueFrom(this.api.getTournaments()));
    } finally {
      this.loading.set(false);
    }
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
      rules: defaultTournamentRulesWithoutDate,
      season: new Date(this.draft.tournamentDateUtc).getFullYear(),
      tournamentDateUtc: this.draft.tournamentDateUtc,
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
      playerRegistrationMode: 'NamesAndNumbers',
      trackCards: false,
      periodCount: 1,
      periodDurationMinutes: 10,
      breakDurationMinutes: 0,
      matchIntervalMinutes: 5,
      matchesPerTimeSlot: 4,
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

  askDeleteTournament(tournament: TournamentSummary): void {
    this.pendingDelete.set(tournament);
  }

  async confirmDeleteTournament(): Promise<void> {
    const tournament = this.pendingDelete();
    this.pendingDelete.set(null);
    if (!tournament) {
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.deleteTournament(tournament.id));
      await this.refresh();
    } catch {
      this.error.set(this.t().adminHome.deleteFailed);
    } finally {
      this.busy.set(false);
    }
  }
}
