import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="site-header">
      <div class="container spread">
        <a routerLink="/" class="brand">
          <span class="ball">&#9917;</span>
          <span>Liga Cup</span>
        </a>

        <nav class="row">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"
            >Tournaments</a
          >
          @if (auth.isLoggedIn()) {
            <a routerLink="/admin" routerLinkActive="active">Admin</a>
            <button class="ghost" type="button" (click)="auth.logout()">
              Sign out {{ auth.user()?.username }}
            </button>
          } @else {
            <a routerLink="/login" routerLinkActive="active">Sign in</a>
          }
        </nav>
      </div>
    </header>

    <main class="container">
      <router-outlet />
    </main>

    <footer class="container muted">Liga Cup &middot; live tables update automatically</footer>
  `,
  styles: `
    .site-header {
      border-bottom: 1px solid var(--surface-line);
      background: rgb(4 20 11 / 70%);
      backdrop-filter: blur(8px);
      position: sticky;
      top: 0;
      z-index: 10;
      padding-block: 0.85rem;
      margin-bottom: 1.75rem;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text);
      font-weight: 700;
      font-size: 1.15rem;
      letter-spacing: -0.02em;
    }

    .brand:hover {
      text-decoration: none;
    }

    .ball {
      font-size: 1.3rem;
    }

    nav a {
      color: var(--text-muted);
      padding: 0.35rem 0.1rem;
    }

    nav a.active {
      color: var(--accent);
    }

    main {
      padding-bottom: 3rem;
      min-height: 60vh;
    }

    footer {
      padding-block: 1.5rem;
      border-top: 1px solid var(--surface-line);
      font-size: 0.85rem;
    }
  `,
})
export class App {
  protected readonly auth = inject(AuthService);
}
