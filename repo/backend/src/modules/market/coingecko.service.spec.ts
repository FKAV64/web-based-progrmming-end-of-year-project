import { Test, TestingModule } from '@nestjs/testing';
import { CoingeckoService } from './coingecko.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

const mockFetch = jest.fn();

describe('CoingeckoService', () => {
  let service: CoingeckoService;
  let cacheWrapMock: jest.Mock;

  beforeEach(async () => {
    cacheWrapMock = jest.fn(async (_key, factory) => factory());
    global.fetch = mockFetch as typeof global.fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoingeckoService,
        { provide: CACHE_MANAGER, useValue: { wrap: cacheWrapMock } },
      ],
    }).compile();

    service = module.get<CoingeckoService>(CoingeckoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('fetches coin detail from the public endpoint without a demo key', async () => {
    const payload = { id: 'bitcoin' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(payload),
    });

    await expect(service.getCoin('bitcoin')).resolves.toEqual(payload);

    expect(cacheWrapMock).toHaveBeenCalledWith(
      'coingecko:coin:bitcoin',
      expect.any(Function),
      5 * 60_000,
    );
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(
      'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false',
    );
    expect(url).not.toContain('x_cg_demo_api_key');
  });

  it('fetches market chart data from the public endpoint without a demo key', async () => {
    const payload = { prices: [] };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(payload),
    });

    await expect(service.getMarketChart('bitcoin', '7')).resolves.toEqual(
      payload,
    );

    expect(cacheWrapMock).toHaveBeenCalledWith(
      'coingecko:chart:bitcoin:7',
      expect.any(Function),
      60_000,
    );
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(
      'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7',
    );
    expect(url).not.toContain('x_cg_demo_api_key');
  });

  it('fetches exchange rates from the public endpoint without a demo key', async () => {
    const payload = { rates: { usd: { value: 1 } } };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(payload),
    });

    await expect(service.getExchangeRates()).resolves.toEqual(payload);

    expect(cacheWrapMock).toHaveBeenCalledWith(
      'coingecko:exchange_rates',
      expect.any(Function),
      60 * 60_000,
    );
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.coingecko.com/api/v3/exchange_rates');
    expect(url).not.toContain('x_cg_demo_api_key');
  });
});
