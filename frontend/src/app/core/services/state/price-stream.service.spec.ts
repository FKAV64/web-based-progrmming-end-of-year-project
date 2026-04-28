import { TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { PriceStreamService } from './price-stream.service';
import { MarketApiService } from '../api/market.api';
import { BINANCE_WS } from '../ws/binance-ws.token';
import { CoinSnapshot } from '../../models/market.model';
import { signal } from '@angular/core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeCoin(symbol: string, price: number): CoinSnapshot {
  return {
    id: symbol.toLowerCase(),
    symbol,
    name: symbol,
    image: '',
    current_price: price,
    market_cap: 1_000_000,
    market_cap_rank: 1,
    total_volume: 100_000,
    high_24h: price + 100,
    low_24h: price - 100,
    price_change_24h: 0,
    price_change_percentage_24h: 0,
    market_cap_change_24h: 0,
    market_cap_change_percentage_24h: 0,
    circulating_supply: 1_000_000,
    ath: price * 2,
    ath_change_percentage: -50,
    ath_date: '',
    atl: price * 0.1,
    atl_change_percentage: 900,
    atl_date: '',
    last_updated: '',
  };
}

describe('PriceStreamService', () => {
  let service: PriceStreamService;

  const btcTick$ = new Subject<any>();
  const ethTick$ = new Subject<any>();
  const tickSpy = jest.fn((symbol: string) => {
    if (symbol === 'BTCUSDT') return btcTick$.asObservable();
    if (symbol === 'ETHUSDT') return ethTick$.asObservable();
    return new Subject().asObservable();
  });

  const mockWs = {
    connectionState: signal<any>('live'),
    tick$: tickSpy,
  };

  const btc = makeCoin('btc', 65_000);
  const eth = makeCoin('eth', 3_500);
  const usdt = makeCoin('USDT', 1);

  function configure(coins: CoinSnapshot[]) {
    TestBed.configureTestingModule({
      providers: [
        PriceStreamService,
        { provide: MarketApiService, useValue: { topCoins$: of(coins) } },
        { provide: BINANCE_WS, useValue: mockWs },
      ],
    });
    service = TestBed.inject(PriceStreamService);
  }

  beforeEach(() => {
    tickSpy.mockClear();
    btcTick$.observers.length && btcTick$.observers.splice(0);
    ethTick$.observers.length && ethTick$.observers.splice(0);
    configure([btc, eth]);
  });

  // -------------------------------------------------------------------------
  // 1. Emits snapshot immediately (startWith)
  // -------------------------------------------------------------------------
  it('emits the initial snapshot synchronously', fakeAsync(() => {
    const emissions: CoinSnapshot[][] = [];
    service.topCoins$.subscribe(coins => emissions.push(coins));
    tick(0);
    expect(emissions.length).toBeGreaterThanOrEqual(1);
    expect(emissions[0][0].current_price).toBe(65_000);
  }));

  // -------------------------------------------------------------------------
  // 2. Merges a tick and updates the price for the matching coin
  // -------------------------------------------------------------------------
  it('updates current_price when a tick arrives', fakeAsync(() => {
    const latest: CoinSnapshot[][] = [];
    service.topCoins$.subscribe(coins => latest.push(coins));
    tick(0);

    btcTick$.next({ symbol: 'BTCUSDT', price: 66_000, timestamp: Date.now() });
    tick(251); // past throttleTime(250)

    const last = latest[latest.length - 1];
    const btcRow = last.find(c => c.symbol === 'btc');
    expect(btcRow?.current_price).toBe(66_000);
  }));

  // -------------------------------------------------------------------------
  // 3. throttleTime(250) suppresses rapid successive ticks within the window
  // -------------------------------------------------------------------------
  it('throttles rapid ticks within a 250 ms window', fakeAsync(() => {
    const emissions: CoinSnapshot[][] = [];
    service.topCoins$.subscribe(coins => emissions.push(coins));
    tick(0); // startWith

    const countAfterInit = emissions.length;

    // Fire 5 ticks at t=0 (within throttle window)
    for (let i = 0; i < 5; i++) {
      btcTick$.next({ symbol: 'BTCUSDT', price: 65_000 + i * 10, timestamp: Date.now() });
    }

    // Still no new emission within the 250 ms throttle window beyond the first
    expect(emissions.length).toBeLessThanOrEqual(countAfterInit + 1);

    discardPeriodicTasks();
  }));

  // -------------------------------------------------------------------------
  // 4. Deny-listed stablecoin symbols are never subscribed
  // -------------------------------------------------------------------------
  it('does not call tick$() for deny-listed stablecoins', fakeAsync(() => {
    // Re-configure with USDT in the list
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        PriceStreamService,
        { provide: MarketApiService, useValue: { topCoins$: of([btc, usdt]) } },
        { provide: BINANCE_WS, useValue: mockWs },
      ],
    });
    const svc = TestBed.inject(PriceStreamService);
    tickSpy.mockClear();

    svc.topCoins$.subscribe();
    tick(0);

    const calledSymbols = tickSpy.mock.calls.map((c: any[]) => c[0]);
    expect(calledSymbols).not.toContain('USDTUSDT');
  }));

  // -------------------------------------------------------------------------
  // 5. priceFor() signal reflects the coin data
  // -------------------------------------------------------------------------
  it('priceFor() signal returns the matching coin from the initial snapshot', fakeAsync(() => {
    // toSignal() requires injection context — use runInInjectionContext
    let priceSig: ReturnType<typeof service.priceFor> | undefined;
    TestBed.runInInjectionContext(() => {
      priceSig = service.priceFor('btc');
    });
    tick(0);
    expect(priceSig?.()?.current_price).toBe(65_000);
    discardPeriodicTasks();
  }));
});
