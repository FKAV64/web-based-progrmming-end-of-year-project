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
  tap,
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
  private keepaliveInterval: ReturnType<typeof setInterval> | null = null;
  private isFirstConnection = true;

  constructor() {
    this.socket$ = webSocket({
      url: environment.binanceWsUrl,
      openObserver: {
        next: () => {
          this.connectionState.set('live');
          this.cancelOfflineTimer();
          if (!this.isFirstConnection) {
            // On reconnection, clear server-side state then re-subscribe all symbols
            this.resubscribeAll();
          }
          this.isFirstConnection = false;
          this.startKeepalive();
        },
      },
      closeObserver: {
        next: () => {
          if (this.connectionState() === 'live') {
            this.connectionState.set('reconnecting');
            this.startOfflineTimer();
          }
          this.stopKeepalive();
        },
      },
    });

    this.connection$ = this.socket$.pipe(
      // Respond to Binance application-level pings
      tap((message: any) => {
        if (message?.method === 'ping' || message?.ping) {
          try {
            this.socket$.next({ method: 'pong' } as any);
          } catch {
            // socket not ready
          }
        }
      }),
      // Connection-level health check: 60 s of total silence means the connection is dead
      timeout({ each: 60_000 }),
      // Multicast to all subscribers sharing one socket
      share({
        connector: () => new ReplaySubject(1),
        resetOnError: true,
        resetOnComplete: true,
        resetOnRefCountZero: true,
      }),
      // Reconnect with exponential backoff capped at 30 s
      retry({
        count: Infinity,
        delay: (_, attempt) => {
          this.connectionState.set('reconnecting');
          this.startOfflineTimer();
          this.stopKeepalive();
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

  private resubscribeAll(): void {
    const symbols = Array.from(this.subscribedSymbols);
    if (symbols.length === 0) return;

    const streams = symbols.map(s => `${s.toLowerCase()}@miniTicker`);

    // Unsubscribe first to clear any server-side state from the previous connection
    try {
      this.socket$.next({ method: 'UNSUBSCRIBE', params: streams, id: Date.now() } as any);
    } catch {
      // socket not yet ready
    }

    setTimeout(() => {
      try {
        this.socket$.next({ method: 'SUBSCRIBE', params: streams, id: Date.now() } as any);
      } catch {
        // socket not yet ready
      }
    }, 500);
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

  private startKeepalive(): void {
    this.stopKeepalive();
    this.keepaliveInterval = setInterval(() => {
      if (this.connectionState() === 'live') {
        try {
          this.socket$.next({ method: 'ping' } as any);
        } catch {
          // ignore if socket not ready
        }
      }
    }, 180_000); // every 3 minutes
  }

  private stopKeepalive(): void {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
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
    this.stopKeepalive();
    this.socket$.complete();
  }
}
