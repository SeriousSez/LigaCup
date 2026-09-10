import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
    selector: 'app-login',
    imports: [FormsModule],
    template: `
    <section class="card login">
      <h1>{{ t().login.title }}</h1>
      <p class="muted">{{ t().login.subtitle }}</p>

      <form (ngSubmit)="submit()" class="stack">
        <label>
          {{ t().login.username }}
          <input name="username" [(ngModel)]="username" autocomplete="username" required />
        </label>
        <div class="field">
          <label for="password">{{ t().login.password }}</label>
          <div class="password-field">
            <input
              id="password"
              [type]="showPassword() ? 'text' : 'password'"
              name="password"
              [(ngModel)]="password"
              autocomplete="current-password"
              required
            />
            <button
              type="button"
              class="reveal"
              [attr.aria-label]="showPassword() ? t().login.hidePassword : t().login.showPassword"
              [attr.aria-pressed]="showPassword()"
              (click)="showPassword.set(!showPassword())"
            >
              <i
                class="fa-duotone fa-solid"
                [class.fa-eye]="!showPassword()"
                [class.fa-eye-slash]="showPassword()"
              ></i>
            </button>
          </div>
        </div>

        @if (failed()) {
          <p class="error">{{ t().login.failed }}</p>
        }

        <button class="primary" type="submit" [disabled]="busy()">
          {{ busy() ? t().login.submitting : t().login.submit }}
        </button>
      </form>
    </section>
  `,
    styles: `
    .login {
      max-width: 380px;
      margin-inline: auto;
      display: grid;
      gap: 1rem;
    }

    .login p {
      margin: 0;
    }

    .password-field {
      position: relative;
      display: block;
    }

    .field {
      display: grid;
      gap: 0.3rem;
    }

    .field label {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .password-field input {
      padding-right: 3rem;
    }

    .reveal {
      position: absolute;
      right: 0.25rem;
      top: 50%;
      transform: translateY(-50%);
      border-color: transparent;
      min-height: 38px;
      padding-inline: 0.5rem;
      font-size: 1rem;
      line-height: 1;
    }
  `,
})
export class Login {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly t = inject(I18nService).t;
    protected username = '';
    protected password = '';
    protected readonly busy = signal(false);
    protected readonly failed = signal(false);
    protected readonly showPassword = signal(false);

    submit(): void {
        if (!this.username || !this.password) {
            return;
        }

        this.busy.set(true);
        this.failed.set(false);

        this.auth.login(this.username, this.password).subscribe({
            next: () => {
                const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/admin';
                this.router.navigateByUrl(returnUrl);
            },
            error: () => {
                this.busy.set(false);
                this.failed.set(true);
            },
        });
    }
}
