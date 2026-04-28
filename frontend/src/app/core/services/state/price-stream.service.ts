import { inject, Injectable } from '@angular/core';
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

@Injectable({ providedIn: 'root' })
export class PriceStreamService {
  private market = inject(MarketApiService);
  private ws = inject(BINANCE_WS);

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
    shareReplay(1),
  );

  priceFor(sym: string) {
    return toSignal(
      this.topCoins$.pipe(
        map(coins => coins.find(c => c.symbol === sym)),
      ),
    );
  }
}
