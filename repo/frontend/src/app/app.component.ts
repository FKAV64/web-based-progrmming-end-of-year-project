import { Component, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
})
export class AppComponent implements AfterViewInit {
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      const splash = document.getElementById('app-splash');
      if (splash) {
        // Add a small fade out effect before removing
        splash.style.transition = 'opacity 0.3s ease';
        splash.style.opacity = '0';
        setTimeout(() => splash.remove(), 300);
      }
    }
  }
}
