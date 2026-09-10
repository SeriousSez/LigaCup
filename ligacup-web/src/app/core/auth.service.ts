import {
    HttpErrorResponse,
    HttpEvent,
    HttpHandlerFn,
    HttpInterceptorFn,
    HttpRequest,
    HttpClient,
} from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, from, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse } from './models';

const STORAGE_KEY = 'ligacup.auth';

/** Renew this far before the access token expires, so a slow request never races the clock. */
const RENEW_BEFORE_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly session = signal<AuthResponse | null>(restore());

    /** Shared so several parallel requests trigger only one refresh call. */
    private inFlightRefresh: Promise<AuthResponse | null> | null = null;

    readonly user = computed(() => this.session());
    readonly isLoggedIn = computed(() => this.session() !== null);
    readonly isAdmin = computed(() => this.session()?.role === 'Admin');

    login(username: string, password: string) {
        return this.http
            .post<AuthResponse>(`${environment.apiBaseUrl}/api/auth/login`, { username, password })
            .pipe(tap((response) => this.store(response)));
    }

    async logout(): Promise<void> {
        const refreshToken = this.session()?.refreshToken;
        this.clear();

        if (refreshToken) {
            try {
                await this.http
                    .post<void>(`${environment.apiBaseUrl}/api/auth/logout`, { refreshToken })
                    .toPromise();
            } catch {
                // The local session is already gone, so a failed revoke is not worth surfacing.
            }
        }

        void this.router.navigate(['/']);
    }

    /** The access token, refreshed first when it is expired or about to be. */
    async validToken(): Promise<string | null> {
        const session = this.session();
        if (!session) {
            return null;
        }

        const expiresAt = new Date(session.expiresUtc).getTime();
        if (expiresAt - Date.now() > RENEW_BEFORE_MS) {
            return session.token;
        }

        const refreshed = await this.refresh();
        return refreshed?.token ?? null;
    }

    async refresh(): Promise<AuthResponse | null> {
        this.inFlightRefresh ??= this.performRefresh().finally(() => {
            this.inFlightRefresh = null;
        });

        return this.inFlightRefresh;
    }

    private async performRefresh(): Promise<AuthResponse | null> {
        const refreshToken = this.session()?.refreshToken;
        if (!refreshToken) {
            this.clear();
            return null;
        }

        try {
            const response = await this.http
                .post<AuthResponse>(`${environment.apiBaseUrl}/api/auth/refresh`, { refreshToken })
                .toPromise();

            if (!response) {
                this.clear();
                return null;
            }

            this.store(response);
            return response;
        } catch {
            this.clear();
            return null;
        }
    }

    private store(response: AuthResponse): void {
        this.session.set(response);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
    }

    private clear(): void {
        this.session.set(null);
        localStorage.removeItem(STORAGE_KEY);
    }
}

/**
 * Keeps a stored session usable across restarts. The access token may well be expired
 * here, which is fine: the refresh token is what proves the session is still valid.
 */
function restore(): AuthResponse | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as AuthResponse;
        return parsed.refreshToken ? parsed : null;
    } catch {
        localStorage.removeItem(STORAGE_KEY);
        return null;
    }
}

const AUTH_FREE_PATHS = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout'];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
    const auth = inject(AuthService);

    // Only attach the bearer token to our own API so it never leaks to third-party hosts.
    const isOwnApi = request.url.startsWith(environment.apiBaseUrl);
    const isAuthCall = AUTH_FREE_PATHS.some((path) => request.url.includes(path));

    if (!isOwnApi || isAuthCall) {
        return next(request);
    }

    return from(auth.validToken()).pipe(
        switchMap((token) => {
            const authorised = token
                ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
                : request;

            return next(authorised).pipe(
                catchError((error: unknown) => retryOnce(error, auth, authorised, next)),
            );
        }),
    );
};

/** A 401 can still mean a token revoked server-side, so try one forced refresh. */
function retryOnce(
    error: unknown,
    auth: AuthService,
    request: HttpRequest<unknown>,
    next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
    if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
    }

    return from(auth.refresh()).pipe(
        switchMap((session) => {
            if (!session) {
                return throwError(() => error);
            }

            return next(request.clone({ setHeaders: { Authorization: `Bearer ${session.token}` } }));
        }),
    );
}
