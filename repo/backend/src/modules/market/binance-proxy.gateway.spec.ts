import { Test, TestingModule } from '@nestjs/testing';
import { HttpAdapterHost } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventEmitter } from 'events';
import { BinanceProxyGateway } from './binance-proxy.gateway';

// ── ws mock ──────────────────────────────────────────────────────────────────
// Must be declared before jest.mock() hoisting resolves the factory.
jest.mock('ws', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EventEmitter: EE } = require('events');

  class MockWs extends EE {
    readyState = 1; // OPEN
    send = jest.fn();
    close = jest.fn();
    static OPEN = 1;
  }

  class MockWss extends EE {
    // Immediately invokes the upgrade callback with a fresh MockWs.
    handleUpgrade = jest.fn(
      (
        _req: unknown,
        _socket: unknown,
        _head: unknown,
        cb: (ws: MockWs) => void,
      ) => {
        cb(new MockWs());
      },
    );
    close = jest.fn();
  }

  return { WebSocket: MockWs, WebSocketServer: MockWss };
});
// ─────────────────────────────────────────────────────────────────────────────

/** Builds a fake HttpAdapterHost backed by a plain EventEmitter. */
function makeAdapter() {
  const httpServer = new EventEmitter();
  const httpAdapterHost = {
    httpAdapter: { getHttpServer: () => httpServer },
  } as unknown as HttpAdapterHost;
  return { httpAdapterHost, httpServer };
}

/** Simulates a browser connecting to /ws/binance. Returns the client socket mock. */
function connectClient(gateway: BinanceProxyGateway, httpServer: EventEmitter) {
  httpServer.emit(
    'upgrade',
    { url: '/ws/binance' },
    new EventEmitter(),
    Buffer.alloc(0),
  );
  const clients = gateway['clients'] as Set<unknown>;
  return [...clients].at(-1) as ReturnType<
    typeof import('events').EventEmitter.prototype.emit
  > & {
    readyState: number;
    send: jest.Mock;
    close: jest.Mock;
  };
}

describe('BinanceProxyGateway', () => {
  let gateway: BinanceProxyGateway;
  let httpServer: EventEmitter;
  let eventEmitterMock: { emit: jest.Mock };

  beforeEach(async () => {
    jest.useFakeTimers();

    const { httpAdapterHost, httpServer: hs } = makeAdapter();
    httpServer = hs;
    eventEmitterMock = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BinanceProxyGateway,
        { provide: HttpAdapterHost, useValue: httpAdapterHost },
        { provide: EventEmitter2, useValue: eventEmitterMock },
      ],
    }).compile();

    gateway = module.get(BinanceProxyGateway);
    gateway.onModuleInit();
  });

  afterEach(() => {
    gateway.onApplicationShutdown();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // ── instantiation ──────────────────────────────────────────────────────────

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('creates a WebSocketServer on bootstrap', () => {
    expect(gateway['wss']).toBeDefined();
  });

  it('opens a connection to Binance on bootstrap', () => {
    expect(gateway['binanceWs']).not.toBeNull();
  });

  // ── upgrade / routing ──────────────────────────────────────────────────────

  describe('upgrade handling', () => {
    it('accepts upgrade requests on /ws/binance and registers the client', () => {
      expect(gateway['clients'].size).toBe(0);
      httpServer.emit(
        'upgrade',
        { url: '/ws/binance' },
        new EventEmitter(),
        Buffer.alloc(0),
      );
      expect(gateway['clients'].size).toBe(1);
    });

    it('ignores upgrade requests on other paths', () => {
      httpServer.emit(
        'upgrade',
        { url: '/api/other' },
        new EventEmitter(),
        Buffer.alloc(0),
      );
      expect(gateway['clients'].size).toBe(0);
    });
  });

  // ── client lifecycle ───────────────────────────────────────────────────────

  describe('client lifecycle', () => {
    it('removes client from the set on close', () => {
      const client = connectClient(gateway, httpServer) as any;
      expect(gateway['clients'].size).toBe(1);
      client.emit('close');
      expect(gateway['clients'].size).toBe(0);
    });

    it('removes client from the set on error', () => {
      const client = connectClient(gateway, httpServer) as any;
      client.emit('error', new Error('socket reset'));
      expect(gateway['clients'].size).toBe(0);
    });
  });

  // ── message forwarding ─────────────────────────────────────────────────────

  describe('message forwarding', () => {
    it('forwards a client SUBSCRIBE message to Binance when the socket is OPEN', () => {
      const client = connectClient(gateway, httpServer) as any;
      const binance = gateway['binanceWs'] as any;
      const msg = JSON.stringify({
        method: 'SUBSCRIBE',
        params: ['btcusdt@miniTicker'],
        id: 1,
      });

      client.emit('message', Buffer.from(msg));

      expect(binance.send).toHaveBeenCalledWith(msg);
    });

    it('does NOT forward to Binance when the socket is not OPEN', () => {
      const client = connectClient(gateway, httpServer) as any;
      const binance = gateway['binanceWs'] as any;
      binance.readyState = 3; // CLOSED
      const msg = JSON.stringify({
        method: 'SUBSCRIBE',
        params: ['btcusdt@miniTicker'],
        id: 1,
      });

      client.emit('message', Buffer.from(msg));

      expect(binance.send).not.toHaveBeenCalled();
    });

    it('broadcasts a Binance tick to every connected client', () => {
      const clientA = connectClient(gateway, httpServer) as any;
      const clientB = connectClient(gateway, httpServer) as any;
      const binance = gateway['binanceWs'] as any;
      const tick = JSON.stringify({ s: 'BTCUSDT', c: '50000', E: 1234567890 });

      binance.emit('message', Buffer.from(tick));

      expect(clientA.send).toHaveBeenCalledWith(tick);
      expect(clientB.send).toHaveBeenCalledWith(tick);
    });

    it('does NOT send to a client whose readyState is not OPEN', () => {
      const client = connectClient(gateway, httpServer) as any;
      client.readyState = 3; // CLOSED
      const binance = gateway['binanceWs'] as any;

      binance.emit('message', Buffer.from('{}'));

      expect(client.send).not.toHaveBeenCalled();
    });
  });

  // ── subscription tracking ──────────────────────────────────────────────────

  describe('subscription tracking', () => {
    it('stores stream names from SUBSCRIBE messages', () => {
      const client = connectClient(gateway, httpServer) as any;
      const msg = JSON.stringify({
        method: 'SUBSCRIBE',
        params: ['btcusdt@miniTicker', 'ethusdt@miniTicker'],
        id: 1,
      });

      client.emit('message', Buffer.from(msg));

      expect(gateway['activeStreams'].has('btcusdt@miniTicker')).toBe(true);
      expect(gateway['activeStreams'].has('ethusdt@miniTicker')).toBe(true);
    });

    it('resubscribes tracked streams when Binance re-opens', () => {
      gateway['activeStreams'].add('btcusdt@miniTicker');
      gateway['activeStreams'].add('ethusdt@miniTicker');
      const binance = gateway['binanceWs'] as any;

      binance.emit('open');

      expect(binance.send).toHaveBeenCalledWith(
        expect.stringContaining('btcusdt@miniTicker'),
      );
      expect(binance.send).toHaveBeenCalledWith(
        expect.stringContaining('ethusdt@miniTicker'),
      );
    });

    it('skips resubscribe when there are no tracked streams', () => {
      const binance = gateway['binanceWs'] as any;
      binance.emit('open');
      expect(binance.send).not.toHaveBeenCalled();
    });
  });

  // ── reconnection ───────────────────────────────────────────────────────────

  describe('reconnection', () => {
    it('schedules a reconnect timer when Binance closes', () => {
      const binance = gateway['binanceWs'] as any;
      binance.emit('close');
      expect(gateway['reconnectTimer']).not.toBeNull();
    });

    it('creates a new Binance socket after the backoff delay', () => {
      const originalBinance = gateway['binanceWs'];
      const binance = gateway['binanceWs'] as any;

      binance.emit('close'); // attempt 0 → delay 1 000 ms
      jest.advanceTimersByTime(1_000);

      expect(gateway['binanceWs']).not.toBe(originalBinance);
    });

    it('does not schedule a second timer if one is already pending', () => {
      const binance = gateway['binanceWs'] as any;
      binance.emit('close');
      const firstTimer = gateway['reconnectTimer'];
      binance.emit('close'); // second close while timer is pending
      expect(gateway['reconnectTimer']).toBe(firstTimer);
    });

    it('resets the attempt counter when the Binance socket reopens', () => {
      gateway['reconnectAttempt'] = 4;
      const binance = gateway['binanceWs'] as any;
      binance.emit('open');
      expect(gateway['reconnectAttempt']).toBe(0);
    });
  });

  // ── addServerSubscription ──────────────────────────────────────────────────

  describe('addServerSubscription', () => {
    it('adds stream to activeStreams and sends SUBSCRIBE to Binance when open', () => {
      const binance = gateway['binanceWs'] as any;
      binance.send.mockClear();

      gateway.addServerSubscription('btcusdt@miniTicker');

      expect(gateway['activeStreams'].has('btcusdt@miniTicker')).toBe(true);
      expect(binance.send).toHaveBeenCalledWith(
        expect.stringContaining('btcusdt@miniTicker'),
      );
    });

    it('is idempotent — calling twice only sends one SUBSCRIBE', () => {
      const binance = gateway['binanceWs'] as any;
      binance.send.mockClear();

      gateway.addServerSubscription('btcusdt@miniTicker');
      gateway.addServerSubscription('btcusdt@miniTicker');

      expect(binance.send).toHaveBeenCalledTimes(1);
    });

    it('adds to activeStreams without sending when Binance is closed', () => {
      const binance = gateway['binanceWs'] as any;
      binance.readyState = 3; // CLOSED
      binance.send.mockClear();

      gateway.addServerSubscription('btcusdt@miniTicker');

      expect(gateway['activeStreams'].has('btcusdt@miniTicker')).toBe(true);
      expect(binance.send).not.toHaveBeenCalled();
    });

    it('server-subscribed streams are replayed by resubscribeAll on reconnect', () => {
      const binance = gateway['binanceWs'] as any;
      gateway.addServerSubscription('btcusdt@miniTicker');
      binance.send.mockClear();

      binance.emit('open');

      expect(binance.send).toHaveBeenCalledWith(
        expect.stringContaining('btcusdt@miniTicker'),
      );
    });
  });

  // ── binance.tick event emission ────────────────────────────────────────────

  describe('binance.tick event', () => {
    it('emits binance.tick for valid miniTicker frames', () => {
      const binance = gateway['binanceWs'] as any;
      const tick = JSON.stringify({ s: 'BTCUSDT', c: '51000.00', E: 1234567890 });

      binance.emit('message', Buffer.from(tick));

      expect(eventEmitterMock.emit).toHaveBeenCalledWith('binance.tick', {
        symbol: 'BTCUSDT',
        price: 51000,
        timestamp: 1234567890,
      });
    });

    it('falls back to Date.now() for timestamp when E field is absent', () => {
      const binance = gateway['binanceWs'] as any;
      const tick = JSON.stringify({ s: 'ETHUSDT', c: '3000.00' });

      binance.emit('message', Buffer.from(tick));

      expect(eventEmitterMock.emit).toHaveBeenCalledWith(
        'binance.tick',
        expect.objectContaining({ symbol: 'ETHUSDT', price: 3000 }),
      );
    });

    it('does NOT emit binance.tick for subscription confirmation frames', () => {
      const binance = gateway['binanceWs'] as any;
      const confirmation = JSON.stringify({ result: null, id: 1 });

      binance.emit('message', Buffer.from(confirmation));

      expect(eventEmitterMock.emit).not.toHaveBeenCalled();
    });

    it('does NOT emit binance.tick for non-JSON frames', () => {
      const binance = gateway['binanceWs'] as any;

      binance.emit('message', Buffer.from('not-json'));

      expect(eventEmitterMock.emit).not.toHaveBeenCalled();
    });
  });

  // ── shutdown ───────────────────────────────────────────────────────────────

  describe('shutdown', () => {
    it('cancels the pending reconnect timer', () => {
      const binance = gateway['binanceWs'] as any;
      binance.emit('close'); // arm a timer
      gateway.onApplicationShutdown();
      expect(gateway['reconnectTimer']).toBeNull();
    });

    it('closes the Binance socket on shutdown', () => {
      const binance = gateway['binanceWs'] as any;
      gateway.onApplicationShutdown();
      expect(binance.close).toHaveBeenCalled();
    });

    it('closes the WebSocket server on shutdown', () => {
      const wss = gateway['wss'] as any;
      gateway.onApplicationShutdown();
      expect(wss.close).toHaveBeenCalled();
    });
  });
});
