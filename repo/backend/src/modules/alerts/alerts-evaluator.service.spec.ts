import { Test, TestingModule } from '@nestjs/testing';
import { AlertsEvaluatorService } from './alerts-evaluator.service';
import { AlertsNotifyGateway } from './alerts-notify.gateway';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { AuditService } from '../audit/audit.service';
import { CoingeckoService } from '../market/coingecko.service';

describe('AlertsEvaluatorService', () => {
  let service: AlertsEvaluatorService;
  let prismaMock: {
    priceAlert: { findMany: jest.Mock; updateMany: jest.Mock };
  };
  let pushMock: { send: jest.Mock };
  let auditMock: { log: jest.Mock };
  let coingeckoMock: { getExchangeRates: jest.Mock };
  let notifyGatewayMock: { notifyUser: jest.Mock };

  beforeEach(async () => {
    prismaMock = {
      priceAlert: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    pushMock = { send: jest.fn() };
    auditMock = { log: jest.fn() };
    coingeckoMock = {
      getExchangeRates: jest.fn().mockRejectedValue(new Error('unreachable')), // default: fallback rates
    };
    notifyGatewayMock = { notifyUser: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsEvaluatorService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PushService, useValue: pushMock },
        { provide: AuditService, useValue: auditMock },
        { provide: CoingeckoService, useValue: coingeckoMock },
        { provide: AlertsNotifyGateway, useValue: notifyGatewayMock },
      ],
    }).compile();

    service = module.get<AlertsEvaluatorService>(AlertsEvaluatorService);
  });

  const bitcoinSnapshot = [{ id: 'bitcoin', current_price: 51000 }];

  it('ABOVE alert at $50k with current $51k triggers', async () => {
    prismaMock.priceAlert.findMany.mockResolvedValue([
      {
        id: 'alert-1',
        userId: 'user-1',
        coinId: 'bitcoin',
        condition: 'ABOVE',
        targetPrice: 50000,
        currency: 'USD',
        triggeredAt: null,
      },
    ]);
    prismaMock.priceAlert.updateMany.mockResolvedValue({ count: 1 });

    await service.handleSnapshot(bitcoinSnapshot);

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

  it('BELOW alert triggers when price drops to or below target', async () => {
    prismaMock.priceAlert.findMany.mockResolvedValue([
      {
        id: 'alert-2',
        userId: 'user-1',
        coinId: 'bitcoin',
        condition: 'BELOW',
        targetPrice: 55000,
        currency: 'USD',
        triggeredAt: null,
      },
    ]);
    prismaMock.priceAlert.updateMany.mockResolvedValue({ count: 1 });

    await service.handleSnapshot(bitcoinSnapshot);

    expect(pushMock.send).toHaveBeenCalledTimes(1);
  });

  it('already-triggered alerts are not loaded by query', async () => {
    // The query uses WHERE triggeredAt IS NULL, so only untriggered alerts come back
    prismaMock.priceAlert.findMany.mockResolvedValue([]);

    await service.handleSnapshot(bitcoinSnapshot);

    expect(prismaMock.priceAlert.findMany).toHaveBeenCalledWith({
      where: { triggeredAt: null },
    });
    expect(pushMock.send).not.toHaveBeenCalled();
  });

  it('idempotency: CAS prevents double-fire', async () => {
    prismaMock.priceAlert.findMany.mockResolvedValue([
      {
        id: 'alert-1',
        userId: 'user-1',
        coinId: 'bitcoin',
        condition: 'ABOVE',
        targetPrice: 50000,
        currency: 'USD',
        triggeredAt: null,
      },
    ]);

    // First call: CAS succeeds
    prismaMock.priceAlert.updateMany.mockResolvedValueOnce({ count: 1 });
    await service.handleSnapshot(bitcoinSnapshot);
    expect(pushMock.send).toHaveBeenCalledTimes(1);

    // Reset for second call
    pushMock.send.mockClear();
    auditMock.log.mockClear();

    // Second call: CAS fails (already triggered)
    prismaMock.priceAlert.updateMany.mockResolvedValueOnce({ count: 0 });
    await service.handleSnapshot(bitcoinSnapshot);
    expect(pushMock.send).not.toHaveBeenCalled();
  });

  it('coin not in snapshot is silently skipped', async () => {
    prismaMock.priceAlert.findMany.mockResolvedValue([
      {
        id: 'alert-3',
        userId: 'user-1',
        coinId: 'dogecoin', // not in our snapshot
        condition: 'ABOVE',
        targetPrice: 0.01,
        currency: 'USD',
        triggeredAt: null,
      },
    ]);

    await service.handleSnapshot(bitcoinSnapshot);

    expect(prismaMock.priceAlert.updateMany).not.toHaveBeenCalled();
    expect(pushMock.send).not.toHaveBeenCalled();
  });

  it('does not fire when price does not meet condition', async () => {
    prismaMock.priceAlert.findMany.mockResolvedValue([
      {
        id: 'alert-4',
        userId: 'user-1',
        coinId: 'bitcoin',
        condition: 'ABOVE',
        targetPrice: 60000, // current is 51000, so this should NOT fire
        currency: 'USD',
        triggeredAt: null,
      },
    ]);

    await service.handleSnapshot(bitcoinSnapshot);

    expect(prismaMock.priceAlert.updateMany).not.toHaveBeenCalled();
    expect(pushMock.send).not.toHaveBeenCalled();
  });
});
