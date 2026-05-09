import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { type Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

/**
 * CoinGecko REST API client with built-in caching and retry logic.
 *
 * Wraps three CoinGecko endpoints and stores results in the shared cache
 * manager with different TTLs suited to each data type:
 * - Coin detail: 5 minutes (infrequently changing metadata)
 * - Price chart: 60 seconds (needs to be reasonably fresh)
 * - Exchange rates: 1 hour (BTC-relative rates are very stable)
 *
 * All requests include browser-like headers to reduce the chance of CoinGecko
 * treating the traffic as bot requests. An optional API key (COINGECKO_API_KEY)
 * is appended when configured to increase the rate limit.
 *
 * @module CoingeckoService
 */
@Injectable()
export class CoingeckoService {
  private readonly logger = new Logger('CoingeckoService');
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configService: ConfigService,
  ) {}

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries = 3,
  ): Promise<Response> {
    let lastError: unknown = new Error('Max retries exhausted');
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        lastError = new Error(`HTTP ${response.status}`);
      } catch (err: unknown) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Fetch attempt ${attempt + 1}/${maxRetries} failed: ${msg}`,
        );
      }
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        this.logger.log(`Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw lastError;
  }

  private getHeaders(): Record<string, string> {
    return {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      Referer: 'https://www.coingecko.com/',
      Origin: 'https://www.coingecko.com',
    };
  }

  /**
   * Returns detailed metadata and current market data for a single coin.
   * Result is cached for 5 minutes.
   *
   * @param id - CoinGecko coin identifier (e.g. "bitcoin", "ethereum")
   * @returns CoinGecko /coins/{id} response object
   */
  async getCoin(id: string): Promise<any> {
    const cacheKey = `coingecko:coin:${id}`;
    return this.cache.wrap(
      cacheKey,
      async () => {
        const apiKey =
          this.configService.get<string>('COINGECKO_API_KEY') || '';
        const url = `${this.baseUrl}/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false${apiKey ? `&x_cg_demo_api_key=${apiKey}` : ''}`;
        const response = await this.fetchWithRetry(url, {
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok)
          throw new Error(`CoinGecko HTTP error: ${response.status}`);
        return response.json() as unknown;
      },
      5 * 60_000,
    ); // 5 min
  }

  /**
   * Returns historical price chart data (prices, market caps, volumes) for a coin.
   * Result is cached for 60 seconds.
   *
   * @param id - CoinGecko coin identifier
   * @param days - Number of days of history (e.g. "1", "7", "30", "max")
   * @returns CoinGecko /coins/{id}/market_chart response object
   */
  async getMarketChart(id: string, days: string): Promise<any> {
    const cacheKey = `coingecko:chart:${id}:${days}`;
    return this.cache.wrap(
      cacheKey,
      async () => {
        const apiKey =
          this.configService.get<string>('COINGECKO_API_KEY') || '';
        const url = `${this.baseUrl}/coins/${id}/market_chart?vs_currency=usd&days=${days}${apiKey ? `&x_cg_demo_api_key=${apiKey}` : ''}`;
        const response = await this.fetchWithRetry(url, {
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok)
          throw new Error(`CoinGecko HTTP error: ${response.status}`);
        return response.json() as unknown;
      },
      60_000,
    ); // 60s
  }

  /**
   * Returns BTC-relative exchange rates for all supported currencies.
   * Result is cached for 1 hour to minimise CoinGecko API quota usage.
   *
   * @returns CoinGecko /exchange_rates response object with a `rates` map
   */
  async getExchangeRates(): Promise<any> {
    const cacheKey = `coingecko:exchange_rates`;
    return this.cache.wrap(
      cacheKey,
      async () => {
        const apiKey =
          this.configService.get<string>('COINGECKO_API_KEY') || '';
        const url = `${this.baseUrl}/exchange_rates${apiKey ? `?x_cg_demo_api_key=${apiKey}` : ''}`;
        const response = await this.fetchWithRetry(url, {
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok)
          throw new Error(`CoinGecko HTTP error: ${response.status}`);
        return response.json() as unknown;
      },
      60 * 60_000,
    ); // 1 hour
  }
}
