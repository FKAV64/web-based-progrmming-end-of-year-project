import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { SettingsService } from '../../core/services/state/settings.service';
import { PushService } from '../../core/services/push.service';
import { AuthService } from '../../core/services/state/auth.service';
import { Locale } from '../../core/models/user.model';
import { DeleteAccountDialogComponent } from './delete-account-dialog.component';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatIconModule,
  ],
  template: `
    <div class="p-6 max-w-lg">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6" i18n="@@settings.title">Ayarlar</h1>

      <mat-card class="mb-4 bg-white border border-gray-200 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100">
        <mat-card-header>
          <mat-card-title i18n="@@settings.theme">Tema</mat-card-title>
        </mat-card-header>
        <mat-card-content class="pt-4">
          <mat-button-toggle-group [value]="settings.theme()" (change)="settings.setTheme($event.value)"
                                   i18n-aria-label="@@settings.theme-select" aria-label="Tema seç">
            <mat-button-toggle value="LIGHT" i18n="@@settings.theme-light">Açık</mat-button-toggle>
            <mat-button-toggle value="DARK" i18n="@@settings.theme-dark">Koyu</mat-button-toggle>
            <mat-button-toggle value="SYSTEM" i18n="@@settings.theme-system">Sistem</mat-button-toggle>
          </mat-button-toggle-group>
        </mat-card-content>
      </mat-card>

      <mat-card class="mb-4 bg-white border border-gray-200 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100">
        <mat-card-header>
          <mat-card-title i18n="@@settings.currency">Para Birimi</mat-card-title>
        </mat-card-header>
        <mat-card-content class="pt-4">
          <mat-button-toggle-group [value]="settings.currency()" (change)="settings.setCurrency($event.value)"
                                   i18n-aria-label="@@settings.currency-select" aria-label="Para birimi seç">
            <mat-button-toggle value="USD">USD</mat-button-toggle>
            <mat-button-toggle value="EUR">EUR</mat-button-toggle>
            <mat-button-toggle value="TRY">TRY</mat-button-toggle>
          </mat-button-toggle-group>
        </mat-card-content>
      </mat-card>

      <mat-card class="mb-4 bg-white border border-gray-200 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100">
        <mat-card-header>
          <mat-card-title i18n="@@settings.language">Dil</mat-card-title>
        </mat-card-header>
        <mat-card-content class="pt-4">
          <mat-button-toggle-group [value]="settings.locale()" (change)="switchLocale($event.value)"
                                   i18n-aria-label="@@settings.language-select" aria-label="Dil seç">
            <mat-button-toggle value="TR" i18n="@@settings.lang-tr">Türkçe</mat-button-toggle>
            <mat-button-toggle value="EN" i18n="@@settings.lang-en">English</mat-button-toggle>
          </mat-button-toggle-group>
        </mat-card-content>
      </mat-card>

      <mat-card class="mb-4 bg-white border border-gray-200 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100">
        <mat-card-header>
          <mat-card-title i18n="@@settings.notifications">Bildirimler</mat-card-title>
        </mat-card-header>
        <mat-card-content class="pt-4">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white" i18n="@@settings.push-title">Tarayıcı bildirimleri</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                @switch (push.state()) {
                  @case ('unsupported') {
                    <span i18n="@@settings.push-unsupported">Bu tarayıcı bildirimleri desteklemiyor.</span>
                  }
                  @case ('denied') {
                    <span i18n="@@settings.push-denied">Bildirimler engellendi. Tarayıcı ayarlarından izin verin.</span>
                  }
                  @case ('granted') {
                    <span i18n="@@settings.push-granted">Bildirimler etkin — alarm tetiklenince haber alırsınız.</span>
                  }
                  @default {
                    <span i18n="@@settings.push-default">Etkinleştirince izin isteyeceğiz.</span>
                  }
                }
              </p>
            </div>
            <mat-slide-toggle
              [checked]="push.state() === 'granted'"
              [disabled]="push.state() === 'unsupported' || push.state() === 'denied'"
              (change)="onPushToggle($event.checked)"
              i18n-aria-label="@@settings.push-toggle" aria-label="Tarayıcı bildirimlerini etkinleştir"
            ></mat-slide-toggle>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="border border-red-200 dark:border-red-900 bg-white dark:bg-slate-800 dark:text-gray-100">
        <mat-card-header>
          <mat-card-title class="text-red-600 dark:text-red-400" i18n="@@settings.danger-zone">Tehlikeli Bölge</mat-card-title>
        </mat-card-header>
        <mat-card-content class="pt-4">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white" i18n="@@settings.delete-account-title">Hesabı sil</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5" i18n="@@settings.delete-account-desc">
                Hesabınızı ve tüm verilerinizi kalıcı olarak silin.
              </p>
            </div>
            <button mat-flat-button color="warn" type="button" (click)="openDeleteDialog()"
                    i18n="@@settings.delete-btn">Hesabı Sil</button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class SettingsPageComponent {
  settings = inject(SettingsService);
  push = inject(PushService);
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);

  onPushToggle(enable: boolean): void {
    void this.push.toggle(enable);
  }

  switchLocale(locale: Locale): void {
    this.settings.setLocale(locale);
    const target = locale === 'EN' ? '/en/' : '/';
    window.location.href = target;
  }

  openDeleteDialog(): void {
    const ref = this.dialog.open(DeleteAccountDialogComponent, { width: '400px' });
    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        void this.auth.deleteAccount();
      }
    });
  }
}
