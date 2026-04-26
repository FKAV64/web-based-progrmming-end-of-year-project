import { Test, TestingModule } from '@nestjs/testing';
import { CoingeckoFetcherService } from './coingecko-fetcher.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';

describe('CoingeckoFetcherService', () => {
  let service: CoingeckoFetcherService;
  let cacheSetMock: jest.Mock;
  let emitMock: jest.Mock;
  let globalFetchMock: jest.Mock;

  beforeEach(async () => {
    cacheSetMock = jest.fn();
    emitMock = jest.fn();
    globalFetchMock = jest.fn();
    global.fetch = globalFetchMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoingeckoFetcherService,
        { provide: CACHE_MANAGER, useValue: { set: cacheSetMock } },
        { provide: EventEmitter2, useValue: { emit: emitMock } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('dummy_key') } },
      ],
    }).compile();

    service = module.get<CoingeckoFetcherService>(CoingeckoFetcherService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should write to Redis and emit event on success', async () => {
    const mockData = [{ id: 'bitcoin', current_price: 50000 }];
    globalFetchMock.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    await service['fetchAndStore']();

    expect(globalFetchMock).toHaveBeenCalled();
    expect(cacheSetMock).toHaveBeenCalledWith('market:top', mockData, 60_000);
    expect(emitMock).toHaveBeenCalledWith('snapshot.updated', mockData);
  });

  it('should ignore 429 and not touch cache', async () => {
    globalFetchMock.mockResolvedValue({
      ok: false,
      status: 429,
    });

    await service['fetchAndStore']();

    expect(cacheSetMock).not.toHaveBeenCalled();
    expect(emitMock).not.toHaveBeenCalled();
  });
});
