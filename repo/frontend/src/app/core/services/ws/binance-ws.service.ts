import { Injectable, OnDestroy, signal } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { defer, Observable, ReplaySubject, Subject, Subscription, timer } from 'rxjs';
import { debounceTime, filter, map, retry, share, timeout } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { PriceTick } from '../../models/price-tick.model';

export type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'offline';

/**
 * Binance WebSocket service managing a single multiplexed connection.
 *
 * Resilience features:
 * - Debounced subscription batches to respect Binance's 5 msg/sec rate limit.
 * - 60-second silence timeout to detect dead/half-open connections.
 * - Exponential-backoff reconnection handled globally before multicast.
 */
@Injectable({ providedIn: 'root' })
export class BinanceWsService implements OnDestroy {
  readonly connectionState = signal<ConnectionState>('connecting');

  private socket$!: WebSocketSubject<any>;
  readonly connection$: Observable<any>;

  private subscribedSymbols = new Set<string>();
  private subscriptionQueue$ = new Subject<void>();
  private offlineTimer$: Subscription | null = null;
  private queueSub: Subscription;

  constructor() {
    // 1. THE DEBOUNCER: Groups rapidly requested symbols into a single bulk payload
    this.queueSub = this.subscriptionQueue$.pipe(
      debounceTime(200)
    ).subscribe(() => {
       if (this.connectionState() === 'live') {
         this.resubscribeAll();
       }
    });

    // defer() re-executes the factory on every retry, so each attempt gets a fresh
    // WebSocketSubject — no stale socket reuse after close
    this.connection$ = defer(() => this.createSocket()).pipe(
      // Connection-level health check: 60 s of total silence means the connection is dead
      timeout({ each: 60_000 }),

      // Global retry before share() prevents retry storms
      retry({
        count: Infinity,
        delay: (_: unknown, attempt: number) => {
          this.connectionState.set('reconnecting');
          this.startOfflineTimer();
          return timer(Math.min(30_000, 2 ** attempt * 1000));
        },
      }),

      // Multicast to all subscribers sharing one socket
      share({
        connector: () => new ReplaySubject(1),
        resetOnError: true,
        resetOnComplete: true,
        resetOnRefCountZero: false,
      })
    );
  }

  private createSocket(): WebSocketSubject<any> {
    this.socket$ = webSocket({
      url: environment.binanceWsUrl,
      openObserver: {
        next: () => {
          this.connectionState.set('live');
          this.cancelOfflineTimer();
          this.subscriptionQueue$.next();
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
    return this.socket$;
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
    });
  }

  private addSymbol(symbol: string): void {
    if (!this.subscribedSymbols.has(symbol)) {
      this.subscribedSymbols.add(symbol);
      this.subscriptionQueue$.next(); // Trigger debounced bulk subscribe
    }
  }

  private removeSymbol(symbol: string): void {
    if (this.subscribedSymbols.has(symbol)) {
      this.subscribedSymbols.delete(symbol);
    }
  }

  private resubscribeAll(): void {
    const symbols = Array.from(this.subscribedSymbols);
    if (symbols.length === 0) return;

    // Map your local symbols to the format Binance expects (lowercase@miniTicker)
    const streams = symbols.map(s => `${s.toLowerCase()}@miniTicker`);

    try {
      // Send the single bulk payload to respect the 5 msg/sec limit
      this.socket$.next({ method: 'SUBSCRIBE', params: streams, id: Date.now() } as any);
    } catch {
      // Ignore if socket is temporarily not ready
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
    if (this.queueSub) this.queueSub.unsubscribe();
    this.socket$.complete();
  }
}