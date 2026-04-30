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
          <h1 class="text-3xl font-semibold tracking-tight text-gray-950 dark:text-white">
            Fiyat Alarmlari
          </h1>
          <p class="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            Aktif alarmlar snapshot evaluator ile backend tarafinda izlenir, tetiklenenler burada arsivlenir.
          </p>
        </div>

        <button mat-flat-button color="primary" type="button" (click)="openCreateDialog()">
          <mat-icon>add_alert</mat-icon>
          Yeni Alarm
        </button>
      </div>

      <section class="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <mat-tab-group (selectedIndexChange)="onTabChange($event)">
          <mat-tab label="Aktif">
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
                    <div class="text-sm text-gray-600 dark:text-gray-400">
                      Durum: Beklemede
                    </div>
                  </div>

                  <div class="flex items-center gap-3">
                    <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                      Aktif
                    </span>
                    <button mat-icon-button type="button" aria-label="Alarmi sil" (click)="remove(alert.id)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </article>
              </div>
            </ng-container>
          </mat-tab>

          <mat-tab label="Tetiklenen">
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
                      Durum: {{ formatTriggered(alert.triggeredAt) }}
                    </div>
                  </div>

                  <div class="flex items-center gap-3">
                    <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Tetiklendi
                    </span>
                    <button mat-icon-button type="button" aria-label="Alarmi sil" (click)="remove(alert.id)">
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
          <h2 class="mt-4 text-xl font-semibold text-gray-950 dark:text-white">Aktif alarm yok</h2>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Hedef fiyati belirleyerek ilk alarmi olusturabilirsin.
          </p>
        </div>
      </ng-template>

      <ng-template #triggeredEmpty>
        <div class="px-6 py-12 text-center text-sm text-gray-600 dark:text-gray-400">
          Tetiklenen alarmlar burada listelenecek.
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
        data: { defaultCurrency: this.settings.currency() },
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
    return condition === 'ABOVE' ? 'Fiyat ustunde' : 'Fiyat altinda';
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
      return 'Beklemede';
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
