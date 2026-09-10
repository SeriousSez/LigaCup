import { HttpInterceptorFn } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse } from './models';

const STORAGE_KEY = 'ligacup.auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly session = signal<AuthResponse | null>(this.restore());

    readonly user = computed(() => this.session());
    readonly isLoggedIn = computed(() => {
        const session = this.session();
        return !!session && new Date(session.expiresUtc).getTime() > Date.now();
    });

    login(username: string, password: string) {
        return this.http
            .post<AuthResponse>(`${environment.apiBaseUrl}/api/auth/login`, { username, password })
            .pipe(
                tap((response) => {
                    this.session.set(response);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
                }),
            );
    }

    logout() {
        this.session.set(null);
        localStorage.removeItem(STORAGE_KEY);
        this.router.navigate(['/']);
    }

    token(): string | null {
        return this.isLoggedIn() ? this.session()!.token : null;
    }

    private restore(): AuthResponse | null {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return null;
        }

        try {
            const parsed = JSON.parse(raw) as AuthResponse;
            return new Date(parsed.expiresUtc).getTime() > Date.now() ? parsed : null;
        } catch {
            localStorage.removeItem(STORAGE_KEY);
            return null;
        }
    }
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
    const token = inject(AuthService).token();

    // Only attach the bearer token to our own API so it never leaks to third-party hosts.
    if (token && request.url.startsWith(environment.apiBaseUrl)) {
        return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
    }

    return next(request);
};
