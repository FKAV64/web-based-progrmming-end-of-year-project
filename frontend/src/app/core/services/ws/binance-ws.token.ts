import { InjectionToken, Signal, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { BinanceWsService, ConnectionState } from './binance-ws.service';
import { MockBinanceTickService } from './mock-binance-tick.service';
import { Observable } from 'rxjs';
import { PriceTick } from '../../models/price-tick.model';

export interface BinanceWsLike {
  connectionState: Signal<ConnectionState>;
  tick$(symbol: string): Observable<PriceTick>;
}

export const BINANCE_WS = new InjectionToken<BinanceWsLike>('BINANCE_WS', {
  providedIn: 'root',
  factory: () =>
    environment.useMockWs
      ? inject(MockBinanceTickService)
      : inject(BinanceWsService),
});
