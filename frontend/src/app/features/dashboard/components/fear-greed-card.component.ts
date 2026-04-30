import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexChart,
  ApexFill,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
} from 'ng-apexcharts';
import { MatIconModule } from '@angular/material/icon';

interface GaugeOptions {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  plotOptions: ApexPlotOptions;
  fill: ApexFill;
  stroke: ApexStroke;
  labels: string[];
}

function gaugeColor(value: number): string {
  if (value <= 25) return '#EF4444';
  if (value <= 45) return '#F97316';
  if (value <= 55) return '#EAB308';
  if (value <= 75) return '#84CC16';
  return '#22C55E';
}

@Component({
  selector: 'app-fear-greed-card',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, MatIconModule],
  template: `
    <div class="flex h-full flex-col items-center justify-center p-2">
      <ng-container *ngIf="loading">
        <div class="flex h-48 items-center justify-center">
          <div class="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500"></div>
        </div>
      </ng-container>

      <ng-container *ngIf="error && !loading">
        <div class="flex h-48 flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
          <mat-icon>error_outline</mat-icon>
          <span class="text-sm">Duygu verisi alınamadı</span>
        </div>
      </ng-container>

      <ng-container *ngIf="!loading && !error && chartOptions">
        <apx-chart
          [series]="chartOptions.series"
          [chart]="chartOptions.chart"
          [plotOptions]="chartOptions.plotOptions"
          [fill]="chartOptions.fill"
          [stroke]="chartOptions.stroke"
          [labels]="chartOptions.labels"
        ></apx-chart>

        <div class="mt-1 text-center">
          <div class="text-3xl font-bold" [style.color]="color">{{ value }}</div>
          <div class="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">
            {{ classification }}
          </div>
          <div class="mt-1 text-xs text-gray-400">Fear & Greed Index</div>
        </div>
      </ng-container>
    </div>
  `,
})
export class FearGreedCardComponent implements OnChanges {
  @Input() value = 0;
  @Input() classification = '';
  @Input() loading = false;
  @Input() error = false;

  chartOptions: GaugeOptions | null = null;
  color = '#EAB308';

  ngOnChanges(): void {
    if (!this.loading && !this.error) {
      this.color = gaugeColor(this.value);
      this.chartOptions = this.buildOptions();
    }
  }

  private buildOptions(): GaugeOptions {
    return {
      series: [this.value],
      chart: {
        type: 'radialBar',
        height: 200,
        toolbar: { show: false },
        animations: { enabled: true },
        background: 'transparent',
      },
      plotOptions: {
        radialBar: {
          startAngle: -135,
          endAngle: 135,
          hollow: {
            size: '55%',
          },
          track: {
            background: '#e5e7eb',
            strokeWidth: '100%',
          },
          dataLabels: {
            name: { show: false },
            value: { show: false },
          },
        },
      },
      fill: {
        type: 'solid',
        colors: [this.color],
      },
      stroke: {
        lineCap: 'round',
      },
      labels: [this.classification],
    };
  }
}
