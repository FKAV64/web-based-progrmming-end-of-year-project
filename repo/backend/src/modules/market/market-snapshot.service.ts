import {
  Injectable,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { type Cache } from 'cache-manager';

/**
 * Cache proxy that serves the latest market snapshot to API consumers.
 *
 * The snapshot is written by CoingeckoFetcherService every 15 seconds. This
 * service only reads it, keeping the HTTP handler decoupled from the polling
 * logic. If the cache is cold (e.g. the first request arrives before the first
 * fetch completes), a 503 is returned so the client can retry.
 *
 * @module MarketSnapshotService
 * @see CoingeckoFetcherService
 */
@Injectable()
export class MarketSnapshotService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  /**
   * Returns the cached top-100 market snapshot.
   *
   * @returns Array of CoinGecko coin market objects (top 100 by market cap)
   * @throws ServiceUnavailableException if the cache has not been populated yet
   */
  async getTop(): Promise<any> {
    const data = await this.cache.get('market:top');
    if (!data) {
      throw new ServiceUnavailableException(
        'Market data warming up, retry shortly.',
      );
    }
    return data;
  }
}
