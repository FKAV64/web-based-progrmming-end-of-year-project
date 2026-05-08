import { Injectable, Signal, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { NotificationService } from '../notification.service';
import { WatchlistApiService } from '../api/watchlist.api';
import { WatchlistItem } from '../../models/watchlist.model';

/**
 * Watchlist state service with optimistic UI updates.
 *
 * Keeps the user's watched coins in a reactive signal. When a coin is added
 * or removed, the signal is updated immediately (optimistic) and the API call
 * is made in the background. If the API call fails, the signal is rolled back
 * to its previous state and an error notification is shown.
 *
 * Per-coin membership is exposed as lazily-created computed signals via
 * `has(coinId)` to allow O(1) reactive lookups in the coins table without
 * re-computing for every row on every change.
 *
 * @see WatchlistApiService
 * @see AuthService
 */
@Injectable({ providedIn: 'root' })
export class WatchlistService {
  private auth = inject(AuthService);
  private api = inject(WatchlistApiService);
  private notifications = inject(NotificationService);

  readonly items = signal<WatchlistItem[]>([]);
  private hasSignals = new Map<string, Signal<boolean>>();
  private loadedUserId: string | null = null;

  constructor() {
    effect(() => {
      const userId = this.auth.currentUser()?.id ?? null;

      if (!userId) {
        this.loadedUserId = null;
        this.items.set([]);
        return;
      }

      if (this.loadedUserId !== userId) {
        this.loadedUserId = userId;
        void this.loadFromApi(true);
      }
    }, { allowSignalWrites: true });
  }

  async loadFromApi(silent = false): Promise<void> {
    try {
      const items = await firstValueFrom(this.api.list());
      this.items.set(items);
    } catch (error) {
      this.items.set([]);
      if (!silent) {
        this.notifications.showError(error, 'Izleme listesi yuklenemedi.');
      }
    }
  }

  has(coinId: string): Signal<boolean> {
    const existing = this.hasSignals.get(coinId);
    if (existing) {
      return existing;
    }

    const hasSignal = computed(() =>
      this.items().some(item => item.coinId === coinId),
    );
    this.hasSignals.set(coinId, hasSignal);
    return hasSignal;
  }

  async add(coinId: string): Promise<void> {
    if (this.has(coinId)()) {
      return;
    }

    const currentUser = this.auth.currentUser();
    if (!currentUser) {
      return;
    }

    const previousItems = this.items();
    const optimistic: WatchlistItem = {
      id: `temp-${coinId}`,
      userId: currentUser.id,
      coinId,
      addedAt: new Date().toISOString(),
    };

    this.items.set([optimistic, ...previousItems]);

    try {
      const created = await firstValueFrom(this.api.add({ coinId }));
      this.items.set([
        created,
        ...previousItems.filter(item => item.coinId !== coinId),
      ]);
    } catch (error) {
      this.items.set(previousItems);
      this.notifications.showError(error, 'Coin izleme listesine eklenemedi.');
      throw error;
    }
  }

  async remove(coinId: string): Promise<void> {
    const previousItems = this.items();
    if (!previousItems.some(item => item.coinId === coinId)) {
      return;
    }

    this.items.set(previousItems.filter(item => item.coinId !== coinId));

    try {
      await firstValueFrom(this.api.remove(coinId));
    } catch (error) {
      this.items.set(previousItems);
      this.notifications.showError(error, 'Coin izleme listesinden kaldirilamadi.');
      throw error;
    }
  }

  async toggle(coinId: string): Promise<void> {
    const currentlyHas = this.has(coinId)();
    if (currentlyHas) {
      await this.remove(coinId);
      return;
    }

    await this.add(coinId);
  }
}
