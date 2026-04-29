import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CoinsTableComponent } from '../markets/coins-table/coins-table.component';
import { PriceStreamService } from '../../core/services/state/price-stream.service';
import { WatchlistService } from '../../core/services/state/watchlist.service';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    CoinsTableComponent,
  ],
  template: `
    <div class="min-h-full bg-gray-50 p-4 dark:bg-gray-950 md:p-6">
      <div class="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-3xl font-semibold tracking-tight text-gray-950 dark:text-white">
            Izleme Listesi
          </h1>
          <p class="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            Takip ettigin coinler burada canli fiyat akisi ile birlikte gorunur.
          </p>
        </div>

        <a
          mat-stroked-button
          routerLink="/markets"
          class="w-fit"
        >
          <mat-icon>add</mat-icon>
          Coin Ekle
        </a>
      </div>

      <ng-container *ngIf="watchlist.items().length > 0; else emptyState">
        <div *ngIf="watchedCoins().length > 0">
          <app-coins-table [coins]="watchedCoins()"></app-coins-table>
        </div>

        <section
          *ngIf="unavailableItems().length > 0"
          class="mt-6 rounded-3xl border border-dashed border-gray-300 bg-white/70 p-5 dark:border-gray-700 dark:bg-gray-900/60"
        >
          <div class="mb-4 flex items-center gap-2">
            <mat-icon class="text-amber-500">info</mat-icon>
            <h2 class="text-lg font-semibold text-gray-950 dark:text-white">
              Top 100 disindaki kayitlar
            </h2>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <article
              *ngFor="let item of unavailableItems()"
              class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">Coin ID</div>
                  <div class="text-base font-semibold text-gray-950 dark:text-white">
                    {{ item.coinId }}
                  </div>
                  <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Bu coin icin su anda sadece kayit tutuluyor. Canli fiyat verisi Top 100
                    snapshot icinde geldiginde tabloya eklenecek.
                  </p>
                </div>

                <button
                  mat-icon-button
                  type="button"
                  aria-label="Izleme listesinden kaldir"
                  (click)="remove(item.coinId)"
                >
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </article>
          </div>
        </section>
      </ng-container>

      <ng-template #emptyState>
        <div class="rounded-[32px] border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
            <mat-icon>star</mat-icon>
          </div>
          <h2 class="mt-4 text-2xl font-semibold text-gray-950 dark:text-white">
            Henuz izledigin coin yok
          </h2>
          <p class="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600 dark:text-gray-400">
            Piyasalar sayfasindaki yildiz dugmesini kullanarak coin ekleyebilir, sonra bu sayfadan
            hepsini tek yerde takip edebilirsin.
          </p>
          <a
            mat-flat-button
            color="primary"
            routerLink="/markets"
            class="mt-6 inline-flex"
          >
            Piyasalara Git
          </a>
        </div>
      </ng-template>
    </div>
  `,
})
export class WatchlistComponent {
  watchlist = inject(WatchlistService);

  private liveCoins = toSignal(inject(PriceStreamService).topCoins$, {
    initialValue: [],
  });

  readonly watchedCoins = computed(() => {
    const watchedIds = new Set(this.watchlist.items().map(item => item.coinId));
    return this.liveCoins().filter(coin => watchedIds.has(coin.id));
  });

  readonly unavailableItems = computed(() => {
    const availableIds = new Set(this.watchedCoins().map(coin => coin.id));
    return this.watchlist.items().filter(item => !availableIds.has(item.coinId));
  });

  remove(coinId: string): void {
    void this.watchlist.remove(coinId);
  }
}
