import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { CardListSkeleton } from '../../shared/loading-skeletons';

@Component({
  selector: 'app-home',
  imports: [DatePipe, RouterLink, CardListSkeleton],
  template: `
    <section class="hero card">
      <div class="hero-copy">
        <h1>Liga Cup</h1>
        <p class="muted">{{ t().home.tagline }}</p>
        @if (auth.isLoggedIn()) {
          <a routerLink="/admin"><button class="primary" type="button">{{ t().home.openAdmin }}</button></a>
        }
      </div>
      <img class="hero-logo" src="assets/liga-cup-logo.png" alt="Liga Cup" />
    </section>

    @if (tournaments(); as list) {
      <div class="grid-auto tournaments">
        @for (tournament of list; track tournament.id) {
          <a class="card tournament" [routerLink]="['/', tournament.slug]">
            <div class="spread">
              <h3>{{ tournament.name }}</h3>
              @if (tournament.tournamentDateUtc) {
                <span class="badge">
                  {{ tournament.tournamentDateUtc | date: 'd MMM yyyy' : undefined : locale() }}
                </span>
              }
            </div>
            @if (tournament.description) {
              <p class="muted">{{ tournament.description }}</p>
            }
            <div class="row muted stats">
              <span>{{ tournament.teamCount }} {{ t().common.teams }}</span>
              <span>{{ tournament.matchCount }} {{ t().common.matches }}</span>
              <span>{{ t().tournamentStatus[tournament.status] }}</span>
            </div>
          </a>
        } @empty {
          <p class="muted">{{ t().home.empty }}</p>
        }
      </div>
    } @else {
      <p class="sr-only" role="status">{{ t().home.loading }}</p>
      <app-card-list-skeleton [count]="3" />
    }
  `,
  styles: `
    .hero {
      margin-bottom: 1.5rem;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.75rem;
      justify-items: start;
      align-items: center;
    }

    .hero p {
      max-width: 55ch;
      margin: 0;
    }

    .hero-copy {
      display: grid;
      gap: 0.75rem;
    }

    .hero-logo {
      width: clamp(7rem, 16vw, 11rem);
      height: clamp(7rem, 16vw, 11rem);
      object-fit: contain;
      opacity: 0.92;
    }

    @media (max-width: 560px) {
      .hero {
        grid-template-columns: 1fr;
      }

      .hero-logo {
        width: 5rem;
        height: 5rem;
        justify-self: end;
        grid-row: 1;
      }
    }

    .tournament {
      display: grid;
      gap: 0.6rem;
      color: inherit;
      align-content: start;
    }

    .tournament:hover {
      border-color: var(--accent);
      text-decoration: none;
    }

    .tournament p {
      margin: 0;
    }

    .stats {
      font-size: 0.85rem;
      gap: 1rem;
    }
  `,
})
export class Home {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);

  private readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly locale = this.i18n.locale;
  protected readonly tournaments = toSignal(this.api.getTournaments());
}
