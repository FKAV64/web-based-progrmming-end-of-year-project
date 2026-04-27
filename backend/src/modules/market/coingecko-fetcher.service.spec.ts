import { Test, TestingModule } from '@nestjs/testing';
import { CoingeckoFetcherService } from './coingecko-fetcher.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';

// Mock global fetch (service now uses Node.js built-in fetch, not undici)
const mockFetch = jest.fn();

describe('CoingeckoFetcherService', () => {
  let service: CoingeckoFetcherService;
  let cacheSetMock: jest.Mock;
  let emitMock: jest.Mock;

  beforeEach(async () => {
    cacheSetMock = jest.fn();
    emitMock = jest.fn();

    // Replace global fetch with our mock
    global.fetch = mockFetch as any;

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
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    await service['fetchAndStore']();

    expect(mockFetch).toHaveBeenCalled();
    expect(cacheSetMock).toHaveBeenCalledWith('market:top', mockData, 60_000);
    expect(emitMock).toHaveBeenCalledWith('snapshot.updated', mockData);
  });

  it('should not touch cache on 429', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
    });

    await service['fetchAndStore']();

    expect(cacheSetMock).not.toHaveBeenCalled();
    expect(emitMock).not.toHaveBeenCalled();
  });
});
