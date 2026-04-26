import { Test, TestingModule } from '@nestjs/testing';
import { MarketSnapshotService } from './market-snapshot.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ServiceUnavailableException } from '@nestjs/common';

describe('MarketSnapshotService', () => {
  let service: MarketSnapshotService;
  let cacheGetMock: jest.Mock;

  beforeEach(async () => {
    cacheGetMock = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketSnapshotService,
        { provide: CACHE_MANAGER, useValue: { get: cacheGetMock } },
      ],
    }).compile();

    service = module.get<MarketSnapshotService>(MarketSnapshotService);
  });

  it('should return cached data if available', async () => {
    const mockData = [{ id: 'bitcoin' }];
    cacheGetMock.mockResolvedValue(mockData);

    const result = await service.getTop();
    expect(result).toBe(mockData);
    expect(cacheGetMock).toHaveBeenCalledWith('market:top');
  });

  it('should throw 503 if cache is empty', async () => {
    cacheGetMock.mockResolvedValue(null);

    await expect(service.getTop()).rejects.toThrow(ServiceUnavailableException);
  });
});
