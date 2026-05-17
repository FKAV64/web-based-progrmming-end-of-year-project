import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/state/auth.service';
import { SettingsService } from '../../core/services/state/settings.service';
import { AlertsService } from '../../core/services/state/alerts.service';
import { Currency } from '../../core/models/user.model';
import { BINANCE_WS } from '../../core/services/ws/binance-ws.token';
import { ConnectionStatusComponent } from '../../shared/components/connection-status/connection-status.component';
import { PwaService } from '../../core/services/pwa.service';
import { PushService } from '../../core/services/push.service';
import { AlertWsService } from '../../core/services/ws/alert-ws.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatSelectModule,
    MatDividerModule,
    ConnectionStatusComponent,
  ],
  templateUrl: './shell.component.html',
})
/**
 * Application shell component providing the main navigation layout.
 *
 * Renders the responsive sidebar navigation, top toolbar, and the
 * `<router-outlet>` where feature pages are projected. On mobile breakpoints
 * the sidenav collapses and switches to an overlay drawer.
 *
 * On user login (detected via AuthService.currentUser signal), the shell
 * starts the alert poller (AlertsService.startAlertPoller) and silently
 * re-subscribes to push notifications if permission was previously granted.
 * This ensures alerts and push work after a page refresh.
 *
 * @see AuthService
 * @see SettingsService
 * @see AlertsService
 * @see PushService
 */
export class ShellComponent {
  auth = inject(AuthService);
  settings = inject(SettingsService);
  alerts = inject(AlertsService);
  ws = inject(BINANCE_WS);
  pwa = inject(PwaService);
  push = inject(PushService);
  alertWs = inject(AlertWsService);

  isMobile = signal(false);
  sidenavOpen = signal(true);
  private initializedUserId: string | null = null;

  readonly navItems: NavItem[] = [
    { label: $localize`:@@nav.dashboard:Dashboard`, icon: 'dashboard', route: '/dashboard' },
    { label: $localize`:@@nav.markets:Piyasalar`, icon: 'show_chart', route: '/markets' },
    { label: $localize`:@@nav.watchlist:İzleme Listesi`, icon: 'star', route: '/watchlist' },
    { label: $localize`:@@nav.portfolio:Portföy`, icon: 'account_balance_wallet', route: '/portfolio' },
    { label: $localize`:@@nav.alerts:Alarmlar`, icon: 'notifications', route: '/alerts' },
    { label: $localize`:@@nav.news:Haberler`, icon: 'newspaper', route: '/news' },
    { label: $localize`:@@nav.settings:Ayarlar`, icon: 'settings', route: '/settings' },
  ];

  readonly currencies: Currency[] = ['USD', 'EUR', 'TRY'];

  constructor() {
    const bp = inject(BreakpointObserver);
    bp.observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
      .pipe(takeUntilDestroyed())
      .subscribe(result => {
        this.isMobile.set(result.matches);
        this.sidenavOpen.set(!result.matches);
      });

    effect(() => {
      const userId = this.auth.currentUser()?.id ?? null;

      if (!userId) {
        this.initializedUserId = null;
        this.alertWs.disconnect();
        return;
      }

      if (this.initializedUserId === userId) return;

      this.initializedUserId = userId;
      this.alerts.startAlertPoller();

      const token = this.auth.accessToken();
      if (token) this.alertWs.connect(token);

      if (this.push.state() === 'granted') {
        void this.push.subscribe();
      }
    });
  }

  toggleTheme(): void {
    const effectiveDark = this.settings.isDarkThemeEffective();
    this.settings.setTheme(effectiveDark ? 'LIGHT' : 'DARK');
  }

  setCurrency(currency: Currency): void {
    this.settings.setCurrency(currency);
  }
}
