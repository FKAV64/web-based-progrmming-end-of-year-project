import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { type Cache } from 'cache-manager';

/**
 * Crypto Fear & Greed Index service.
 *
 * Fetches the last 30 days of sentiment data from the Alternative.me public
 * API and caches the result for 1 hour. The index ranges from 0 (extreme fear)
 * to 100 (extreme greed) and is used by the dashboard's Fear & Greed gauge.
 *
 * @module SentimentService
 */
@Injectable()
export class SentimentService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  /**
   * Returns the last 30 days of the Crypto Fear & Greed Index.
   * Result is cached for 1 hour.
   *
   * @returns Alternative.me API response with a `data` array of daily entries
   */
  async get(): Promise<any> {
    const cacheKey = `market:sentiment`;
    return this.cache.wrap(
      cacheKey,
      async () => {
        const response = await fetch(
          `https://api.alternative.me/fng/?limit=30`,
        );
        if (!response.ok)
          throw new Error(`Alternative.me HTTP error: ${response.status}`);
        return response.json() as unknown;
      },
      60 * 60_000,
    ); // 1 hour
  }
}
