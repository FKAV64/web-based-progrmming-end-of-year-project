import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsService } from './alerts.service';
import { NotFoundException } from '@nestjs/common';

describe('AlertsService', () => {
  let service: AlertsService;
  let prismaMock: { priceAlert: Record<string, jest.Mock> };

  beforeEach(async () => {
    prismaMock = {
      priceAlert: {
        findMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: PrismaService, useValue: prismaMock },
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

    await expect(service.remove('user-A', 'alert-1')).rejects.toThrow(NotFoundException);
    expect(prismaMock.priceAlert.delete).not.toHaveBeenCalled();
  });
});
