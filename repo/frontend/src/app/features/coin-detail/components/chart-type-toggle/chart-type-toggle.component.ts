import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ChartType } from '../../../../core/models/market.model';
import { StorageService } from '../../../../core/services/storage.service';

interface ChartTypeOption {
  type: ChartType;
  icon: string;
  label: string;
}

const OPTIONS: ChartTypeOption[] = [
  { type: 'candle', icon: 'candlestick_chart', label: 'Candle' },
  { type: 'line', icon: 'show_chart', label: 'Line' },
  { type: 'area', icon: 'area_chart', label: 'Area' },
];

@Component({
  selector: 'app-chart-type-toggle',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="inline-flex rounded border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900" aria-label="Chart type">
      <button
        *ngFor="let option of options"
        mat-icon-button
        type="button"
        class="h-9 w-9"
        [ngClass]="{ 'bg-gray-100 dark:bg-gray-800': option.type === activeType }"
        [attr.aria-label]="option.label"
        [attr.aria-pressed]="option.type === activeType"
        [title]="option.label"
        (click)="select(option.type)"
      >
        <mat-icon class="text-base leading-none">{{ option.icon }}</mat-icon>
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartTypeToggleComponent implements OnInit {
  private storage = inject(StorageService);

  @Input() activeType: ChartType = 'candle';
  @Input() storageKey = 'coin-detail:chart-type';
  @Output() chartTypeChange = new EventEmitter<ChartType>();

  readonly options = OPTIONS;

  ngOnInit(): void {
    const stored = this.storage.get(this.storageKey);
    if (this.isChartType(stored) && stored !== this.activeType) {
      this.chartTypeChange.emit(stored);
    }
  }

  select(type: ChartType): void {
    this.storage.set(this.storageKey, type);
    this.chartTypeChange.emit(type);
  }

  private isChartType(value: string | null): value is ChartType {
    return value === 'candle' || value === 'line' || value === 'area';
  }
}
