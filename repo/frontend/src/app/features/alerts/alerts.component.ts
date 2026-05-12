import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { AlertsService } from '../../core/services/state/alerts.service';
import { SettingsService } from '../../core/services/state/settings.service';
import { PushService } from '../../core/services/push.service';
import { CreateAlertDialogComponent } from './create-alert-dialog.component';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatTabsModule,
  ],
  template: `
    <div class="min-h-full bg-gray-50 p-4 dark:bg-gray-950 md:p-6">
      <div class="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-3xl font-semibold tracking-tight text-gray-950 dark:text-white" i18n="@@alerts.title">
            Fiyat Alarmları
          </h1>
          <p class="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400" i18n="@@alerts.subtitle">
            Aktif alarmlar snapshot evaluator ile backend tarafında izlenir, tetiklenenler burada arşivlenir.
          </p>
        </div>

        <button mat-flat-button color="primary" type="button" (click)="openCreateDialog()">
          <mat-icon>add_alert</mat-icon>
          <span i18n="@@alerts.new-btn">Yeni Alarm</span>
        </button>
      </div>

      <section class="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <mat-tab-group (selectedIndexChange)="onTabChange($event)">
          <mat-tab>
            <ng-template mat-tab-label><span i18n="@@alerts.tab-active">Aktif</span></ng-template>
            <ng-container *ngIf="alerts.active().length > 0; else activeEmpty">
              <div class="divide-y divide-gray-200 dark:divide-gray-800">
                <article
                  *ngFor="let alert of alerts.active()"
                  class="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div class="space-y-1">
                    <div class="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                      {{ alert.coinId }}
                    </div>
                    <div class="text-lg font-semibold text-gray-950 dark:text-white">
                      {{ conditionLabel(alert.condition) }} {{ formatCurrency(alert.targetPrice, alert.currency) }}
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-400" i18n="@@alerts.status-pending">
                      Durum: Beklemede
                    </div>
                  </div>

                  <div class="flex items-center gap-3">
                    <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                          i18n="@@alerts.badge-active">
                      Aktif
                    </span>
                    <button mat-icon-button type="button"
                            i18n-aria-label="@@alerts.delete-btn" aria-label="Alarmı sil"
                            (click)="remove(alert.id)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </article>
              </div>
            </ng-container>
          </mat-tab>

          <mat-tab>
            <ng-template mat-tab-label><span i18n="@@alerts.tab-triggered">Tetiklenen</span></ng-template>
            <ng-container *ngIf="alerts.triggered().length > 0; else triggeredEmpty">
              <div class="divide-y divide-gray-200 dark:divide-gray-800">
                <article
                  *ngFor="let alert of alerts.triggered()"
                  class="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div class="space-y-1">
                    <div class="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                      {{ alert.coinId }}
                    </div>
                    <div class="text-lg font-semibold text-gray-950 dark:text-white">
                      {{ conditionLabel(alert.condition) }} {{ formatCurrency(alert.targetPrice, alert.currency) }}
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">
                      <span i18n="@@alerts.status-label">Durum:</span> {{ formatTriggered(alert.triggeredAt) }}
                    </div>
                  </div>

                  <div class="flex items-center gap-3">
                    <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          i18n="@@alerts.badge-triggered">
                      Tetiklendi
                    </span>
                    <button mat-icon-button type="button"
                            i18n-aria-label="@@alerts.delete-btn" aria-label="Alarmı sil"
                            (click)="remove(alert.id)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </article>
              </div>
            </ng-container>
          </mat-tab>
        </mat-tab-group>
      </section>

      <ng-template #activeEmpty>
        <div class="px-6 py-12 text-center">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
            <mat-icon>notifications_active</mat-icon>
          </div>
          <h2 class="mt-4 text-xl font-semibold text-gray-950 dark:text-white" i18n="@@alerts.empty-active-title">Aktif alarm yok</h2>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400" i18n="@@alerts.empty-active-desc">
            Hedef fiyatı belirleyerek ilk alarmı oluşturabilirsin.
          </p>
        </div>
      </ng-template>

      <ng-template #triggeredEmpty>
        <div class="px-6 py-12 text-center">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800">
            <mat-icon>history</mat-icon>
          </div>
          <p class="mt-4 text-sm text-gray-600 dark:text-gray-400" i18n="@@alerts.empty-triggered">
            Tetiklenen alarmlar burada listelenecek.
          </p>
        </div>
      </ng-template>
    </div>
  `,
})
export class AlertsComponent {
  alerts = inject(AlertsService);
  settings = inject(SettingsService);
  push = inject(PushService);

  private dialog = inject(MatDialog);

  onTabChange(index: number): void {
    if (index === 1) {
      void this.alerts.loadTriggered();
    }
  }

  async openCreateDialog(): Promise<void> {
    const result = await firstValueFrom(
      this.dialog.open(CreateAlertDialogComponent, {
        width: '480px',
        panelClass: ['dark-panel', 'rounded-lg'],
      }).afterClosed(),
    );

    if (result) {
      const isFirstAlert = this.alerts.active().length === 0;
      await this.alerts.add(result);

      if (isFirstAlert && this.push.state() === 'default') {
        await this.push.requestPermission();
        if (this.push.state() === 'granted') {
          await this.push.subscribe();
        }
      }
    }
  }

  remove(id: string): void {
    void this.alerts.remove(id);
  }

  conditionLabel(condition: 'ABOVE' | 'BELOW'): string {
    return condition === 'ABOVE'
      ? $localize`:@@alerts.condition-above:Fiyat üstünde`
      : $localize`:@@alerts.condition-below:Fiyat altında`;
  }

  formatCurrency(value: string, currency: 'USD' | 'EUR' | 'TRY'): string {
    return new Intl.NumberFormat(this.localeCode(), {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value));
  }

  formatTriggered(value: string | null): string {
    if (!value) {
      return $localize`:@@alerts.pending:Beklemede`;
    }

    return new Intl.DateTimeFormat(this.localeCode(), {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  private localeCode(): string {
    return this.settings.locale() === 'TR' ? 'tr-TR' : 'en-US';
  }
}
