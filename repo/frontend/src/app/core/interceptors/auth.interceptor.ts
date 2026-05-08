import { HttpErrorResponse, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/state/auth.service';
import { AuthApiService } from '../services/api/auth.api';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<any> {
  const auth = inject(AuthService);
  const api = inject(AuthApiService);
  const router = inject(Router);

  const token = auth.accessToken();

  // Unauthenticated endpoints — do NOT attach the Bearer token.
  const skipAuthHeader = ['/auth/refresh', '/auth/login', '/auth/register']
    .some(p => req.url.includes(p));

  // All auth paths — do NOT retry on 401 to avoid refresh/logout loops.
  const skipRetry = [
    '/auth/refresh', '/auth/login', '/auth/register',
    '/auth/logout',  '/auth/logout-all',
  ].some(p => req.url.includes(p));

  const authedReq = token && !skipAuthHeader
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authedReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // 1. BYPASS ON AUTH ENDPOINTS — clear local state only, never call logout()
      // which would issue another HTTP request and re-enter this handler.
      if (err.status === 401 && skipRetry) {
        isRefreshing = false;
        auth.clearLocalSession();
        router.navigate(['/login']);
        return throwError(() => err);
      }

      if (err.status !== 401 || skipRetry) return throwError(() => err);

      // 3. QUEUE CONCURRENT REQUESTS
      if (isRefreshing) {
        return refreshTokenSubject.pipe(
          filter(t => t !== null),
          take(1),
          switchMap(newToken =>
            next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }))
          ),
        );
      }

      // 2. REFRESH LOCKING FLAG
      isRefreshing = true;
      refreshTokenSubject.next(null);

      return api.refresh().pipe(
        switchMap(({ accessToken }) => {
          // 5. ON REFRESH SUCCESS
          isRefreshing = false;
          auth.setToken(accessToken);
          refreshTokenSubject.next(accessToken);
          return next(req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } }));
        }),
        catchError(refreshErr => {
          // 4. HANDLE REFRESH FAILURE WHILE LOCKED
          isRefreshing = false;
          refreshTokenSubject.next(null);
          auth.clearLocalSession();
          router.navigate(['/login']);
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
}