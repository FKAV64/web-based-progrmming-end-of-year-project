import { Injectable, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { debounceTime, Subject, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SettingsApiService, UpdateSettingsDto } from '../api/settings.api';
import { Currency, Locale, Theme, UserSettings } from '../../models/user.model';
import { AuthService } from './auth.service';

/**
 * User preference service managing theme, currency, and locale.
 *
 * Each preference is stored as a writable Angular signal so templates react
 * to changes instantly without zone.js. Changes are debounced 300 ms before
 * being persisted to the backend API so rapid UI interactions don't spam the
 * network.
 *
 * Theme changes are applied immediately to the document root `<html>` element
 * by toggling the `dark` CSS class, which activates Tailwind dark-mode styles.
 * System preference changes are respected when the theme is set to SYSTEM.
 *
 * @see SettingsApiService
 * @see AuthService
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private api = inject(SettingsApiService);
  private doc = inject(DOCUMENT);
  private auth = inject(AuthService);

  readonly theme = signal<Theme>('SYSTEM');
  readonly currency = signal<Currency>('USD');
  readonly locale = signal<Locale>('TR');
  readonly notificationsEnabled = signal<boolean>(true);

  private patch$ = new Subject<UpdateSettingsDto>();

  constructor() {
    this.patch$.pipe(
      debounceTime(300),
      switchMap(dto => this.api.update(dto)),
      takeUntilDestroyed(),
    ).subscribe();

    effect(() => this.applyTheme(this.theme()));
    effect(() => {
      const settings = this.auth.currentUser()?.settings;
      if (settings) {
        this.applySettings(settings);
      }
    }, { allowSignalWrites: true });
  }

  async load(): Promise<void> {
    const settings = await firstValueFrom(this.api.get());
    this.applySettings(settings);
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
    this.patch$.next({ theme });
  }

  setCurrency(currency: Currency): void {
    this.currency.set(currency);
    this.patch$.next({ currency });
  }

  setLocale(locale: Locale): void {
    this.locale.set(locale);
    this.patch$.next({ locale });
  }

  applySettings(s: UserSettings): void {
    this.theme.set(s.theme);
    this.currency.set(s.currency);
    this.locale.set(s.locale);
    this.notificationsEnabled.set(s.notificationsEnabled);
  }

  isDarkThemeEffective(): boolean {
    const t = this.theme();
    if (t === 'DARK') return true;
    if (t === 'SYSTEM') return window.matchMedia('(prefers-color-scheme: dark)').matches;
    return false;
  }

  private applyTheme(theme: Theme): void {
    const html = this.doc.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = theme === 'DARK' || (theme === 'SYSTEM' && prefersDark);
    html.classList.toggle('dark', dark);
  }
}
