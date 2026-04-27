import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { debounceTime, Subject, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SettingsApiService, UpdateSettingsDto } from '../api/settings.api';
import { Currency, Locale, Theme, UserSettings } from '../../models/user.model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private api = inject(SettingsApiService);
  private doc = inject(DOCUMENT);

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
  }

  async load(): Promise<void> {
    this.api.get().subscribe(s => this.applySettings(s));
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

  private applyTheme(theme: Theme): void {
    const html = this.doc.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = theme === 'DARK' || (theme === 'SYSTEM' && prefersDark);
    html.classList.toggle('dark', dark);
  }
}
