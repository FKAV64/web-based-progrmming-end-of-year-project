import { InjectionToken, Signal, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BinanceWsService, ConnectionState } from './binance-ws.service';
import { PriceTick } from '../../models/price-tick.model';

export interface BinanceWsLike {
  connectionState: Signal<ConnectionState>;
  tick$(symbol: string): Observable<PriceTick>;
}

export const BINANCE_WS = new InjectionToken<BinanceWsLike>('BINANCE_WS', {
  providedIn: 'root',
  factory: () => inject(BinanceWsService),
});
