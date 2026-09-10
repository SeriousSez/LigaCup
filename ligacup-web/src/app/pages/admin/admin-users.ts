import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { CreateUserRequest, User, UserRole } from '../../core/models';
import { CardListSkeleton } from '../../shared/loading-skeletons';
import { SelectField, SelectOption } from '../../shared/select-field';

@Component({
    selector: 'app-admin-users',
    imports: [FormsModule, RouterLink, DatePipe, CardListSkeleton, SelectField],
    template: `
    <section class="spread heading">
      <div>
        <h1>{{ t().users.title }}</h1>
        <p class="muted">{{ t().users.subtitle }}</p>
      </div>
      <a routerLink="/admin"><button class="ghost" type="button">{{ t().adminHome.title }}</button></a>
    </section>

    <section class="card stack">
      <h3>{{ t().users.newUser }}</h3>
      <div class="form-grid">
        <label>
          {{ t().users.username }}
          <input [(ngModel)]="draft.username" autocomplete="off" />
        </label>
        <label>
          {{ t().users.email }}
          <input type="email" [(ngModel)]="draft.email" autocomplete="off" />
        </label>
        <div class="field">
          <label for="new-user-password">{{ t().users.password }}</label>
          <div class="password-field">
            <input
              id="new-user-password"
              [type]="showPassword() ? 'text' : 'password'"
              [(ngModel)]="draft.password"
              autocomplete="new-password"
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
        <label>
          {{ t().users.role }}
          <app-select [options]="roleOptions()" [(ngModel)]="draft.role" />
        </label>
      </div>
      <p class="muted hint">{{ t().users.passwordHint }} {{ t().users.roleHelp }}</p>
      <div class="row">
        <button class="primary" type="button" [disabled]="busy()" (click)="create()">
          {{ t().users.create }}
        </button>
        @if (message()) {
          <span class="muted">{{ message() }}</span>
        }
        @if (error()) {
          <span class="error">{{ error() }}</span>
        }
      </div>
    </section>

    @if (loading()) {
      <p class="sr-only" role="status">{{ t().common.loading }}</p>
      <app-card-list-skeleton [count]="2" />
    } @else {
      <div class="stack">
        @for (user of users(); track user.id) {
          <section class="card stack user">
            <div class="spread">
              <div class="identity">
                <strong>{{ user.username }}</strong>
                <span class="muted">{{ user.email ?? '-' }}</span>
              </div>
              @if (user.username === auth.user()?.username) {
                <span class="badge connected">{{ t().users.you }}</span>
              }
            </div>

            <div class="form-grid">
              <label>
                {{ t().users.email }}
                <input type="email" [(ngModel)]="user.email" />
              </label>
              <label>
                {{ t().users.role }}
                <app-select [options]="roleOptions()" [(ngModel)]="user.role" />
              </label>
              <label class="checkbox active-toggle">
                <input type="checkbox" [(ngModel)]="user.isActive" />
                {{ t().users.active }}
              </label>
            </div>

            <p class="muted meta">
              {{ t().users.lastLogin }}:
              {{ user.lastLoginUtc ? (user.lastLoginUtc | date: 'd MMM y HH:mm' : undefined : locale()) : t().users.never }}
            </p>

            <div class="row">
              <button type="button" (click)="save(user)" [disabled]="busy()">{{ t().users.save }}</button>
              <button type="button" (click)="startReset(user.id)" [disabled]="busy()">
                {{ t().users.resetPassword }}
              </button>
              <button type="button" class="danger" (click)="remove(user)" [disabled]="busy()">
                {{ t().users.deleteUser }}
              </button>
            </div>

            @if (resettingId() === user.id) {
              <div class="reset">
                <label>
                  {{ t().users.newPassword }}
                  <input type="text" [(ngModel)]="newPassword" autocomplete="new-password" />
                </label>
                <div class="align-end">
                  <button class="primary" type="button" (click)="confirmReset(user.id)">
                    {{ t().users.save }}
                  </button>
                </div>
              </div>
            }
          </section>
        } @empty {
          <p class="muted">{{ t().users.empty }}</p>
        }
      </div>
    }
  `,
    styles: `
    .heading {
      margin-bottom: 1.25rem;
    }

    .heading p {
      margin: 0;
      font-size: 0.9rem;
    }

    section.card {
      margin-bottom: 1rem;
    }

    .identity {
      display: grid;
      gap: 0.1rem;
      min-width: 0;
    }

    .identity span {
      font-size: 0.85rem;
    }

    .hint,
    .meta {
      margin: 0;
      font-size: 0.85rem;
    }

    .active-toggle {
      align-self: end;
    }

    /* Side by side rather than overlaid, so the button never fights the input for clicks. */
    .password-field {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.4rem;
    }

    .field {
      display: grid;
      gap: 0.3rem;
    }

    .field label {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .reveal {
      width: var(--tap);
      display: grid;
      place-items: center;
      color: var(--text-muted);
    }

    .reset {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.5rem;
      align-items: end;
      border-top: 1px solid var(--surface-line);
      padding-top: 0.75rem;
    }
  `,
})
export class AdminUsers {
    private readonly api = inject(ApiService);
    private readonly i18n = inject(I18nService);
    protected readonly auth = inject(AuthService);
    protected readonly t = this.i18n.t;
    protected readonly locale = this.i18n.locale;

    protected readonly users = signal<User[]>([]);
    protected readonly loading = signal(true);
    protected readonly busy = signal(false);
    protected readonly message = signal<string | null>(null);
    protected readonly error = signal<string | null>(null);
    protected readonly showPassword = signal(false);
    protected readonly resettingId = signal<number | null>(null);
    protected newPassword = '';

    protected readonly roleOptions = computed<SelectOption<UserRole>[]>(() => {
        const labels = this.t().userRole;
        return [
            { value: 'Viewer', label: labels.Viewer },
            { value: 'Editor', label: labels.Editor },
            { value: 'Admin', label: labels.Admin },
        ];
    });

    protected draft: CreateUserRequest = {
        username: '',
        email: null,
        password: '',
        role: 'Editor' as UserRole,
    };

    constructor() {
        void this.refresh();
    }

    async refresh(): Promise<void> {
        try {
            this.users.set(await firstValueFrom(this.api.getUsers()));
        } finally {
            this.loading.set(false);
        }
    }

    async create(): Promise<void> {
        this.busy.set(true);
        this.message.set(null);
        this.error.set(null);

        try {
            await firstValueFrom(
                this.api.createUser({
                    ...this.draft,
                    username: this.draft.username.trim(),
                    email: this.draft.email?.trim() || null,
                }),
            );

            this.draft = { username: '', email: null, password: '', role: 'Editor' as UserRole };
            this.message.set(this.t().users.created);
            await this.refresh();
        } catch (failure) {
            this.error.set(this.describe(failure));
        } finally {
            this.busy.set(false);
        }
    }

    async save(user: User): Promise<void> {
        this.busy.set(true);
        this.message.set(null);
        this.error.set(null);

        try {
            await firstValueFrom(
                this.api.updateUser(user.id, {
                    email: user.email?.trim() || null,
                    role: user.role,
                    isActive: user.isActive,
                }),
            );
            this.message.set(this.t().users.saved);
            await this.refresh();
        } catch (failure) {
            this.error.set(this.describe(failure));
            await this.refresh();
        } finally {
            this.busy.set(false);
        }
    }

    startReset(userId: number): void {
        this.newPassword = '';
        this.resettingId.set(this.resettingId() === userId ? null : userId);
    }

    async confirmReset(userId: number): Promise<void> {
        this.busy.set(true);
        this.message.set(null);
        this.error.set(null);

        try {
            await firstValueFrom(this.api.resetUserPassword(userId, this.newPassword));
            this.resettingId.set(null);
            this.newPassword = '';
            this.message.set(this.t().users.passwordReset);
        } catch (failure) {
            this.error.set(this.describe(failure));
        } finally {
            this.busy.set(false);
        }
    }

    async remove(user: User): Promise<void> {
        if (!confirm(this.t().users.confirmDelete)) {
            return;
        }

        this.busy.set(true);
        this.message.set(null);
        this.error.set(null);

        try {
            await firstValueFrom(this.api.deleteUser(user.id));
            await this.refresh();
        } catch (failure) {
            this.error.set(this.describe(failure));
        } finally {
            this.busy.set(false);
        }
    }

    /** Surfaces the server's reason, which explains guards like the last-administrator rule. */
    private describe(failure: unknown): string {
        const message = (failure as { error?: { message?: string } })?.error?.message;
        return message ?? this.t().common.somethingWentWrong;
    }
}
