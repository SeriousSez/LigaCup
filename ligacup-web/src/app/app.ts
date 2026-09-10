import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { I18nService } from './core/i18n/i18n.service';
import { AdminGuide } from './shared/admin-guide';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AdminGuide],
  template: `
    <header class="site-header">
      <div class="container spread">
        <a routerLink="/" class="brand">
          <img src="assets/liga-cup-logo.png" alt="" />
          <span>Liga Cup</span>
        </a>

        <nav>
          <a
            class="home-link"
            routerLink="/"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            >{{ t().nav.tournaments }}</a
          >
          @if (auth.isLoggedIn()) {
            <a routerLink="/admin" routerLinkActive="active">{{ t().nav.admin }}</a>
            <button class="ghost sign-out" type="button" (click)="auth.logout()">
              {{ t().nav.signOut }}
            </button>
          } @else {
            <a routerLink="/login" routerLinkActive="active">{{ t().nav.signIn }}</a>
          }
          <button
            class="ghost lang"
            type="button"
            [attr.aria-label]="t().nav.languageLabel"
            (click)="i18n.toggle()"
          >
            {{ i18n.language() === 'da' ? 'EN' : 'DA' }}
          </button>
        </nav>
      </div>
    </header>

    <main class="container">
      <router-outlet />
    </main>

    <footer class="container muted">{{ t().footer }}</footer>
    <app-admin-guide />
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

    .brand img {
      width: 2.2rem;
      height: 2.2rem;
      object-fit: contain;
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
      white-space: nowrap;
    }

    nav a.active {
      color: var(--accent);
    }

    /* The brand already links home, so the phone header drops the duplicate. */
    nav a.home-link {
      display: none;
    }

    @media (min-width: 560px) {
      nav a.home-link {
        display: inline-flex;
      }
    }

    .sign-out {
      border-color: transparent;
      color: var(--text-muted);
      font-size: 0.9rem;
      padding-inline: 0.55rem;
      white-space: nowrap;
    }

    .lang {
      border-color: var(--surface-line);
      color: var(--text-muted);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding-inline: 0.5rem;
      margin-left: 0.15rem;
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
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
}
