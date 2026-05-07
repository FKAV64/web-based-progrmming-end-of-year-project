import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Injector, Signal, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { catchError, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import { ChartType, CoinDetail, CoinSnapshot, TimeframeOption } from '../../core/models/market.model';
import { MarketApiService } from '../../core/services/api/market.api';
import { AuthService } from '../../core/services/state/auth.service';
import { PriceStreamService } from '../../core/services/state/price-stream.service';
import { SettingsService } from '../../core/services/state/settings.service';
import { PriceChangeBadgeComponent } from '../../shared/components/price-change-badge/price-change-badge.component';
import { ChartTypeToggleComponent } from './components/chart-type-toggle/chart-type-toggle.component';
import { CoinStatsComponent } from './components/coin-stats/coin-stats.component';
import { PriceChartComponent } from './components/price-chart/price-chart.component';
import { TIMEFRAME_OPTIONS, TimeframeSelectorComponent } from './components/timeframe-selector/timeframe-selector.component';

@Component({
  selector: 'app-coin-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    PriceChangeBadgeComponent,
    TimeframeSelectorComponent,
    PriceChartComponent,
    ChartTypeToggleComponent,
    CoinStatsComponent,
  ],
  template: `
    <div class="min-h-full bg-gray-50 p-4 dark:bg-gray-950 md:p-6">
      <ng-container *ngIf="coin() as coin; else stateBlock">
        <div class="mb-5 flex flex-col gap-4 border-b border-gray-200 pb-4 dark:border-gray-800">
          <a routerLink="/markets" class="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
            <mat-icon class="text-base">arrow_back</mat-icon>
            Markets
          </a>

          <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div class="flex items-start gap-4">
              <img [src]="coin.image?.large || coin.image?.small || coin.image?.thumb" [alt]="coin.name" class="h-12 w-12 rounded-full">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h1 class="text-2xl font-bold text-gray-950 dark:text-white">{{ coin.name }}</h1>
                  <span class="rounded bg-gray-200 px-2 py-1 text-xs font-semibold uppercase text-gray-700 dark:bg-gray-800 dark:text-gray-300">{{ coin.symbol }}</span>
                  <span class="text-sm text-gray-500 dark:text-gray-400">#{{ rank(coin) }}</span>
                </div>
                <div class="mt-2 flex flex-wrap items-center gap-3">
                  <span class="text-3xl font-semibold tracking-normal text-gray-950 dark:text-white">{{ formatCurrency(currentPrice(coin)) }}</span>
                  <app-price-change-badge [percentage]="change24h(coin)"></app-price-change-badge>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
              <div>
                <div class="text-gray-500 dark:text-gray-400">Market Cap</div>
                <div class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(marketCap(coin), 0) }}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">24h High</div>
                <div class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(coin.market_data?.high_24h?.['usd']) }}</div>
              </div>
              <div>
                <div class="text-gray-500 dark:text-gray-400">24h Low</div>
                <div class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(coin.market_data?.low_24h?.['usd']) }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <main class="min-w-0">
            <div class="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <app-timeframe-selector
                [activeInterval]="timeframe().interval"
                (timeframeChange)="setTimeframe($event)"
              ></app-timeframe-selector>
              <app-chart-type-toggle
                [activeType]="chartType()"
                [storageKey]="chartStorageKey()"
                (chartTypeChange)="setChartType($event)"
              ></app-chart-type-toggle>
            </div>

            <app-price-chart
              [symbol]="binanceSymbol()"
              [interval]="timeframe().interval"
              [limit]="timeframe().limit"
              [chartType]="chartType()"
            ></app-price-chart>
          </main>

          <aside class="xl:block">
            <button
              mat-stroked-button
              type="button"
              class="mb-3 w-full xl:hidden"
              (click)="statsOpen.set(!statsOpen())"
            >
              <mat-icon>{{ statsOpen() ? 'expand_less' : 'expand_more' }}</mat-icon>
              Stats
            </button>
            <section
              class="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
              [ngClass]="{ 'hidden xl:block': !statsOpen() }"
            >
              <h2 class="mb-4 text-base font-semibold text-gray-950 dark:text-white">Key Stats</h2>
              <app-coin-stats [coin]="coin"></app-coin-stats>
            </section>
          </aside>
        </div>
      </ng-container>

      <ng-template #stateBlock>
        <div *ngIf="loading(); else errorBlock" class="animate-pulse space-y-4">
          <div class="h-12 w-64 rounded bg-gray-200 dark:bg-gray-800"></div>
          <div class="h-[430px] rounded bg-gray-200 dark:bg-gray-800"></div>
        </div>
      </ng-template>

      <ng-template #errorBlock>
        <div class="rounded border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {{ errorMessage() }}
        </div>
      </ng-template>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinDetailComponent {
  private route = inject(ActivatedRoute);
  private marketApi = inject(MarketApiService);
  private priceStream = inject(PriceStreamService);
  private settings = inject(SettingsService);
  private auth = inject(AuthService);
  private injector = inject(Injector);

  readonly coin = signal<CoinDetail | null>(null);
  readonly binanceSymbol = signal('BTCUSDT');
  readonly timeframe = signal<TimeframeOption>(TIMEFRAME_OPTIONS[4]);
  readonly chartType = signal<ChartType>('candle');
  readonly statsOpen = signal(false);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  private liveCoin: Signal<CoinSnapshot | undefined> | null = null;

  constructor() {
    this.route.paramMap.pipe(
      map(params => params.get('id') || ''),
      distinctUntilChanged(),
      tap(() => {
        this.loading.set(true);
        this.errorMessage.set('');
        this.coin.set(null);
      }),
      switchMap(id => this.marketApi.getCoin(id).pipe(
        catchError(() => {
          this.errorMessage.set('Coin detail could not be loaded.');
          return of(null);
        }),
      )),
      takeUntilDestroyed(),
    ).subscribe(coin => {
      this.loading.set(false);
      if (!coin) return;
      this.coin.set(coin);
      this.binanceSymbol.set(`${coin.symbol.toUpperCase()}USDT`);
      this.liveCoin = this.priceStream.priceFor(coin.symbol, this.injector);
    });
  }

  setTimeframe(option: TimeframeOption): void {
    this.timeframe.set(option);
  }

  setChartType(type: ChartType): void {
    this.chartType.set(type);
  }

  chartStorageKey(): string {
    return `coin-detail:chart-type:${this.auth.currentUser()?.id ?? 'guest'}`;
  }

  currentPrice(coin: CoinDetail): number | undefined {
    return this.liveCoin?.()?.current_price ?? coin.market_data?.current_price?.['usd'];
  }

  change24h(coin: CoinDetail): number {
    return coin.market_data?.price_change_percentage_24h ?? 0;
  }

  marketCap(coin: CoinDetail): number | undefined {
    return coin.market_data?.market_cap?.['usd'];
  }

  rank(coin: CoinDetail): number | string {
    return coin.market_cap_rank ?? coin.market_data?.market_cap_rank ?? '-';
  }

  formatCurrency(value: number | undefined, fractionDigits = 2): string {
    if (value === undefined || Number.isNaN(value)) return '-';
    return new Intl.NumberFormat(this.localeCode(), {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: fractionDigits,
    }).format(value);
  }

  private localeCode(): string {
    return this.settings.locale() === 'TR' ? 'tr-TR' : 'en-US';
  }
}
