import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { CoinSnapshot, NewsItem } from '../../core/models/market.model';
import { MarketApiService } from '../../core/services/api/market.api';
import { PriceStreamService } from '../../core/services/state/price-stream.service';
import { PortfolioService } from '../../core/services/state/portfolio.service';
import { WatchlistService } from '../../core/services/state/watchlist.service';
import { SettingsService } from '../../core/services/state/settings.service';
import { ExchangeRatesService } from '../../core/services/state/exchange-rates.service';
import { PriceChangeBadgeComponent } from '../../shared/components/price-change-badge/price-change-badge.component';
import { CurrencyConverterPipe } from '../../shared/pipes/currency-converter.pipe';
import { FearGreedCardComponent } from './components/fear-greed-card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    PriceChangeBadgeComponent,
    CurrencyConverterPipe,
    FearGreedCardComponent,
  ],
  template: `
    <div class="min-h-full bg-gray-50 p-4 dark:bg-gray-950 md:p-6">
      <h1 class="mb-6 text-3xl font-semibold tracking-tight text-gray-950 dark:text-white" i18n="@@dashboard.title">
        Dashboard
      </h1>

      <!-- Row 1: KPI Cards -->
      <section class="grid gap-4 md:grid-cols-3">
        <!-- Portfolio Value -->
        <mat-card class="rounded-3xl border border-gray-200 shadow-sm dark:border-gray-800 dark:bg-gray-900 border-l-4 border-l-blue-500">
          <mat-card-content class="p-5">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
                <mat-icon>account_balance_wallet</mat-icon>
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400" i18n="@@dashboard.portfolio-value">Portföy Değeri</div>
            </div>
            <div class="mt-3 text-2xl font-bold font-mono text-gray-950 dark:text-white">
              {{
                portfolio.totalValue()
                  | currencyConverter: settings.currency() : er.rates() : settings.locale()
              }}
            </div>
            <div class="mt-1 text-xs text-gray-500 dark:text-gray-400" i18n="@@dashboard.active-positions">
              {{ portfolio.activeRows().length }} aktif pozisyon
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Top Gainer -->
        <mat-card class="rounded-3xl border border-gray-200 shadow-sm dark:border-gray-800 dark:bg-gray-900 border-l-4 border-l-green-500">
          <mat-card-content class="p-5">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                <mat-icon>trending_up</mat-icon>
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400" i18n="@@dashboard.top-gainer">En Çok Yükselen (24s)</div>
            </div>
            <ng-container *ngIf="topGainer() as coin; else kpiSkeleton">
              <a [routerLink]="['/coin', coin.id]" class="mt-3 flex items-center gap-2">
                <img [src]="coin.image" [alt]="coin.name" class="h-7 w-7 rounded-full">
                <div class="min-w-0">
                  <div class="truncate text-base font-bold text-gray-950 dark:text-white">{{ coin.name }}</div>
                  <app-price-change-badge [percentage]="coin.price_change_percentage_24h"></app-price-change-badge>
                </div>
              </a>
              <div class="mt-1 text-sm font-mono text-gray-700 dark:text-gray-300">
                {{
                  coin.current_price
                    | currencyConverter: settings.currency() : er.rates() : settings.locale() : 2 : 6
                }}
              </div>
            </ng-container>
            <ng-template #kpiSkeleton>
              <div class="mt-3 h-12 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"></div>
            </ng-template>
          </mat-card-content>
        </mat-card>

        <!-- Top Loser -->
        <mat-card class="rounded-3xl border border-gray-200 shadow-sm dark:border-gray-800 dark:bg-gray-900 border-l-4 border-l-red-500">
          <mat-card-content class="p-5">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300">
                <mat-icon>trending_down</mat-icon>
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400" i18n="@@dashboard.top-loser">En Çok Düşen (24s)</div>
            </div>
            <ng-container *ngIf="topLoser() as coin; else kpiSkeleton2">
              <a [routerLink]="['/coin', coin.id]" class="mt-3 flex items-center gap-2">
                <img [src]="coin.image" [alt]="coin.name" class="h-7 w-7 rounded-full">
                <div class="min-w-0">
                  <div class="truncate text-base font-bold text-gray-950 dark:text-white">{{ coin.name }}</div>
                  <app-price-change-badge [percentage]="coin.price_change_percentage_24h"></app-price-change-badge>
                </div>
              </a>
              <div class="mt-1 text-sm font-mono text-gray-700 dark:text-gray-300">
                {{
                  coin.current_price
                    | currencyConverter: settings.currency() : er.rates() : settings.locale() : 2 : 6
                }}
              </div>
            </ng-container>
            <ng-template #kpiSkeleton2>
              <div class="mt-3 h-12 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"></div>
            </ng-template>
          </mat-card-content>
        </mat-card>
      </section>

      <!-- Row 2: Fear & Greed + Top Movers -->
      <section class="mt-4 grid gap-4 lg:grid-cols-3">
        <!-- Fear & Greed Gauge -->
        <mat-card class="rounded-3xl border border-gray-200 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <mat-card-content class="p-5">
            <div class="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400" i18n="@@dashboard.fear-greed">Korku & Açgözlülük</div>
            <app-fear-greed-card
              [value]="sentimentValue()"
              [classification]="sentimentClassification()"
              [loading]="sentimentLoading()"
              [error]="sentimentError()"
            ></app-fear-greed-card>
          </mat-card-content>
        </mat-card>

        <!-- Top Movers -->
        <mat-card class="rounded-3xl border border-gray-200 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
          <mat-card-content class="p-5">
            <div class="mb-3 flex items-center justify-between">
              <div class="text-sm font-semibold text-gray-500 dark:text-gray-400" i18n="@@dashboard.top-movers">En Hareketliler</div>
              <a routerLink="/markets" mat-button color="primary" class="text-xs" i18n="@@dashboard.view-all">Tümünü Gör</a>
            </div>

            <ng-container *ngIf="topMovers().length > 0; else moversLoading">
              <div class="divide-y divide-gray-100 dark:divide-gray-800">
                <div *ngFor="let coin of topMovers()" class="flex items-center gap-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded">
                  <div class="w-1 self-stretch rounded-full flex-shrink-0" [class]="coin.price_change_percentage_24h >= 0 ? 'bg-emerald-500' : 'bg-red-500'"></div>
                  <img [src]="coin.image" [alt]="coin.name" class="h-8 w-8 rounded-full">
                  <div class="min-w-0 flex-1">
                    <a [routerLink]="['/coin', coin.id]" class="truncate font-medium text-gray-950 dark:text-white">
                      {{ coin.name }}
                    </a>
                    <div class="text-xs text-gray-500 uppercase dark:text-gray-400">{{ coin.symbol }}</div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm font-medium font-mono text-gray-950 dark:text-white">
                      {{
                        coin.current_price
                          | currencyConverter: settings.currency() : er.rates() : settings.locale() : 2 : 6
                      }}
                    </div>
                    <app-price-change-badge [percentage]="coin.price_change_percentage_24h"></app-price-change-badge>
                  </div>
                </div>
              </div>
            </ng-container>

            <ng-template #moversLoading>
              <div class="space-y-3">
                <div *ngFor="let _ of [1,2,3,4,5]" class="h-10 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"></div>
              </div>
            </ng-template>
          </mat-card-content>
        </mat-card>
      </section>

      <!-- Row 3: Watchlist Preview -->
      <section class="mt-4">
        <mat-card class="rounded-3xl border border-gray-200 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <mat-card-content class="p-5">
            <div class="mb-3 flex items-center justify-between">
              <div class="text-sm font-semibold text-gray-500 dark:text-gray-400" i18n="@@nav.watchlist">İzleme Listesi</div>
              <a routerLink="/watchlist" mat-button color="primary" class="text-xs" i18n="@@dashboard.view-all">Tümünü Gör</a>
            </div>

            <ng-container *ngIf="watchlistPreview().length > 0; else watchlistEmpty">
              <div class="divide-y divide-gray-100 dark:divide-gray-800">
                <div *ngFor="let coin of watchlistPreview()" class="flex items-center gap-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded">
                  <mat-icon class="text-blue-500 flex-shrink-0 !w-4 !h-4 !text-base">star</mat-icon>
                  <img [src]="coin.image" [alt]="coin.name" class="h-8 w-8 rounded-full">
                  <div class="min-w-0 flex-1">
                    <a [routerLink]="['/coin', coin.id]" class="truncate font-medium text-gray-950 dark:text-white">
                      {{ coin.name }}
                    </a>
                    <div class="text-xs uppercase text-gray-500 dark:text-gray-400">{{ coin.symbol }}</div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm font-medium font-mono text-gray-950 dark:text-white">
                      {{
                        coin.current_price
                          | currencyConverter: settings.currency() : er.rates() : settings.locale() : 2 : 6
                      }}
                    </div>
                    <app-price-change-badge [percentage]="coin.price_change_percentage_24h"></app-price-change-badge>
                  </div>
                </div>
              </div>
            </ng-container>

            <ng-template #watchlistEmpty>
              <div class="py-6 text-center">
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  <span i18n="@@dashboard.watchlist-cta">İzleme listeni oluştur —</span>
                  <a routerLink="/markets" class="text-blue-600 underline dark:text-blue-400" i18n="@@dashboard.go-to-markets">Piyasalara Git</a>
                </div>
              </div>
            </ng-template>
          </mat-card-content>
        </mat-card>
      </section>

      <!-- Row 4: News Preview -->
      <section class="mt-4">
        <mat-card class="rounded-3xl border border-gray-200 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <mat-card-content class="p-5">
            <div class="mb-3 flex items-center justify-between">
              <div class="text-sm font-semibold text-gray-500 dark:text-gray-400" i18n="@@dashboard.latest-news">Son Haberler</div>
              <a routerLink="/news" mat-button color="primary" class="text-xs" i18n="@@dashboard.view-all">Tümünü Gör</a>
            </div>

            <ng-container *ngIf="newsLoading()">
              <div class="space-y-3">
                <div *ngFor="let _ of [1,2,3]" class="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"></div>
              </div>
            </ng-container>

            <ng-container *ngIf="newsError() && !newsLoading()">
              <div class="py-6 text-center text-sm text-gray-500 dark:text-gray-400" i18n="@@dashboard.news-load-error">
                Haberler yüklenemedi.
              </div>
            </ng-container>

            <ng-container *ngIf="!newsLoading() && !newsError()">
              <ng-container *ngIf="newsPreview().length > 0; else noNews">
                <div class="divide-y divide-gray-100 dark:divide-gray-800">
                  <div *ngFor="let item of newsPreview()" class="py-3">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0 flex-1">
                        <div class="flex items-start gap-2">
                          <span class="mt-1.5 h-2 w-2 rounded-full flex-shrink-0"
                                [class]="item.sentiment === 'bullish' ? 'bg-emerald-500' : item.sentiment === 'bearish' ? 'bg-red-500' : 'bg-gray-400'">
                          </span>
                          <a [href]="item.link" target="_blank" rel="noopener noreferrer"
                             class="line-clamp-2 text-sm font-medium text-gray-950 hover:text-blue-600 dark:text-white dark:hover:text-blue-400">
                            {{ item.title }}
                          </a>
                        </div>
                        <div class="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{{ item.source }}</span>
                          <span>·</span>
                          <span>{{ relativeTime(item.pubDate) }}</span>
                        </div>
                      </div>
                      <span
                        class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                        [class]="sentimentBadgeClass(item.sentiment)"
                      >{{ sentimentLabel(item.sentiment) }}</span>
                    </div>
                  </div>
                </div>
              </ng-container>
              <ng-template #noNews>
                <div class="py-6 text-center text-sm text-gray-500 dark:text-gray-400" i18n="@@news.empty">Haber bulunamadı.</div>
              </ng-template>
            </ng-container>
          </mat-card-content>
        </mat-card>
      </section>
    </div>
  `,
})
export class DashboardComponent {
  portfolio = inject(PortfolioService);
  settings = inject(SettingsService);
  er = inject(ExchangeRatesService);

  private marketApi = inject(MarketApiService);
  private priceStream = inject(PriceStreamService);
  private watchlistService = inject(WatchlistService);

  private topCoins = toSignal(this.priceStream.topCoins$, {
    initialValue: [] as CoinSnapshot[],
  });

  readonly sentimentLoading = signal(true);
  readonly sentimentError = signal(false);
  private readonly _sentimentValue = signal(0);
  private readonly _sentimentClassification = signal('');

  readonly newsLoading = signal(true);
  readonly newsError = signal(false);
  private readonly _news = signal<NewsItem[]>([]);

  readonly sentimentValue = this._sentimentValue.asReadonly();
  readonly sentimentClassification = this._sentimentClassification.asReadonly();

  readonly topGainer = computed<CoinSnapshot | null>(() => {
    const coins = this.topCoins().filter(c => c.price_change_percentage_24h !== null);
    if (!coins.length) return null;
    return [...coins].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)[0];
  });

  readonly topLoser = computed<CoinSnapshot | null>(() => {
    const coins = this.topCoins().filter(c => c.price_change_percentage_24h !== null);
    if (!coins.length) return null;
    return [...coins].sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h)[0];
  });

  readonly topMovers = computed<CoinSnapshot[]>(() => {
    return [...this.topCoins()]
      .sort((a, b) => Math.abs(b.price_change_percentage_24h) - Math.abs(a.price_change_percentage_24h))
      .slice(0, 5);
  });

  readonly watchlistPreview = computed<CoinSnapshot[]>(() => {
    const watchedIds = new Set(this.watchlistService.items().map(item => item.coinId));
    return this.topCoins().filter(coin => watchedIds.has(coin.id)).slice(0, 5);
  });

  readonly newsPreview = computed(() => this._news().slice(0, 3));

  constructor() {
    this.loadSentiment();
    this.loadNews();
  }

  private loadSentiment(): void {
    this.marketApi.getSentiment().subscribe({
      next: data => {
        const latest = data?.data?.[0];
        if (latest) {
          this._sentimentValue.set(parseInt(latest.value, 10));
          this._sentimentClassification.set(latest.classification);
        }
        this.sentimentLoading.set(false);
      },
      error: () => {
        this.sentimentError.set(true);
        this.sentimentLoading.set(false);
      },
    });
  }

  private loadNews(): void {
    this.marketApi.getNews().subscribe({
      next: news => {
        this._news.set(news ?? []);
        this.newsLoading.set(false);
      },
      error: () => {
        this.newsError.set(true);
        this.newsLoading.set(false);
      },
    });
  }

  relativeTime(pubDate: string): string {
    const diff = Date.now() - new Date(pubDate).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 60) return $localize`:@@time.minutes-ago:${minutes} dk önce`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return $localize`:@@time.hours-ago:${hours} s önce`;
    return $localize`:@@time.days-ago:${Math.floor(hours / 24)} g önce`;
  }

  sentimentLabel(sentiment: string): string {
    if (sentiment === 'bullish') return $localize`:@@news.bullish:Yükseliş`;
    if (sentiment === 'bearish') return $localize`:@@news.bearish:Düşüş`;
    return $localize`:@@news.neutral:Nötr`;
  }

  sentimentBadgeClass(sentiment: string): string {
    if (sentiment === 'bullish') {
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400';
    }
    if (sentiment === 'bearish') {
      return 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400';
    }
    return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
  }
}
