import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BinanceInterval, TimeframeOption } from '../../../../core/models/market.model';

export const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  { label: '1m', interval: '1m', limit: 120 },
  { label: '5m', interval: '5m', limit: 144 },
  { label: '15m', interval: '15m', limit: 96 },
  { label: '30m', interval: '30m', limit: 96 },
  { label: '1H', interval: '1h', limit: 168 },
  { label: '4H', interval: '4h', limit: 180 },
  { label: '1D', interval: '1d', limit: 365 },
  { label: '1W', interval: '1w', limit: 156 },
  { label: '1M', interval: '1M', limit: 60 },
];

@Component({
  selector: 'app-timeframe-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-wrap items-center gap-1" aria-label="Timeframe">
      <button
        *ngFor="let option of options"
        type="button"
        class="h-9 min-w-11 rounded px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        [ngClass]="{
          'bg-blue-600 text-white shadow-sm': option.interval === activeInterval,
          'bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800': option.interval !== activeInterval
        }"
        [attr.aria-pressed]="option.interval === activeInterval"
        (click)="select(option)"
      >
        {{ option.label }}
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeframeSelectorComponent {
  @Input() activeInterval: BinanceInterval = '1h';
  @Output() timeframeChange = new EventEmitter<TimeframeOption>();

  readonly options = TIMEFRAME_OPTIONS;

  select(option: TimeframeOption): void {
    this.timeframeChange.emit(option);
  }
}
