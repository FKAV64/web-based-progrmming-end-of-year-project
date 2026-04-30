import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { NewsItem } from '../../core/models/market.model';
import { MarketApiService } from '../../core/services/api/market.api';

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatChipsModule, MatIconModule],
  template: `
    <div class="min-h-full bg-gray-50 p-4 dark:bg-gray-950 md:p-6">
      <div class="mb-6">
        <h1 class="text-3xl font-semibold tracking-tight text-gray-950 dark:text-white">Kripto Haberleri</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          CoinDesk ve CoinTelegraph'dan gerçek zamanlı haberler
        </p>
      </div>

      <!-- Source filter chips -->
      <div class="mb-5 flex flex-wrap gap-2">
        <button
          *ngFor="let src of sources()"
          type="button"
          class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
          [class]="activeSource() === src
            ? 'bg-blue-600 text-white'
            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'"
          (click)="activeSource.set(src)"
        >
          {{ src === 'all' ? 'Tümü' : src }}
          <span class="ml-1 text-xs opacity-70">({{ countFor(src) }})</span>
        </button>
      </div>

      <!-- Loading -->
      <ng-container *ngIf="loading()">
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div *ngFor="let _ of [1,2,3,4,5,6]"
               class="h-44 animate-pulse rounded-3xl bg-white shadow-sm dark:bg-gray-900"></div>
        </div>
      </ng-container>

      <!-- Error -->
      <ng-container *ngIf="error() && !loading()">
        <div class="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
          <mat-icon class="text-gray-400">error_outline</mat-icon>
          <p class="mt-3 text-sm text-gray-600 dark:text-gray-400">Haberler yüklenemedi.</p>
          <button mat-stroked-button class="mt-4" (click)="reload()">Tekrar Dene</button>
        </div>
      </ng-container>

      <!-- News grid -->
      <ng-container *ngIf="!loading() && !error()">
        <ng-container *ngIf="filteredNews().length > 0; else emptyState">
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <article
              *ngFor="let item of filteredNews()"
              class="flex flex-col justify-between rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            >
              <div>
                <div class="mb-2 flex items-center justify-between gap-2">
                  <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ item.source }}</span>
                  <span
                    class="rounded-full px-2 py-0.5 text-xs font-medium"
                    [class]="sentimentBadgeClass(item.sentiment)"
                  >{{ sentimentLabel(item.sentiment) }}</span>
                </div>

                <h2 class="line-clamp-3 text-sm font-semibold leading-snug text-gray-950 dark:text-white">
                  {{ item.title }}
                </h2>
              </div>

              <div class="mt-4 flex items-center justify-between gap-2">
                <span class="text-xs text-gray-400 dark:text-gray-500">{{ relativeTime(item.pubDate) }}</span>
                <a
                  [href]="item.link"
                  target="_blank"
                  rel="noopener noreferrer"
                  mat-stroked-button
                  class="!text-xs"
                  color="primary"
                >
                  Oku
                  <mat-icon class="!text-sm">open_in_new</mat-icon>
                </a>
              </div>
            </article>
          </div>
        </ng-container>

        <ng-template #emptyState>
          <div class="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800">
              <mat-icon>newspaper</mat-icon>
            </div>
            <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Bu kaynakta haber bulunamadı.</p>
          </div>
        </ng-template>
      </ng-container>
    </div>
  `,
})
export class NewsComponent {
  private marketApi = inject(MarketApiService);

  readonly loading = signal(true);
  readonly error = signal(false);
  private readonly _allNews = signal<NewsItem[]>([]);
  readonly activeSource = signal<string>('all');

  readonly sources = computed<string[]>(() => {
    const unique = new Set(this._allNews().map(n => n.source));
    return ['all', ...Array.from(unique).sort()];
  });

  readonly filteredNews = computed<NewsItem[]>(() => {
    const src = this.activeSource();
    return src === 'all' ? this._allNews() : this._allNews().filter(n => n.source === src);
  });

  constructor() {
    this.loadNews();
  }

  countFor(src: string): number {
    return src === 'all'
      ? this._allNews().length
      : this._allNews().filter(n => n.source === src).length;
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(false);
    this.loadNews();
  }

  relativeTime(pubDate: string): string {
    const diff = Date.now() - new Date(pubDate).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return 'Az önce';
    if (minutes < 60) return `${minutes}dk önce`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}s önce`;
    return `${Math.floor(hours / 24)}g önce`;
  }

  sentimentLabel(sentiment: string): string {
    if (sentiment === 'bullish') return 'Yükseliş';
    if (sentiment === 'bearish') return 'Düşüş';
    return 'Nötr';
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

  private loadNews(): void {
    this.marketApi.getNews().subscribe({
      next: news => {
        this._allNews.set(news ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
