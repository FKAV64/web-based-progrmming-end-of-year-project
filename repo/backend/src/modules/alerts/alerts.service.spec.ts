import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsService } from './alerts.service';
import { AlertsEvaluatorService } from './alerts-evaluator.service';
import { NotFoundException } from '@nestjs/common';

describe('AlertsService', () => {
  let service: AlertsService;
  let prismaMock: { priceAlert: Record<string, jest.Mock> };
  let evaluatorMock: { addToCache: jest.Mock; removeFromCache: jest.Mock };

  beforeEach(async () => {
    prismaMock = {
      priceAlert: {
        findMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    };

    evaluatorMock = {
      addToCache: jest.fn(),
      removeFromCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AlertsEvaluatorService, useValue: evaluatorMock },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
  });

  it('findAll filters by triggeredAt if includeTriggered is false', async () => {
    prismaMock.priceAlert.findMany.mockResolvedValue([]);
    await service.findAll('user-1', false);
    expect(prismaMock.priceAlert.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', triggeredAt: null },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('findAll does not filter by triggeredAt if includeTriggered is true', async () => {
    prismaMock.priceAlert.findMany.mockResolvedValue([]);
    await service.findAll('user-1', true);
    expect(prismaMock.priceAlert.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('User A cannot delete User Bs alert', async () => {
    prismaMock.priceAlert.findFirst.mockResolvedValue(null);

    await expect(service.remove('user-A', 'alert-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(prismaMock.priceAlert.delete).not.toHaveBeenCalled();
    expect(evaluatorMock.removeFromCache).not.toHaveBeenCalled();
  });

  it('create calls evaluator.addToCache with the returned alert', async () => {
    const createdAlert = {
      id: 'alert-new',
      userId: 'user-1',
      coinId: 'bitcoin',
      condition: 'ABOVE',
      targetPrice: 50000,
      currency: 'USD',
      triggeredAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaMock.priceAlert.create.mockResolvedValue(createdAlert);

    const result = await service.create('user-1', {
      coinId: 'bitcoin',
      condition: 'ABOVE' as any,
      targetPrice: '50000',
      currency: 'USD' as any,
    });

    expect(result).toBe(createdAlert);
    expect(evaluatorMock.addToCache).toHaveBeenCalledWith(createdAlert);
  });

  it('remove calls evaluator.removeFromCache after successful delete', async () => {
    const existingAlert = {
      id: 'alert-1',
      userId: 'user-1',
      coinId: 'bitcoin',
      condition: 'ABOVE',
      targetPrice: 50000,
      currency: 'USD',
      triggeredAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaMock.priceAlert.findFirst.mockResolvedValue(existingAlert);
    prismaMock.priceAlert.delete.mockResolvedValue(existingAlert);

    await service.remove('user-1', 'alert-1');

    expect(prismaMock.priceAlert.delete).toHaveBeenCalledWith({ where: { id: 'alert-1' } });
    expect(evaluatorMock.removeFromCache).toHaveBeenCalledWith('alert-1', 'bitcoin');
  });
});
