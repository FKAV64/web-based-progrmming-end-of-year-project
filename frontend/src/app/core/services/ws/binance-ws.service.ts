import { Injectable, OnDestroy, signal } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import {
  Observable,
  ReplaySubject,
  Subscription,
  timer,
} from 'rxjs';
import {
  filter,
  finalize,
  map,
  retry,
  share,
  timeout,
} from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { PriceTick } from '../../models/price-tick.model';

export type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'offline';

@Injectable({ providedIn: 'root' })
export class BinanceWsService implements OnDestroy {
  readonly connectionState = signal<ConnectionState>('connecting');

  private socket$!: WebSocketSubject<any>;
  readonly connection$: Observable<any>;

  private subscribedSymbols = new Set<string>();
  private offlineTimer$: Subscription | null = null;

  constructor() {
    this.socket$ = webSocket({
      url: environment.binanceWsUrl,
      openObserver: {
        next: () => {
          this.connectionState.set('live');
          this.cancelOfflineTimer();
        },
      },
      closeObserver: {
        next: () => {
          if (this.connectionState() === 'live') {
            this.connectionState.set('reconnecting');
            this.startOfflineTimer();
          }
        },
      },
    });

    this.connection$ = this.socket$.pipe(
      // Multicast to all subscribers sharing one socket
      share({
        connector: () => new ReplaySubject(1),
        resetOnError: true,
        resetOnComplete: true,
        resetOnRefCountZero: true,
      }),

      // Reconnect with exponential backoff capped at 30s
      retry({
        count: Infinity,
        delay: (_, attempt) => {
          this.connectionState.set('reconnecting');
          this.startOfflineTimer();
          return timer(Math.min(30_000, 2 ** attempt * 1000));
        },
      }),
    );
  }

  tick$(symbol: string): Observable<PriceTick> {
    return new Observable<PriceTick>(subscriber => {
      this.addSymbol(symbol);

      const sub = this.connection$.pipe(
        filter((msg: any) => msg?.s === symbol),
        // timeout per-symbol so cross-symbol traffic doesn't reset the clock
        timeout({ each: 30_000 }),
        map((msg: any): PriceTick => ({
          symbol: msg.s,
          price: parseFloat(msg.c),
          timestamp: msg.E ?? Date.now(),
        })),
      ).subscribe(subscriber);

      return () => {
        sub.unsubscribe();
        this.removeSymbol(symbol);
      };
    }).pipe(
      finalize(() => this.removeSymbol(symbol)),
    );
  }

  private addSymbol(symbol: string): void {
    if (!this.subscribedSymbols.has(symbol)) {
      this.subscribedSymbols.add(symbol);
      this.sendSubscribe([symbol]);
    }
  }

  private removeSymbol(symbol: string): void {
    if (this.subscribedSymbols.has(symbol)) {
      this.subscribedSymbols.delete(symbol);
      this.sendUnsubscribe([symbol]);
    }
  }

  private sendSubscribe(symbols: string[]): void {
    try {
      this.socket$.next({
        method: 'SUBSCRIBE',
        params: symbols.map(s => `${s.toLowerCase()}@miniTicker`),
        id: 1,
      });
    } catch {
      // socket not yet open — subscriptions will be sent after reconnect
    }
  }

  private sendUnsubscribe(symbols: string[]): void {
    try {
      this.socket$.next({
        method: 'UNSUBSCRIBE',
        params: symbols.map(s => `${s.toLowerCase()}@miniTicker`),
        id: 2,
      });
    } catch {
      // socket already closed
    }
  }

  private startOfflineTimer(): void {
    this.cancelOfflineTimer();
    this.offlineTimer$ = timer(60_000).subscribe(() => {
      if (this.connectionState() === 'reconnecting') {
        this.connectionState.set('offline');
      }
    });
  }

  private cancelOfflineTimer(): void {
    if (this.offlineTimer$) {
      this.offlineTimer$.unsubscribe();
      this.offlineTimer$ = null;
    }
  }

  ngOnDestroy(): void {
    this.cancelOfflineTimer();
    this.socket$.complete();
  }
}
