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

        <nav>
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"
            >Tournaments</a
          >
          @if (auth.isLoggedIn()) {
            <a routerLink="/admin" routerLinkActive="active">Admin</a>
            <button class="ghost sign-out" type="button" (click)="auth.logout()">Sign out</button>
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
      background: rgb(4 20 11 / 82%);
      backdrop-filter: blur(10px);
      position: sticky;
      top: 0;
      z-index: 10;
      padding-block: 0.5rem;
      padding-top: max(0.5rem, env(safe-area-inset-top, 0px));
      margin-bottom: 1.1rem;
    }

    .site-header .spread {
      flex-wrap: nowrap;
      gap: 0.5rem;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      color: var(--text);
      font-weight: 700;
      font-size: 1.05rem;
      letter-spacing: -0.02em;
      white-space: nowrap;
    }

    .brand:hover {
      text-decoration: none;
    }

    .ball {
      font-size: 1.2rem;
    }

    nav {
      display: flex;
      align-items: center;
      gap: 0.15rem;
    }

    nav a {
      color: var(--text-muted);
      display: inline-flex;
      align-items: center;
      min-height: var(--tap);
      padding-inline: 0.55rem;
      font-size: 0.9rem;
    }

    nav a.active {
      color: var(--accent);
    }

    .sign-out {
      border-color: transparent;
      color: var(--text-muted);
      font-size: 0.9rem;
      padding-inline: 0.55rem;
    }

    main {
      padding-bottom: 2rem;
      min-height: 60vh;
    }

    footer {
      padding-block: 1.25rem;
      padding-bottom: calc(1.25rem + var(--safe-bottom));
      border-top: 1px solid var(--surface-line);
      font-size: 0.85rem;
    }

    @media (min-width: 700px) {
      .site-header {
        padding-block: 0.85rem;
        margin-bottom: 1.75rem;
      }

      .brand {
        font-size: 1.15rem;
      }
    }
  `,
})
export class App {
  protected readonly auth = inject(AuthService);
}
