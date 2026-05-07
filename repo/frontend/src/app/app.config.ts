import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { importProvidersFrom } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { OverlayContainer } from '@angular/cdk/overlay';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/services/state/auth.service';
import { xsrfInterceptor } from './core/interceptors/xsrf.interceptor';
import { credentialsInterceptor } from './core/interceptors/credentials.interceptor';
import { DarkModeOverlayContainer } from './core/providers/dark-mode-overlay.provider';

function initApp(auth: AuthService) {
  return () => auth.init();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideAnimationsAsync(),
    importProvidersFrom(MatSnackBarModule),
    provideHttpClient(
      withInterceptors([credentialsInterceptor, authInterceptor, xsrfInterceptor]),
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
    ),
    {
      provide: OverlayContainer,
      useClass: DarkModeOverlayContainer,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initApp,
      deps: [AuthService],
      multi: true,
    },
  ],
};
