import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/state/auth.service';
import { SettingsService } from '../../core/services/state/settings.service';
import { Currency } from '../../core/models/user.model';

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
  ],
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  auth = inject(AuthService);
  settings = inject(SettingsService);

  isMobile = signal(false);
  sidenavOpen = signal(true);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Piyasalar', icon: 'show_chart', route: '/markets' },
    { label: 'İzleme Listesi', icon: 'star', route: '/watchlist' },
    { label: 'Portföy', icon: 'account_balance_wallet', route: '/portfolio' },
    { label: 'Alarmlar', icon: 'notifications', route: '/alerts' },
    { label: 'Haberler', icon: 'newspaper', route: '/news' },
    { label: 'Ayarlar', icon: 'settings', route: '/settings' },
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
  }

  toggleTheme(): void {
    const current = this.settings.theme();
    this.settings.setTheme(current === 'DARK' ? 'LIGHT' : 'DARK');
  }

  setCurrency(currency: Currency): void {
    this.settings.setCurrency(currency);
  }
}
