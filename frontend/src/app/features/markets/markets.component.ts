import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoinsTableComponent } from './coins-table/coins-table.component';
import { PriceStreamService } from '../../core/services/state/price-stream.service';

@Component({
  selector: 'app-markets',
  standalone: true,
  imports: [CommonModule, CoinsTableComponent],
  template: `
    <div class="p-4 md:p-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6" i18n="@@markets.title">Piyasalar</h1>

      <ng-container *ngIf="priceStream.topCoins$ | async as coins; else loading">
        <app-coins-table [coins]="coins"></app-coins-table>
      </ng-container>

      <ng-template #loading>
        <div role="status" aria-label="Veriler yükleniyor" i18n-aria-label="@@markets.loading">
          <!-- Search bar skeleton -->
          <div class="mb-4 h-10 w-full max-w-xs animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
          <!-- Table header skeleton -->
          <div class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
            <div class="h-10 animate-pulse bg-gray-100 dark:bg-gray-800"></div>
            <!-- Row skeletons -->
            <div *ngFor="let _ of skeletonRows" class="flex items-center gap-4 border-t border-gray-100 px-4 py-3 dark:border-gray-800">
              <div class="h-4 w-6 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
              <div class="flex items-center gap-3">
                <div class="h-7 w-7 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"></div>
                <div class="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
              </div>
              <div class="ml-auto flex gap-6">
                <div class="h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                <div class="hidden h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700 md:block"></div>
                <div class="hidden h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700 lg:block"></div>
              </div>
            </div>
          </div>
        </div>
      </ng-template>
    </div>
  `,
})
export class MarketsComponent {
  priceStream = inject(PriceStreamService);
  readonly skeletonRows = Array(10).fill(0);
}
