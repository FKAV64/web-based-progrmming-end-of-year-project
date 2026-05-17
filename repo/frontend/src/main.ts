/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// ApexCharts registers wheel listeners as passive by default, then calls
// preventDefault() inside them — triggering a browser warning. Patch all
// wheel registrations to non-passive before the app (and any library) runs.
const _ael = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function (type, listener, opts) {
  if (type === 'wheel') {
    opts = typeof opts === 'object'
      ? { ...opts, passive: false }
      : { passive: false, capture: opts === true };
  }
  return _ael.call(this, type, listener, opts);
};

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
