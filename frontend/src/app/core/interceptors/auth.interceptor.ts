import { HttpErrorResponse, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/state/auth.service';
import { AuthApiService } from '../services/api/auth.api';
import { environment } from '../../../environments/environment';

let isRefreshing = false;
const refreshDone$ = new BehaviorSubject<string | null>(null);

export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<any> {
  const auth = inject(AuthService);
  const api = inject(AuthApiService);
  const router = inject(Router);

  const token = auth.accessToken();
  const isAuthEndpoint = req.url.includes('/auth/refresh') || req.url.includes('/auth/login') || req.url.includes('/auth/register');

  const authedReq = token && !isAuthEndpoint
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authedReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || isAuthEndpoint) return throwError(() => err);

      if (isRefreshing) {
        return refreshDone$.pipe(
          filter(t => t !== null),
          take(1),
          switchMap(newToken =>
            next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }))
          ),
        );
      }

      isRefreshing = true;
      refreshDone$.next(null);

      return api.refresh().pipe(
        switchMap(({ accessToken }) => {
          isRefreshing = false;
          auth.setToken(accessToken);
          refreshDone$.next(accessToken);
          return next(req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } }));
        }),
        catchError(refreshErr => {
          isRefreshing = false;
          auth.accessToken.set(null);
          auth.currentUser.set(null);
          router.navigate(['/login']);
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
}
