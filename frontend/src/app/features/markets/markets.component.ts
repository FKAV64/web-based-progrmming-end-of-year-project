import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoinsTableComponent } from './coins-table/coins-table.component';
import { PriceStreamService } from '../../core/services/state/price-stream.service';

@Component({
  selector: 'app-markets',
  standalone: true,
  imports: [CommonModule, CoinsTableComponent],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Piyasalar</h1>

      <ng-container *ngIf="priceStream.topCoins$ | async as coins; else loading">
        <app-coins-table [coins]="coins"></app-coins-table>
      </ng-container>

      <ng-template #loading>
        <div class="animate-pulse flex flex-col space-y-4">
          <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div class="h-64 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        </div>
      </ng-template>
    </div>
  `,
})
export class MarketsComponent {
  priceStream = inject(PriceStreamService);
}
