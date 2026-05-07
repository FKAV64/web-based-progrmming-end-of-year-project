/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register('/custom-sw.js', { scope: '/' })
      .then(() => {
        // SW registered successfully
      })
      .catch((error) => {
        console.error('[App] Custom SW registration failed:', error);
      });
  })
  .catch((err) => console.error(err));
