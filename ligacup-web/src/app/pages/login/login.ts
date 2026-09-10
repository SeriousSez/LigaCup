import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <section class="card login">
      <h1>Sign in</h1>
      <p class="muted">Organiser access for live scoring and tournament setup.</p>

      <form (ngSubmit)="submit()" class="stack">
        <label>
          Username
          <input name="username" [(ngModel)]="username" autocomplete="username" required />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            [(ngModel)]="password"
            autocomplete="current-password"
            required
          />
        </label>

        @if (error()) {
          <p class="error">{{ error() }}</p>
        }

        <button class="primary" type="submit" [disabled]="busy()">
          {{ busy() ? 'Signing in...' : 'Sign in' }}
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
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected username = '';
  protected password = '';
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  submit(): void {
    if (!this.username || !this.password) {
      return;
    }

    this.busy.set(true);
    this.error.set(null);

    this.auth.login(this.username, this.password).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/admin';
        this.router.navigateByUrl(returnUrl);
      },
      error: () => {
        this.busy.set(false);
        this.error.set('That username and password combination was not accepted.');
      },
    });
  }
}
