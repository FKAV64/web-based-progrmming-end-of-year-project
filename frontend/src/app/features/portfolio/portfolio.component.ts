import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { NgApexchartsModule } from 'ng-apexcharts';
import { ApexNonAxisChartSeries, ApexChart, ApexLegend, ApexResponsive } from 'ng-apexcharts';
import { PortfolioPosition, UpdatePortfolioPositionDto } from '../../core/models/portfolio.model';
import { PortfolioService, PortfolioPositionView } from '../../core/services/state/portfolio.service';
import { SettingsService } from '../../core/services/state/settings.service';
import { PriceChangeBadgeComponent } from '../../shared/components/price-change-badge/price-change-badge.component';
import { CurrencyConverterPipe } from '../../shared/pipes/currency-converter.pipe';
import { AddPositionDialogComponent } from './dialogs/add-position-dialog.component';
import { ClosePositionDialogComponent } from './dialogs/close-position-dialog.component';
import { EditPositionDialogComponent } from './dialogs/edit-position-dialog.component';

interface AllocationChartOptions {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  legend: ApexLegend;
  responsive: ApexResponsive[];
  colors: string[];
}

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatTabsModule,
    NgApexchartsModule,
    PriceChangeBadgeComponent,
    CurrencyConverterPipe,
  ],
  template: `
    <div class="min-h-full bg-gray-50 p-4 dark:bg-gray-950 md:p-6">
      <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 class="text-3xl font-semibold tracking-tight text-gray-950 dark:text-white">
            Portfoy
          </h1>
          <p class="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            Acik pozisyonlarin canli piyasa verileriyle izlenir, kapatilan islemler ise ayri sekmede tutulur.
          </p>
        </div>

        <button mat-flat-button color="primary" type="button" (click)="openAddDialog()">
          <mat-icon>add</mat-icon>
          Yeni Pozisyon
        </button>
      </div>

      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <mat-card class="rounded-3xl border border-gray-200 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <mat-card-content class="space-y-2 p-5">
            <div class="text-sm text-gray-500 dark:text-gray-400">Toplam Deger</div>
            <div class="text-2xl font-semibold text-gray-950 dark:text-white">
              {{ portfolio.totalValue() | currencyConverter: settings.currency() : null : settings.locale() }}
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="rounded-3xl border border-gray-200 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <mat-card-content class="space-y-2 p-5">
            <div class="text-sm text-gray-500 dark:text-gray-400">Toplam Maliyet</div>
            <div class="text-2xl font-semibold text-gray-950 dark:text-white">
              {{ portfolio.totalCost() | currencyConverter: settings.currency() : null : settings.locale() }}
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="rounded-3xl border border-gray-200 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <mat-card-content class="space-y-2 p-5">
            <div class="text-sm text-gray-500 dark:text-gray-400">Toplam Kar/Zarar</div>
            <div class="text-2xl font-semibold" [class.text-emerald-500]="portfolio.totalPnL() >= 0" [class.text-red-500]="portfolio.totalPnL() < 0">
              {{ portfolio.totalPnL() | currencyConverter: settings.currency() : null : settings.locale() }}
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="rounded-3xl border border-gray-200 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <mat-card-content class="space-y-2 p-5">
            <div class="text-sm text-gray-500 dark:text-gray-400">Toplam Kar/Zarar %</div>
            <div class="text-2xl font-semibold" [class.text-emerald-500]="portfolio.totalPnLPercent() >= 0" [class.text-red-500]="portfolio.totalPnLPercent() < 0">
              {{ formatPercent(portfolio.totalPnLPercent()) }}
            </div>
          </mat-card-content>
        </mat-card>
      </section>

      <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section class="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <mat-tab-group class="portfolio-tabs" (selectedIndexChange)="onTabChange($event)">
            <mat-tab label="Aktif Pozisyonlar">
              <ng-container *ngIf="portfolio.activeRows().length > 0; else activeEmpty">
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead class="bg-gray-50 dark:bg-gray-950/60">
                      <tr class="text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        <th class="px-4 py-3">Coin</th>
                        <th class="px-4 py-3">Adet</th>
                        <th class="px-4 py-3">Ortalama</th>
                        <th class="px-4 py-3">Anlik</th>
                        <th class="px-4 py-3">Deger</th>
                        <th class="px-4 py-3">P&L</th>
                        <th class="px-4 py-3 text-right">Aksiyon</th>
                      </tr>
                    </thead>

                    <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                      <tr *ngFor="let row of portfolio.activeRows()" class="align-top">
                        <td class="px-4 py-4">
                          <a [routerLink]="['/coin', row.position.coinId]" class="flex items-center gap-3">
                            <img *ngIf="row.image" [src]="row.image" [alt]="row.label" class="h-10 w-10 rounded-full">
                            <div>
                              <div class="font-semibold text-gray-950 dark:text-white">{{ row.label }}</div>
                              <div class="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                                {{ row.symbol }}
                              </div>
                            </div>
                          </a>
                        </td>
                        <td class="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {{ formatNumber(row.quantity, 8) }}
                        </td>
                        <td class="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {{ row.avgBuyPriceConverted | currencyConverter: settings.currency() : null : settings.locale() }}
                        </td>
                        <td class="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {{ row.currentPriceConverted | currencyConverter: settings.currency() : null : settings.locale() }}
                        </td>
                        <td class="px-4 py-4 text-sm font-semibold text-gray-950 dark:text-white">
                          {{ row.currentValue | currencyConverter: settings.currency() : null : settings.locale() }}
                        </td>
                        <td class="px-4 py-4 text-sm">
                          <div class="font-semibold" [class.text-emerald-500]="row.pnl >= 0" [class.text-red-500]="row.pnl < 0">
                            {{ row.pnl | currencyConverter: settings.currency() : null : settings.locale() }}
                          </div>
                          <div class="mt-1">
                            <app-price-change-badge [percentage]="row.pnlPercent"></app-price-change-badge>
                          </div>
                        </td>
                        <td class="px-4 py-4">
                          <div class="flex justify-end gap-1">
                            <button mat-icon-button type="button" aria-label="Duzenle" (click)="openEditDialog(row.position)">
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button mat-icon-button type="button" aria-label="Kapat" (click)="openCloseDialog(row.position)">
                              <mat-icon>task_alt</mat-icon>
                            </button>
                            <button mat-icon-button type="button" aria-label="Sil" (click)="remove(row.position.id)">
                              <mat-icon>delete</mat-icon>
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </ng-container>
            </mat-tab>

            <mat-tab label="Kapali Pozisyonlar">
              <ng-container *ngIf="portfolio.closedRows().length > 0; else closedEmpty">
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead class="bg-gray-50 dark:bg-gray-950/60">
                      <tr class="text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        <th class="px-4 py-3">Coin</th>
                        <th class="px-4 py-3">Adet</th>
                        <th class="px-4 py-3">Maliyet</th>
                        <th class="px-4 py-3">Kapanis</th>
                        <th class="px-4 py-3">Gerceklesen</th>
                        <th class="px-4 py-3">Tarih</th>
                        <th class="px-4 py-3 text-right">Aksiyon</th>
                      </tr>
                    </thead>

                    <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                      <tr *ngFor="let row of portfolio.closedRows()">
                        <td class="px-4 py-4">
                          <div class="flex items-center gap-3">
                            <img *ngIf="row.image" [src]="row.image" [alt]="row.label" class="h-10 w-10 rounded-full">
                            <div>
                              <div class="font-semibold text-gray-950 dark:text-white">{{ row.label }}</div>
                              <div class="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                                {{ row.symbol }}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td class="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {{ formatNumber(row.quantity, 8) }}
                        </td>
                        <td class="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {{ row.totalCost | currencyConverter: settings.currency() : null : settings.locale() }}
                        </td>
                        <td class="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {{ row.closePriceConverted | currencyConverter: settings.currency() : null : settings.locale() }}
                        </td>
                        <td class="px-4 py-4 text-sm font-semibold" [class.text-emerald-500]="(row.closeValue ?? 0) - row.totalCost >= 0" [class.text-red-500]="(row.closeValue ?? 0) - row.totalCost < 0">
                          {{ closedPnl(row) | currencyConverter: settings.currency() : null : settings.locale() }}
                        </td>
                        <td class="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {{ formatDate(row.position.closedAt) }}
                        </td>
                        <td class="px-4 py-4">
                          <div class="flex justify-end gap-1">
                            <button mat-icon-button type="button" aria-label="Sil" (click)="remove(row.position.id)">
                              <mat-icon>delete</mat-icon>
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </ng-container>
            </mat-tab>
          </mat-tab-group>
        </section>

        <mat-card class="rounded-[28px] border border-gray-200 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <mat-card-content class="p-5">
            <div class="mb-4 flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-gray-950 dark:text-white">Dagilim</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Aktif pozisyonlarin anlik degerine gore
                </p>
              </div>
            </div>

            <ng-container *ngIf="allocationChart().series.length > 0; else allocationEmpty">
              <apx-chart
                [series]="allocationChart().series"
                [chart]="allocationChart().chart"
                [labels]="allocationChart().labels"
                [legend]="allocationChart().legend"
                [responsive]="allocationChart().responsive"
                [colors]="allocationChart().colors"
              ></apx-chart>
            </ng-container>
          </mat-card-content>
        </mat-card>
      </div>

      <ng-template #activeEmpty>
        <div class="px-6 py-12 text-center">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
            <mat-icon>account_balance_wallet</mat-icon>
          </div>
          <h2 class="mt-4 text-xl font-semibold text-gray-950 dark:text-white">Aktif pozisyon yok</h2>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Ilk islemini ekleyerek toplam deger ve canli kar/zarar hesaplarini gorebilirsin.
          </p>
        </div>
      </ng-template>

      <ng-template #closedEmpty>
        <div class="px-6 py-12 text-center text-sm text-gray-600 dark:text-gray-400">
          Kapatilan pozisyonlar burada listelenecek.
        </div>
      </ng-template>

      <ng-template #allocationEmpty>
        <div class="rounded-2xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
          Dagilim grafigi icin en az bir aktif pozisyon ekle.
        </div>
      </ng-template>
    </div>
  `,
})
export class PortfolioComponent {
  portfolio = inject(PortfolioService);
  settings = inject(SettingsService);

  private dialog = inject(MatDialog);

  readonly allocationChart = computed<AllocationChartOptions>(() => {
    const rows = this.portfolio.activeRows().filter(row => row.currentValue > 0);

    return {
      series: rows.map(row => Number(row.currentValue.toFixed(2))),
      chart: {
        type: 'donut',
        height: 320,
        toolbar: { show: false },
        animations: { enabled: true },
      },
      labels: rows.map(row => row.symbol),
      legend: {
        position: 'bottom',
        fontSize: '12px',
      },
      responsive: [
        {
          breakpoint: 640,
          options: {
            chart: { height: 280 },
            legend: { position: 'bottom' },
          },
        },
      ],
      colors: ['#1d4ed8', '#0891b2', '#14b8a6', '#84cc16', '#f59e0b', '#ef4444'],
    };
  });

  onTabChange(index: number): void {
    if (index === 1) {
      void this.portfolio.loadClosed();
    }
  }

  async openAddDialog(): Promise<void> {
    const result = await firstValueFrom(
      this.dialog.open(AddPositionDialogComponent, {
        width: '520px',
        data: { defaultCurrency: this.settings.currency() },
      }).afterClosed(),
    );

    if (result) {
      await this.portfolio.add(result);
    }
  }

  async openEditDialog(position: PortfolioPosition): Promise<void> {
    const result = await firstValueFrom(
      this.dialog.open(EditPositionDialogComponent, {
        width: '520px',
        data: { position },
      }).afterClosed(),
    );

    if (result) {
      await this.portfolio.edit(position.id, result as UpdatePortfolioPositionDto);
    }
  }

  async openCloseDialog(position: PortfolioPosition): Promise<void> {
    const result = await firstValueFrom(
      this.dialog.open(ClosePositionDialogComponent, {
        width: '420px',
        data: { coinId: position.coinId },
      }).afterClosed(),
    );

    if (result) {
      await this.portfolio.close(position.id, result);
    }
  }

  remove(id: string): void {
    if (!window.confirm('Bu pozisyonu silmek istedigine emin misin?')) {
      return;
    }

    void this.portfolio.remove(id);
  }

  closedPnl(row: PortfolioPositionView): number | null {
    return row.closeValue !== null ? row.closeValue - row.totalCost : null;
  }

  formatNumber(value: number, maxDigits = 2): string {
    return new Intl.NumberFormat(this.localeCode(), {
      maximumFractionDigits: maxDigits,
    }).format(value);
  }

  formatPercent(value: number): string {
    return new Intl.NumberFormat(this.localeCode(), {
      style: 'percent',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(value / 100);
  }

  formatDate(value: string | null): string {
    if (!value) {
      return '-';
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
