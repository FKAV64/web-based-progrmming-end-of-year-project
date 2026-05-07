import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PortfolioService } from './portfolio.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Currency } from '@prisma/client';

describe('PortfolioService', () => {
  let service: PortfolioService;
  let prismaMock: { portfolioPosition: Record<string, jest.Mock> };
  let auditMock: { log: jest.Mock };

  beforeEach(async () => {
    prismaMock = {
      portfolioPosition: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    };

    auditMock = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
  });

  it('findAll filters by closedAt if includeClosed is false', async () => {
    prismaMock.portfolioPosition.findMany.mockResolvedValue([]);
    await service.findAll('user-1', false);
    expect(prismaMock.portfolioPosition.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', closedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('findAll does not filter by closedAt if includeClosed is true', async () => {
    prismaMock.portfolioPosition.findMany.mockResolvedValue([]);
    await service.findAll('user-1', true);
    expect(prismaMock.portfolioPosition.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('User A cannot delete User Bs portfolio position', async () => {
    // If findFirst with { id: posId, userId: User A } returns null (because it belongs to User B)
    prismaMock.portfolioPosition.findFirst.mockResolvedValue(null);

    await expect(service.remove('user-A', 'pos-1')).rejects.toThrow(NotFoundException);
    expect(prismaMock.portfolioPosition.delete).not.toHaveBeenCalled();
  });

  it('closing a position sets closedAt and closePrice', async () => {
    prismaMock.portfolioPosition.findFirst.mockResolvedValue({ id: 'pos-1', userId: 'user-1', closedAt: null });
    prismaMock.portfolioPosition.update.mockResolvedValue({ id: 'pos-1', closedAt: new Date(), closePrice: '50000' });

    await service.close('user-1', 'pos-1', { closePrice: '50000' });

    expect(prismaMock.portfolioPosition.update).toHaveBeenCalledWith({
      where: { id: 'pos-1' },
      data: expect.objectContaining({
        closePrice: '50000',
        closedAt: expect.any(Date),
      }),
    });
    expect(auditMock.log).toHaveBeenCalledWith(
      'portfolio.position_closed',
      'user-1',
      undefined,
      undefined,
      expect.objectContaining({ positionId: 'pos-1', closePrice: '50000' })
    );
  });

  it('prevents further PATCH updates if already closed', async () => {
    prismaMock.portfolioPosition.findFirst.mockResolvedValue({ id: 'pos-1', userId: 'user-1', closedAt: new Date() });

    await expect(service.update('user-1', 'pos-1', { quantity: '2' })).rejects.toThrow(BadRequestException);
    expect(prismaMock.portfolioPosition.update).not.toHaveBeenCalled();
  });
});
