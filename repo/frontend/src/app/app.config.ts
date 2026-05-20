import { ApplicationConfig, importProvidersFrom, isDevMode } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideServiceWorker } from '@angular/service-worker';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { OverlayContainer } from '@angular/cdk/overlay';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { credentialsInterceptor } from './core/interceptors/credentials.interceptor';
import { DarkModeOverlayContainer } from './core/providers/dark-mode-overlay.provider';

function shouldEnableServiceWorker(): boolean {
  if (isDevMode()) {
    return false;
  }

  if (typeof location === 'undefined') {
    return true;
  }

  return !['localhost', '127.0.0.1', '::1'].includes(location.hostname);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideAnimationsAsync(),
    importProvidersFrom(MatSnackBarModule),
    provideHttpClient(
      withInterceptors([credentialsInterceptor, authInterceptor]),
    ),
    {
      provide: OverlayContainer,
      useClass: DarkModeOverlayContainer,
    },
    provideServiceWorker('custom-sw.js', {
      enabled: shouldEnableServiceWorker(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
