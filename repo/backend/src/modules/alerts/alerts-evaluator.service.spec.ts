import { Test, TestingModule } from '@nestjs/testing';
import { AlertsEvaluatorService } from './alerts-evaluator.service';
import { AlertsNotifyGateway } from './alerts-notify.gateway';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { AuditService } from '../audit/audit.service';
import { CoingeckoService } from '../market/coingecko.service';
import { BinanceProxyGateway } from '../market/binance-proxy.gateway';

describe('AlertsEvaluatorService', () => {
  let service: AlertsEvaluatorService;
  let prismaMock: {
    priceAlert: { findMany: jest.Mock; updateMany: jest.Mock };
  };
  let pushMock: { send: jest.Mock };
  let auditMock: { log: jest.Mock };
  let coingeckoMock: { getExchangeRates: jest.Mock };
  let notifyGatewayMock: { notifyUser: jest.Mock; hasActiveSessions: jest.Mock };
  let binanceGatewayMock: { addServerSubscription: jest.Mock };

  beforeEach(async () => {
    prismaMock = {
      priceAlert: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn(),
      },
    };

    pushMock = { send: jest.fn() };
    auditMock = { log: jest.fn() };
    coingeckoMock = {
      getExchangeRates: jest.fn().mockRejectedValue(new Error('unreachable')),
    };
    notifyGatewayMock = {
      notifyUser: jest.fn(),
      hasActiveSessions: jest.fn().mockReturnValue(false),
    };
    binanceGatewayMock = { addServerSubscription: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsEvaluatorService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PushService, useValue: pushMock },
        { provide: AuditService, useValue: auditMock },
        { provide: CoingeckoService, useValue: coingeckoMock },
        { provide: AlertsNotifyGateway, useValue: notifyGatewayMock },
        { provide: BinanceProxyGateway, useValue: binanceGatewayMock },
      ],
    }).compile();

    service = module.get<AlertsEvaluatorService>(AlertsEvaluatorService);

    // Run bootstrap to clear any DB state (returns empty list from mock).
    await service.onApplicationBootstrap();
  });

  // ── onApplicationBootstrap ─────────────────────────────────────────────────

  it('warms cache from DB on bootstrap', async () => {
    prismaMock.priceAlert.findMany.mockResolvedValue([
      {
        id: 'alert-boot',
        userId: 'user-1',
        coinId: 'bitcoin',
        condition: 'ABOVE',
        targetPrice: 50000,
        currency: 'USD',
        triggeredAt: null,
      },
    ]);

    await service.onApplicationBootstrap();

    // After bootstrap the cache should contain the alert; a tick for BTCUSDT
    // should evaluate without hitting DB (findMany not called again).
    prismaMock.priceAlert.findMany.mockClear();
    prismaMock.priceAlert.updateMany.mockResolvedValue({ count: 0 });

    // Build the symbol map so the tick resolves to coinId.
    await service.handleSnapshot([
      { id: 'bitcoin', symbol: 'btc', current_price: 51000 },
    ]);

    await service.handleBinanceTick({ symbol: 'BTCUSDT', price: 51000, timestamp: Date.now() });

    expect(prismaMock.priceAlert.findMany).not.toHaveBeenCalled();
  });

  // ── handleSnapshot ─────────────────────────────────────────────────────────

  it('handleSnapshot builds symbol maps and does NOT read alerts from DB', async () => {
    prismaMock.priceAlert.findMany.mockClear();

    await service.handleSnapshot([
      { id: 'bitcoin', symbol: 'btc', current_price: 51000 },
      { id: 'ethereum', symbol: 'eth', current_price: 3000 },
    ]);

    expect(prismaMock.priceAlert.findMany).not.toHaveBeenCalled();
    expect(coingeckoMock.getExchangeRates).toHaveBeenCalledTimes(1);
  });

  it('handleSnapshot calls addServerSubscription for cached coins', async () => {
    // Seed cache with a bitcoin alert.
    service.addToCache({
      id: 'alert-1',
      userId: 'user-1',
      coinId: 'bitcoin',
      condition: 'ABOVE',
      targetPrice: 50000 as unknown as import('@prisma/client').Prisma.Decimal,
      currency: 'USD' as import('@prisma/client').Currency,
      triggeredAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    binanceGatewayMock.addServerSubscription.mockClear();

    await service.handleSnapshot([
      { id: 'bitcoin', symbol: 'btc', current_price: 51000 },
    ]);

    expect(binanceGatewayMock.addServerSubscription).toHaveBeenCalledWith('btcusdt@miniTicker');
  });

  // ── handleBinanceTick ──────────────────────────────────────────────────────

  describe('handleBinanceTick', () => {
    const btcAlert = {
      id: 'alert-1',
      userId: 'user-1',
      coinId: 'bitcoin',
      condition: 'ABOVE' as const,
      targetPrice: 50000 as unknown as import('@prisma/client').Prisma.Decimal,
      currency: 'USD' as import('@prisma/client').Currency,
      triggeredAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(async () => {
      // Populate symbol map.
      await service.handleSnapshot([
        { id: 'bitcoin', symbol: 'btc', current_price: 51000 },
      ]);
    });

    it('ABOVE alert fires when price >= target', async () => {
      service.addToCache(btcAlert);
      prismaMock.priceAlert.updateMany.mockResolvedValue({ count: 1 });

      await service.handleBinanceTick({ symbol: 'BTCUSDT', price: 51000, timestamp: Date.now() });

      expect(prismaMock.priceAlert.updateMany).toHaveBeenCalledWith({
        where: { id: 'alert-1', triggeredAt: null },
        data: { triggeredAt: expect.any(Date) },
      });
      expect(pushMock.send).toHaveBeenCalledTimes(1);
      expect(pushMock.send).toHaveBeenCalledWith('user-1', {
        title: 'BITCOIN above 50000 USD',
        body: 'Now at 51000.00 USD',
      });
      expect(auditMock.log).toHaveBeenCalledWith(
        'alert.triggered',
        'user-1',
        undefined,
        undefined,
        expect.objectContaining({ alertId: 'alert-1' }),
      );
    });

    it('BELOW alert fires when price <= target', async () => {
      service.addToCache({
        ...btcAlert,
        id: 'alert-2',
        condition: 'BELOW' as const,
        targetPrice: 55000 as unknown as import('@prisma/client').Prisma.Decimal,
      });
      prismaMock.priceAlert.updateMany.mockResolvedValue({ count: 1 });

      await service.handleBinanceTick({ symbol: 'BTCUSDT', price: 51000, timestamp: Date.now() });

      expect(pushMock.send).toHaveBeenCalledTimes(1);
    });

    it('does not fire when price does not meet condition', async () => {
      service.addToCache({
        ...btcAlert,
        targetPrice: 60000 as unknown as import('@prisma/client').Prisma.Decimal,
      });

      await service.handleBinanceTick({ symbol: 'BTCUSDT', price: 51000, timestamp: Date.now() });

      expect(prismaMock.priceAlert.updateMany).not.toHaveBeenCalled();
      expect(pushMock.send).not.toHaveBeenCalled();
    });

    it('returns early for unknown symbol without any DB call', async () => {
      await service.handleBinanceTick({ symbol: 'XYZUSDT', price: 100, timestamp: Date.now() });

      expect(prismaMock.priceAlert.updateMany).not.toHaveBeenCalled();
    });

    it('CAS guard — updateMany count=0 skips push/notify/audit', async () => {
      service.addToCache(btcAlert);
      prismaMock.priceAlert.updateMany.mockResolvedValue({ count: 0 });

      await service.handleBinanceTick({ symbol: 'BTCUSDT', price: 51000, timestamp: Date.now() });

      expect(prismaMock.priceAlert.updateMany).toHaveBeenCalledTimes(1);
      expect(pushMock.send).not.toHaveBeenCalled();
      expect(notifyGatewayMock.notifyUser).not.toHaveBeenCalled();
      expect(auditMock.log).not.toHaveBeenCalled();
    });

    it('alert is removed from cache after successful CAS', async () => {
      service.addToCache(btcAlert);
      prismaMock.priceAlert.updateMany.mockResolvedValue({ count: 1 });

      await service.handleBinanceTick({ symbol: 'BTCUSDT', price: 51000, timestamp: Date.now() });

      // A second tick for the same alert should not trigger updateMany again.
      prismaMock.priceAlert.updateMany.mockClear();
      await service.handleBinanceTick({ symbol: 'BTCUSDT', price: 52000, timestamp: Date.now() });

      expect(prismaMock.priceAlert.updateMany).not.toHaveBeenCalled();
    });

    it('skips push when user has active WS sessions (AlarmModal handles it)', async () => {
      notifyGatewayMock.hasActiveSessions.mockReturnValue(true);
      service.addToCache(btcAlert);
      prismaMock.priceAlert.updateMany.mockResolvedValue({ count: 1 });

      await service.handleBinanceTick({ symbol: 'BTCUSDT', price: 51000, timestamp: Date.now() });

      expect(notifyGatewayMock.notifyUser).toHaveBeenCalledTimes(1);
      expect(pushMock.send).not.toHaveBeenCalled();
    });
  });

  // ── addToCache / removeFromCache ───────────────────────────────────────────

  describe('addToCache', () => {
    it('inserts alert into cache and subscribes to Binance stream when symbol is known', async () => {
      await service.handleSnapshot([
        { id: 'bitcoin', symbol: 'btc', current_price: 51000 },
      ]);
      binanceGatewayMock.addServerSubscription.mockClear();

      service.addToCache({
        id: 'alert-new',
        userId: 'user-1',
        coinId: 'bitcoin',
        condition: 'ABOVE' as import('@prisma/client').AlertCondition,
        targetPrice: 50000 as unknown as import('@prisma/client').Prisma.Decimal,
        currency: 'USD' as import('@prisma/client').Currency,
        triggeredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(binanceGatewayMock.addServerSubscription).toHaveBeenCalledWith('btcusdt@miniTicker');

      // The alert should now be evaluated on ticks.
      prismaMock.priceAlert.updateMany.mockResolvedValue({ count: 1 });
      await service.handleBinanceTick({ symbol: 'BTCUSDT', price: 51000, timestamp: Date.now() });
      expect(pushMock.send).toHaveBeenCalledTimes(1);
    });

    it('inserts alert without calling addServerSubscription when symbol not yet known', () => {
      service.addToCache({
        id: 'alert-no-sym',
        userId: 'user-1',
        coinId: 'unknowncoin',
        condition: 'ABOVE' as import('@prisma/client').AlertCondition,
        targetPrice: 1 as unknown as import('@prisma/client').Prisma.Decimal,
        currency: 'USD' as import('@prisma/client').Currency,
        triggeredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(binanceGatewayMock.addServerSubscription).not.toHaveBeenCalled();
    });
  });

  describe('removeFromCache', () => {
    it('removes alert from list and keeps coinId key when other alerts remain', async () => {
      await service.handleSnapshot([
        { id: 'bitcoin', symbol: 'btc', current_price: 51000 },
      ]);

      const base = {
        userId: 'user-1',
        coinId: 'bitcoin',
        condition: 'ABOVE' as import('@prisma/client').AlertCondition,
        targetPrice: 50000 as unknown as import('@prisma/client').Prisma.Decimal,
        currency: 'USD' as import('@prisma/client').Currency,
        triggeredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      service.addToCache({ ...base, id: 'a1' });
      service.addToCache({ ...base, id: 'a2' });

      service.removeFromCache('a1', 'bitcoin');

      // a2 should still trigger; a1 should not.
      prismaMock.priceAlert.updateMany.mockResolvedValue({ count: 1 });
      await service.handleBinanceTick({ symbol: 'BTCUSDT', price: 51000, timestamp: Date.now() });
      expect(prismaMock.priceAlert.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'a2', triggeredAt: null } }),
      );
      expect(prismaMock.priceAlert.updateMany).not.toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'a1', triggeredAt: null } }),
      );
    });

    it('deletes coinId key when last alert for that coin is removed', async () => {
      await service.handleSnapshot([
        { id: 'bitcoin', symbol: 'btc', current_price: 51000 },
      ]);

      service.addToCache({
        id: 'only-alert',
        userId: 'user-1',
        coinId: 'bitcoin',
        condition: 'ABOVE' as import('@prisma/client').AlertCondition,
        targetPrice: 50000 as unknown as import('@prisma/client').Prisma.Decimal,
        currency: 'USD' as import('@prisma/client').Currency,
        triggeredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      service.removeFromCache('only-alert', 'bitcoin');

      // No alerts remain — tick should be a complete no-op.
      await service.handleBinanceTick({ symbol: 'BTCUSDT', price: 51000, timestamp: Date.now() });
      expect(prismaMock.priceAlert.updateMany).not.toHaveBeenCalled();
    });
  });
});
