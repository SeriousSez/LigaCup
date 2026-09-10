import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <section class="hero card">
      <h1>Liga Cup</h1>
      <p class="muted">
        Live scores, automatic group tables and a knockout bracket that fills itself in as results
        come in.
      </p>
      @if (auth.isLoggedIn()) {
        <a routerLink="/admin"><button class="primary" type="button">Open admin</button></a>
      }
    </section>

    @if (tournaments(); as list) {
      <div class="grid-auto tournaments">
        @for (tournament of list; track tournament.id) {
          <a class="card tournament" [routerLink]="['/', tournament.slug]">
            <div class="spread">
              <h3>{{ tournament.name }}</h3>
              <span class="badge">{{ tournament.season }}</span>
            </div>
            @if (tournament.description) {
              <p class="muted">{{ tournament.description }}</p>
            }
            <div class="row muted stats">
              <span>{{ tournament.teamCount }} teams</span>
              <span>{{ tournament.matchCount }} matches</span>
              <span>{{ statusLabel(tournament.status) }}</span>
            </div>
          </a>
        } @empty {
          <p class="muted">No tournaments have been created yet.</p>
        }
      </div>
    } @else {
      <p class="muted">Loading tournaments...</p>
    }
  `,
  styles: `
    .hero {
      margin-bottom: 1.5rem;
      display: grid;
      gap: 0.75rem;
      justify-items: start;
    }

    .hero p {
      max-width: 55ch;
      margin: 0;
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

  protected readonly tournaments = toSignal(this.api.getTournaments());

  statusLabel(status: string): string {
    return status === 'InProgress' ? 'In progress' : status;
  }
}
