import { ApplicationConfig, ENVIRONMENT_INITIALIZER, importProvidersFrom } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { OverlayContainer } from '@angular/cdk/overlay';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/services/state/auth.service';
import { credentialsInterceptor } from './core/interceptors/credentials.interceptor';
import { DarkModeOverlayContainer } from './core/providers/dark-mode-overlay.provider';

function startAuthInit(auth: AuthService) {
  return () => auth.startInit();
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
    {
      provide: ENVIRONMENT_INITIALIZER,
      useFactory: startAuthInit,
      deps: [AuthService],
      multi: true,
    },
  ],
};
