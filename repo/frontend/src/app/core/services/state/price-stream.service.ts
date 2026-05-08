import { inject, Injectable, Injector } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, merge } from 'rxjs';
import {
  map,
  scan,
  shareReplay,
  startWith,
  switchMap,
  throttleTime,
} from 'rxjs/operators';
import { CoinSnapshot } from '../../models/market.model';
import { PriceTick } from '../../models/price-tick.model';
import { MarketApiService } from '../api/market.api';
import { BINANCE_WS } from '../ws/binance-ws.token';

const DENY_LIST = new Set(['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'FDUSD']);

function toWsSymbol(symbol: string): string {
  return `${symbol.toUpperCase()}USDT`;
}

function buildInitialMap(coins: CoinSnapshot[]): Map<string, CoinSnapshot> {
  return new Map(coins.map(c => [toWsSymbol(c.symbol), c]));
}

/**
 * Real-time price stream service.
 *
 * Merges two data sources into a single `topCoins$` observable:
 * 1. The 15-second CoinGecko REST snapshot (full market data for 100 coins)
 * 2. Live Binance miniTicker WebSocket ticks (sub-second price updates)
 *
 * When a new REST snapshot arrives, `switchMap` subscribes to live ticks for
 * all eligible coins (stablecoins excluded). A `scan` accumulates the latest
 * tick price per symbol into a Map, and the downstream observable emits the
 * full coins array with the live price substituted where available.
 *
 * Ticks are throttled to 250 ms to prevent excessive re-renders. The
 * `shareReplay(1)` ensures only one WebSocket connection is opened regardless
 * of how many components subscribe.
 *
 * @see MarketApiService
 * @see BinanceWsService
 */
@Injectable({ providedIn: 'root' })
export class PriceStreamService {
  private market = inject(MarketApiService);
  private ws = inject(BINANCE_WS);
  private injector = inject(Injector);

  topCoins$: Observable<CoinSnapshot[]> = this.market.topCoins$.pipe(
    switchMap(coins => {
      const eligible = coins.filter(
        c => !DENY_LIST.has(c.symbol.toUpperCase()),
      );

      const ticks$: Observable<PriceTick> =
        eligible.length > 0
          ? merge(...eligible.map(c => this.ws.tick$(toWsSymbol(c.symbol))))
          : new Observable<PriceTick>();

      return ticks$.pipe(
        throttleTime(250),
        scan((acc: Map<string, CoinSnapshot>, tick: PriceTick) => {
          const existing = acc.get(tick.symbol);
          if (!existing) return acc;
          const updated = new Map(acc);
          updated.set(tick.symbol, { ...existing, current_price: tick.price });
          return updated;
        }, buildInitialMap(coins)),
        map(m => coins.map(c => m.get(toWsSymbol(c.symbol)) ?? c)),
        startWith(coins),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  priceFor(sym: string, injector: Injector = this.injector) {
    const target = sym.toUpperCase();
    return toSignal(
      this.topCoins$.pipe(
        map(coins => coins.find(c => c.symbol.toUpperCase() === target)),
      ),
      { injector },
    );
  }
}
