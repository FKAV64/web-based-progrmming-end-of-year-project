import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/state/auth.service';

const FAST_REDIRECT_URLS = new Set(['', '/', '/index.html']);

export const authGuard: CanActivateFn = async (_, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  const requestedUrl = state.url ?? '';
  if (!FAST_REDIRECT_URLS.has(requestedUrl) && !auth.isInitialized()) {
    await auth.waitForInit();
    if (auth.isAuthenticated()) {
      return true;
    }
  }

  return requestedUrl && !FAST_REDIRECT_URLS.has(requestedUrl)
    ? router.createUrlTree(['/login'], { queryParams: { redirectTo: requestedUrl } })
    : router.createUrlTree(['/login']);
};
