import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { WatchlistService } from './watchlist.service';
import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('WatchlistService', () => {
  let service: WatchlistService;
  let prismaMock: { watchlistItem: Record<string, jest.Mock> };

  beforeEach(async () => {
    prismaMock = {
      watchlistItem: {
        findMany: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WatchlistService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<WatchlistService>(WatchlistService);
  });

  it('findAll returns user items', async () => {
    prismaMock.watchlistItem.findMany.mockResolvedValue([
      { coinId: 'bitcoin' },
    ]);
    const result = await service.findAll('user-1');
    expect(result).toEqual([{ coinId: 'bitcoin' }]);
    expect(prismaMock.watchlistItem.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { addedAt: 'desc' },
    });
  });

  it('create adds a coin', async () => {
    prismaMock.watchlistItem.create.mockResolvedValue({ coinId: 'bitcoin' });
    const result = await service.create('user-1', { coinId: 'bitcoin' });
    expect(result).toEqual({ coinId: 'bitcoin' });
  });

  it('create throws ConflictException on duplicate', async () => {
    const p2002Error = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '5',
      },
    );
    prismaMock.watchlistItem.create.mockRejectedValue(p2002Error);

    await expect(
      service.create('user-1', { coinId: 'bitcoin' }),
    ).rejects.toThrow(ConflictException);
  });

  it('remove deletes an item if it exists', async () => {
    prismaMock.watchlistItem.deleteMany.mockResolvedValue({ count: 1 });
    await service.remove('user-1', 'bitcoin');
    expect(prismaMock.watchlistItem.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', coinId: 'bitcoin' },
    });
  });

  it('remove is idempotent when item does not exist', async () => {
    prismaMock.watchlistItem.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.remove('user-1', 'bitcoin')).resolves.toBeUndefined();
  });
});
