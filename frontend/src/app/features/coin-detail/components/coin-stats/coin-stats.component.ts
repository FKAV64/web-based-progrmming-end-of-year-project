import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoinDetail } from '../../../../core/models/market.model';

@Component({
  selector: 'app-coin-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <dl class="grid grid-cols-1 gap-3 text-sm">
      <div *ngFor="let row of rows" class="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 last:border-b-0 dark:border-gray-800">
        <dt class="text-gray-500 dark:text-gray-400">{{ row.label }}</dt>
        <dd class="text-right font-medium text-gray-900 dark:text-white">{{ row.value }}</dd>
      </div>
    </dl>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinStatsComponent {
  @Input({ required: true }) coin!: CoinDetail;

  get rows() {
    const data = this.coin.market_data;
    return [
      { label: '24h High', value: this.formatCurrency(data?.high_24h?.['usd']) },
      { label: '24h Low', value: this.formatCurrency(data?.low_24h?.['usd']) },
      { label: 'ATH', value: this.formatCurrency(data?.ath?.['usd']) },
      { label: 'ATL', value: this.formatCurrency(data?.atl?.['usd']) },
      { label: 'Volume', value: this.formatCurrency(data?.total_volume?.['usd'], 0) },
      { label: 'Market Cap', value: this.formatCurrency(data?.market_cap?.['usd'], 0) },
      { label: 'Circulating Supply', value: this.formatNumber(data?.circulating_supply) },
      { label: 'Max Supply', value: this.formatNumber(data?.max_supply) },
    ];
  }

  private formatCurrency(value: number | undefined, fractionDigits = 2): string {
    if (value === undefined || Number.isNaN(value)) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: fractionDigits,
    }).format(value);
  }

  private formatNumber(value: number | undefined): string {
    if (value === undefined || value === null || Number.isNaN(value)) return '-';
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
  }
}
