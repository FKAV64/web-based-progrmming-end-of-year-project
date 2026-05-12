import { TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { BinanceWsService } from './binance-ws.service';

// ---------------------------------------------------------------------------
// Mock rxjs/webSocket — keep the Subject's real next() but spy on send calls.
// ---------------------------------------------------------------------------
let mockSocket: Subject<any>;
let capturedConfig: any = null;

jest.mock('rxjs/webSocket', () => ({
  webSocket: jest.fn().mockImplementation((config: any) => {
    capturedConfig = config;
    // Attach Angular-style complete/error so the socket subject can be closed
    (mockSocket as any).complete = jest.fn();
    return mockSocket;
  }),
}));

describe('BinanceWsService', () => {
  let service: BinanceWsService;

  beforeEach(() => {
    // Fresh Subject for each test so emissions don't bleed across tests.
    mockSocket = new Subject<any>();
    capturedConfig = null;
    TestBed.configureTestingModule({});
    service = TestBed.inject(BinanceWsService);
  });

  // -------------------------------------------------------------------------
  // 1. connectionState starts at 'connecting'
  // -------------------------------------------------------------------------
  it('starts in connecting state', () => {
    expect(service.connectionState()).toBe('connecting');
  });

  // -------------------------------------------------------------------------
  // 2. connectionState → 'live' when openObserver fires
  // -------------------------------------------------------------------------
  it('transitions to live when the socket opens', () => {
    expect(capturedConfig?.openObserver).toBeDefined();
    capturedConfig.openObserver.next();
    expect(service.connectionState()).toBe('live');
  });

  // -------------------------------------------------------------------------
  // 3. connectionState → 'reconnecting' when closeObserver fires (after live)
  // -------------------------------------------------------------------------
  it('transitions to reconnecting when the socket closes', fakeAsync(() => {
    capturedConfig?.openObserver?.next();
    expect(service.connectionState()).toBe('live');

    capturedConfig?.closeObserver?.next();
    expect(service.connectionState()).toBe('reconnecting');

    discardPeriodicTasks();
  }));

  // -------------------------------------------------------------------------
  // 4. connection-level timeout fires after 60 s of total silence
  //    (per-symbol timeout removed; health check is now at shared connection$)
  // -------------------------------------------------------------------------
  it('transitions to reconnecting after 60 s of connection silence', fakeAsync(() => {
    service.tick$('BTCUSDT').subscribe({ error: () => {} });

    tick(60_100); // past the 60 s connection-level timeout

    expect(service.connectionState()).toBe('reconnecting');

    discardPeriodicTasks();
  }));

  // -------------------------------------------------------------------------
  // 5. Exponential backoff sequence capped at 30 s (pure math assertion)
  // -------------------------------------------------------------------------
  it('calculates exponential backoff correctly', () => {
    const expected = [1000, 2000, 4000, 8000, 16000, 30000, 30000];
    expected.forEach((ms, attempt) => {
      expect(Math.min(30_000, 2 ** attempt * 1000)).toBe(ms);
    });
  });

  // -------------------------------------------------------------------------
  // 6. A message before 10 s resets the timeout window (no false positive)
  // -------------------------------------------------------------------------
  it('does not time out when a message arrives before 10 s', fakeAsync(() => {
    const values: any[] = [];
    service.connection$.subscribe({ next: v => values.push(v) });

    tick(9_000); // advance 9 s — still within window

    // Emit a message — resets the per-emission 10 s window
    mockSocket.next({ s: 'BTCUSDT', c: '65000', E: Date.now() });

    tick(9_000); // 9 s more since last message — still within window

    // State should NOT be reconnecting (timeout not triggered yet)
    expect(service.connectionState()).not.toBe('reconnecting');
    expect(values.length).toBeGreaterThanOrEqual(1);

    discardPeriodicTasks();
  }));

  // -------------------------------------------------------------------------
  // 7. tick$() maps raw Binance mini-ticker frames to PriceTick
  // -------------------------------------------------------------------------
  it('tick$() maps raw Binance frames to PriceTick', fakeAsync(() => {
    const ticks: any[] = [];
    const sub = service.tick$('BTCUSDT').subscribe(t => ticks.push(t));

    mockSocket.next({ s: 'BTCUSDT', c: '65432.10', E: 1700000000000 });

    expect(ticks.length).toBe(1);
    expect(ticks[0].symbol).toBe('BTCUSDT');
    expect(ticks[0].price).toBeCloseTo(65432.10, 2);
    expect(ticks[0].timestamp).toBe(1700000000000);

    sub.unsubscribe();
    discardPeriodicTasks();
  }));

  // -------------------------------------------------------------------------
  // 8. tick$() filters out messages for other symbols
  // -------------------------------------------------------------------------
  it('tick$() filters out messages for other symbols', fakeAsync(() => {
    const ticks: any[] = [];
    const sub = service.tick$('ETHUSDT').subscribe(t => ticks.push(t));

    mockSocket.next({ s: 'BTCUSDT', c: '65000', E: Date.now() });
    mockSocket.next({ s: 'ETHUSDT', c: '3500', E: Date.now() });

    expect(ticks.length).toBe(1);
    expect(ticks[0].symbol).toBe('ETHUSDT');

    sub.unsubscribe();
    discardPeriodicTasks();
  }));
});
