import { Injectable, signal } from '@angular/core';
import { Observable, interval } from 'rxjs';
import { map } from 'rxjs/operators';
import { PriceTick } from '../../models/price-tick.model';
import { ConnectionState } from './binance-ws.service';

@Injectable({ providedIn: 'root' })
export class MockBinanceTickService {
  readonly connectionState = signal<ConnectionState>('live');

  private lastPrices = new Map<string, number>([
    ['BTCUSDT', 65000],
    ['ETHUSDT', 3500],
    ['BNBUSDT', 580],
    ['SOLUSDT', 145],
    ['XRPUSDT', 0.55],
    ['DOGEUSDT', 0.12],
    ['ADAUSDT', 0.45],
    ['AVAXUSDT', 35],
    ['DOTUSDT', 7.5],
    ['MATICUSDT', 0.85],
  ]);

  tick$(symbol: string): Observable<PriceTick> {
    const baseDelay = 1000 + Math.random() * 1000;
    return interval(baseDelay).pipe(
      map((): PriceTick => {
        const last = this.lastPrices.get(symbol) ?? 1;
        const delta = last * (Math.random() * 0.01 - 0.005); // ±0.5%
        const next = Math.max(0.000001, last + delta);
        this.lastPrices.set(symbol, next);
        return { symbol, price: next, timestamp: Date.now() };
      }),
    );
  }
}
