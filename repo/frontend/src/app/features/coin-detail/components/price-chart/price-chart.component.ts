import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
  effect,
  inject,
  signal,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgApexchartsModule, ChartComponent } from 'ng-apexcharts';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription, catchError, finalize, of } from 'rxjs';
import { BinanceInterval, ChartType, OHLC } from '../../../../core/models/market.model';
import { MarketApiService } from '../../../../core/services/api/market.api';
import { SettingsService } from '../../../../core/services/state/settings.service';
import { BINANCE_WS } from '../../../../core/services/ws/binance-ws.token';
import { PriceTick } from '../../../../core/models/price-tick.model';

const INTERVAL_MS: Record<Exclude<BinanceInterval, '1M'>, number> = {
  '1m': 60_000,
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '30m': 30 * 60_000,
  '1h': 60 * 60_000,
  '4h': 4 * 60 * 60_000,
  '1d': 24 * 60 * 60_000,
  '1w': 7 * 24 * 60 * 60_000,
};

/**
 * ApexCharts-based OHLCV price chart with live WebSocket tick updates.
 *
 * Loads historical kline data from BinanceRestService and subscribes to live
 * miniTicker ticks for the same symbol. Each incoming tick either appends a
 * new candle (when the tick timestamp crosses the next interval boundary) or
 * updates the current candle's close/high/low in place. Chart options are
 * re-synced when the user switches theme or locale to keep axis colours and
 * tooltip formatting consistent.
 *
 * An in-component cache (keyed by symbol:interval:limit) prevents redundant
 * API calls when the user navigates away and back.
 *
 * @see MarketApiService
 * @see BinanceWsService
 * @see SettingsService
 */
@Component({
  selector: 'app-price-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, MatProgressSpinnerModule],
  template: `
    <div 
      class="relative min-h-[430px] rounded border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
      (mouseenter)="onMouseEnter()"
      (mouseleave)="onMouseLeave()"
    >
      <div *ngIf="loading()" class="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-gray-950/60">
        <mat-spinner [diameter]="48"></mat-spinner>
      </div>

      <div *ngIf="errorMessage && !loading()" class="flex min-h-[430px] items-center justify-center px-6 text-center text-sm text-red-600 dark:text-red-400">
        {{ errorMessage }}
      </div>

      <apx-chart
        *ngIf="!errorMessage && klines.length > 0"
        #chart
        [series]="series"
        [chart]="chartOptions"
        [xaxis]="xaxis"
        [yaxis]="yaxis"
        [plotOptions]="plotOptions"
        [stroke]="stroke"
        [colors]="colors"
        [tooltip]="tooltip"
        [grid]="grid"
        [theme]="theme"
        [dataLabels]="dataLabels"
      ></apx-chart>

      <!-- Custom Tooltip -->
      <div *ngIf="hoveredIndex !== null && chartType === 'candle'"
           class="pointer-events-none absolute z-50 rounded border border-gray-200 bg-white p-2 text-xs shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
           [style.left.px]="mouseX + 15"
           [style.top.px]="mouseY + 15">
        <div class="mb-1 text-gray-500 dark:text-gray-400 font-medium">
          {{ formatTime(hoveredKline?.time) }}
        </div>
        <div class="flex flex-col gap-0.5">
          <div class="flex justify-between gap-3">
            <span class="font-medium">Open:</span>
            <span>{{ formatPrice(hoveredKline?.open ?? 0) }}</span>
          </div>
          <div class="flex justify-between gap-3">
            <span class="font-medium">High:</span>
            <span class="text-green-600 dark:text-green-400">{{ formatPrice(hoveredKline?.high ?? 0) }}</span>
          </div>
          <div class="flex justify-between gap-3">
            <span class="font-medium">Low:</span>
            <span class="text-red-600 dark:text-red-400">{{ formatPrice(hoveredKline?.low ?? 0) }}</span>
          </div>
          <div class="flex justify-between gap-3">
            <span class="font-medium">Close:</span>
            <span [ngClass]="(hoveredKline?.close ?? 0) >= (hoveredKline?.open ?? 0) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
              {{ formatPrice(hoveredKline?.close ?? 0) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceChartComponent implements OnChanges {
  private api = inject(MarketApiService);
  private settings = inject(SettingsService);
  private ws = inject(BINANCE_WS);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('chart') chartRef?: ChartComponent;

  @Input({ required: true }) symbol = '';
  @Input({ required: true }) interval: BinanceInterval = '1h';
  @Input({ required: true }) limit = 168;
  @Input({ required: true }) chartType: ChartType = 'candle';

  loading = signal(false);
  errorMessage = '';
  klines: OHLC[] = [];

  series: any[] = [];
  chartOptions: any = {};
  xaxis: any = {};
  yaxis: any = {};
  plotOptions: any = {};
  stroke: any = {};
  colors: string[] = [];
  tooltip: any = {};
  grid: any = {};
  theme: any = {};
  dataLabels: any = { enabled: false };

  private readonly cache = new Map<string, OHLC[]>();
  private fetchKey = '';
  private liveTickSub: Subscription | null = null;
  
  // Custom tooltip state
  hoveredIndex: number | null = null;
  mouseX = 0;
  mouseY = 0;

  // Zoom state — preserved across live tick updates
  private zoomedXRange: { min: number; max: number } | null = null;

  get hoveredKline(): OHLC | undefined {
    if (this.hoveredIndex === null || this.hoveredIndex < 0 || this.hoveredIndex >= this.klines.length) {
      return undefined;
    }
    return this.klines[this.hoveredIndex];
  }

  constructor() {
    effect(() => {
      this.settings.theme();
      this.settings.locale();
      this.syncChartOptions();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['symbol']) {
      this.subscribeToLiveTicks();
    }

    if (changes['symbol'] || changes['interval'] || changes['limit']) {
      this.loadKlines();
      return;
    }

    if (changes['chartType']) {
      this.syncSeries(false);
    }
  }

  onMouseEnter(): void {
    // Left for template binding compatibility
  }

  onMouseLeave(): void {
    this.hoveredIndex = null;
    this.cdr.markForCheck();
  }

  private loadKlines(): void {
    if (!this.symbol || !this.interval || !this.limit) return;

    // Clear saved zoom when loading new data
    this.zoomedXRange = null;

    const key = this.cacheKey();
    this.fetchKey = key;
    const cached = this.cache.get(key);
    if (cached) {
      this.klines = cached;
      this.errorMessage = '';
      this.loading.set(false);
      this.syncSeries(false);
      return;
    }

    this.loading.set(true);
    this.errorMessage = '';
    this.api.getKlines(this.symbol, this.interval, this.limit).pipe(
      catchError(() => {
        this.errorMessage = 'Chart data could not be loaded.';
        return of([]);
      }),
      finalize(() => this.loading.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(klines => {
      if (this.fetchKey !== key) return;
      this.klines = klines.map(k => ({ ...k }));
      this.cache.set(key, this.klines);
      this.syncSeries(false);
    });
  }

  private subscribeToLiveTicks(): void {
    this.liveTickSub?.unsubscribe();
    if (!this.symbol) return;

    this.liveTickSub = this.ws.tick$(this.symbol).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(tick => this.applyLiveTick(tick));
  }

  applyLiveTick(tick: PriceTick): void {
    if (tick.symbol !== this.symbol || this.klines.length === 0) return;

    const last = this.klines[this.klines.length - 1];
    const ts = typeof tick.timestamp === 'number' ? tick.timestamp : Number(tick.timestamp);
    const validTs = isFinite(ts) && ts > 0;

    if (validTs) {
      if (ts >= this.nextBoundary(last.time)) {
        this.klines.push({
          time: this.bucketStart(ts),
          open: last.close,
          high: tick.price,
          low: tick.price,
          close: tick.price,
        });
        if (this.klines.length > this.limit) {
          this.klines.shift();
        }
      } else if (ts >= last.time) {
        last.close = tick.price;
        last.high = Math.max(last.high, tick.price);
        last.low = Math.min(last.low, tick.price);
      }
    } else {
      // Invalid timestamp on tick — update prices only, don't touch times
      last.close = tick.price;
      last.high = Math.max(last.high, tick.price);
      last.low = Math.min(last.low, tick.price);
    }

    // We no longer block updates when hovered. 
    // The custom tooltip will read from the updated klines array naturally!
    this.syncSeries(true);
    
    // Trigger change detection to update the custom tooltip with live prices
    if (this.hoveredIndex !== null) {
      this.cdr.markForCheck();
    }
  }

  private syncChartOptions(): void {
    const dark = this.isDarkTheme();
    const foreground = dark ? '#d1d5db' : '#374151';
    const muted = dark ? '#374151' : '#e5e7eb';

    this.chartOptions = {
      type: this.chartType === 'candle' ? 'candlestick' : this.chartType,
      height: 430,
      toolbar: {
        show: true,
        tools: {
          download: false,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true,
        },
      },
      zoom: {
        enabled: true,
        type: 'x',
        autoScaleYaxis: true,
      },
      selection: {
        enabled: true,
      },
      animations: { enabled: false },
      background: 'transparent',
      events: {
        zoomed: (_chartContext: any, { xaxis }: any) => {
          // Save the user's zoom range so we can re-apply it after live tick updates
          if (xaxis && xaxis.min != null && xaxis.max != null) {
            this.zoomedXRange = { min: xaxis.min, max: xaxis.max };
          }
        },
        scrolled: (_chartContext: any, { xaxis }: any) => {
          if (xaxis && xaxis.min != null && xaxis.max != null) {
            this.zoomedXRange = { min: xaxis.min, max: xaxis.max };
          }
        },
        beforeResetZoom: () => {
          // User clicked the reset icon — clear the saved zoom
          this.zoomedXRange = null;
        },
        mouseMove: (e: any, chartContext: any, config: any) => {
          if (config.dataPointIndex !== undefined && config.dataPointIndex !== -1) {
            this.hoveredIndex = config.dataPointIndex;
            if (e && e.clientX !== undefined) {
              const rect = chartContext.el.getBoundingClientRect();
              this.mouseX = e.clientX - rect.left;
              this.mouseY = e.clientY - rect.top;
            }
            this.cdr.markForCheck();
          }
        }
      },
    };

    this.xaxis = {
      type: 'datetime',
      labels: {
        style: { colors: foreground },
        formatter: (_: string, timestamp?: number | string) => {
          if (timestamp == null || timestamp === 0 || timestamp === '0') return '';
          const ms = typeof timestamp === 'string' ? Number(timestamp) : timestamp;
          if (!isFinite(ms) || ms <= 0) return '';
          return this.formatTime(ms, this.interval);
        },
      },
      axisBorder: { color: muted },
      axisTicks: { color: muted },
    };

    this.yaxis = {
      tooltip: { enabled: true },
      labels: {
        style: { colors: foreground },
        formatter: (value: number) => this.formatPrice(value),
      },
    };

    this.plotOptions = {
      candlestick: {
        colors: {
          upward: '#26a69a',
          downward: '#ef5350',
        },
        wick: { useFillColor: true },
      },
    };

    this.stroke = {
      curve: 'smooth',
      width: this.chartType === 'candle' ? 1 : 2,
    };
    this.colors = this.chartType === 'area' ? ['#2563eb'] : ['#26a69a'];
    
    // Disable native tooltip visual for candlestick to use our custom one,
    // but keep enabled=true so ApexCharts still calculates dataPointIndex on hover
    this.tooltip = {
      enabled: true,
      custom: this.chartType === 'candle' ? () => '<span style="display:none;"></span>' : undefined,
      theme: dark ? 'dark' : 'light',
      x: { formatter: (value: number | string) => this.formatTime(value, this.interval) },
      y: { formatter: (value: number) => this.formatPrice(value) },
    };
    
    this.grid = { borderColor: muted, strokeDashArray: 3 };
    this.theme = { mode: dark ? 'dark' : 'light' };

    if (this.hasRenderedChart()) {
      this.chartRef?.updateOptions({
        chart: this.chartOptions,
        xaxis: this.xaxis,
        yaxis: this.yaxis,
        plotOptions: this.plotOptions,
        stroke: this.stroke,
        colors: this.colors,
        tooltip: this.tooltip,
        grid: this.grid,
        theme: this.theme,
      }, false, false);
    }
  }

  private syncSeries(fromLiveTick: boolean): void {
    if (!fromLiveTick) {
      this.syncChartOptions();
    }
    if (this.chartType === 'candle') {
      this.series = [{
        name: this.symbol,
        data: this.klines.map(k => ({
          x: k.time,
          y: [k.open, k.high, k.low, k.close],
        })),
      }];
    } else {
      this.series = [{
        name: this.symbol,
        data: this.klines.map(k => [k.time, k.close]),
      }];
    }

    if (fromLiveTick && this.hasRenderedChart()) {
      this.chartRef?.updateSeries(this.series, false);

      // Re-apply the user's zoom range after the series update to prevent reset
      if (this.zoomedXRange) {
        const { min, max } = this.zoomedXRange;
        setTimeout(() => {
          try {
            this.chartRef?.zoomX(min, max);
          } catch {
            // Ignore if chart is not ready
          }
        });
      }
    }
  }

  private cacheKey(): string {
    return `${this.symbol}:${this.interval}:${this.limit}`;
  }

  private nextBoundary(openTime: number): number {
    if (this.interval === '1M') {
      const date = new Date(openTime);
      return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
    }
    return openTime + INTERVAL_MS[this.interval];
  }

  private bucketStart(timestamp: number): number {
    if (this.interval === '1M') {
      const date = new Date(timestamp);
      return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
    }
    const intervalMs = INTERVAL_MS[this.interval];
    return Math.floor(timestamp / intervalMs) * intervalMs;
  }

  formatTime(value: number | string | null | undefined, interval?: BinanceInterval): string {
    if (value == null || value === 0 || value === '0') return '';

    const ms = typeof value === 'string' ? Number(value) : value;
    if (!isFinite(ms as number) || (ms as number) <= 0) return '';

    try {
      const date = new Date(ms as number);
      if (isNaN(date.getTime())) return '';

      const unit = interval ?? this.interval;
      const locale = this.localeCode();

      if (['1m', '5m', '15m', '30m'].includes(unit)) {
        return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
      } else if (['1h', '4h'].includes(unit)) {
        return date.toLocaleDateString(locale, {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
      } else {
        return date.toLocaleDateString(locale, {
          year: 'numeric', month: 'short', day: 'numeric'
        });
      }
    } catch {
      return '';
    }
  }

  formatPrice(value: number): string {
    return new Intl.NumberFormat(this.localeCode(), {
      maximumFractionDigits: value >= 100 ? 2 : 6,
    }).format(value);
  }

  private localeCode(): string {
    return this.settings.locale() === 'TR' ? 'tr-TR' : 'en-US';
  }

  private isDarkTheme(): boolean {
    return document.documentElement.classList.contains('dark');
  }

  private hasRenderedChart(): boolean {
    return !!this.chartRef && !!(this.chartRef as unknown as { chartObj?: unknown }).chartObj;
  }
}
