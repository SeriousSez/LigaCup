import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';

/** Keep an operation ID after ambiguous transport/server failures; never retry automatically. */
@Injectable({ providedIn: 'root' })
export class CommandRetries {
  private pending = new Map<string, string>();
  key(fingerprint: string): string {
    let key = this.pending.get(fingerprint);
    if (!key) { key = crypto.randomUUID(); this.pending.set(fingerprint, key); }
    return key;
  }
  complete(fingerprint: string): void { this.pending.delete(fingerprint); }
}
export const commandRetryInterceptor: HttpInterceptorFn = (request, next) => {
  if (!['POST', 'PUT', 'DELETE'].includes(request.method) || !/\/api\/(admin|live)\//.test(request.url) || request.body instanceof FormData) return next(request);
  const retries = inject(CommandRetries);
  const fingerprint = JSON.stringify([request.method, request.url, request.body]);
  const updated = request.clone({ setHeaders: { 'Idempotency-Key': retries.key(fingerprint) } });
  return next(updated).pipe(
    tap(event => { if ('status' in event && event.status >= 200) retries.complete(fingerprint); }),
    catchError((error: HttpErrorResponse) => {
      if (error.status >= 400 && error.status < 500) retries.complete(fingerprint);
      return throwError(() => error);
    }),
  );
};
