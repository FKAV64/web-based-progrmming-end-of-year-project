import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  Inject,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { type Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

/**
 * Scheduled background service that polls the CoinGecko /coins/markets endpoint
 * every 15 seconds.
 *
 * On each successful fetch the top-100 coins (by market cap) are stored in the
 * in-process cache under the key `market:top` and a snapshot.updated event is
 * emitted so AlertsEvaluatorService can evaluate pending price alerts.
 *
 * Resilience features:
 * - Exponential-backoff retry (up to 3 attempts) for transient network errors
 * - 429 rate-limit responses are silently skipped — the previous snapshot stays valid
 * - The cache is pre-warmed once on application bootstrap to avoid cold-start gaps
 *
 * @module CoingeckoFetcherService
 * @see MarketSnapshotService
 * @see AlertsEvaluatorService
 */
@Injectable()
export class CoingeckoFetcherService implements OnApplicationBootstrap {
  private readonly logger = new Logger('CoinGeckoFetcher');
  private readonly url =
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&sparkline=true&price_change_percentage=1h,24h,7d';

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Warming up Market Snapshot cache...');
    await this.fetchAndStore();
  }

  @Cron('*/15 * * * * *')
  async handleCron() {
    await this.fetchAndStore();
  }

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
        if (response.status === 429) {
          this.logger.warn(
            'Rate limit exceeded (429). Skipping snapshot update.',
          );
          return response; // Return as-is so fetchAndStore handles 429 logic
        }
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

  private async fetchAndStore() {
    try {
      const apiKey = this.configService.get<string>('COINGECKO_API_KEY') || '';
      const fetchUrl = apiKey
        ? `${this.url}&x_cg_demo_api_key=${apiKey}`
        : this.url;
      const response = await this.fetchWithRetry(fetchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          Referer: 'https://www.coingecko.com/',
          Origin: 'https://www.coingecko.com',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        if (response.status === 429) {
          // Already logged in fetchWithRetry
        } else {
          this.logger.error(
            `HTTP error: ${response.status} ${response.statusText}`,
          );
        }
        return;
      }

      const data = (await response.json()) as unknown;

      // Store in cache for 60s
      await this.cache.set('market:top', data, 60_000);

      this.logger.log(
        `snapshot updated (${Array.isArray(data) ? data.length : '?'} coins)`,
      );

      // Emit event
      this.eventEmitter.emit('snapshot.updated', data);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to fetch after retries: ${msg}`);
      if (error instanceof Error && error.cause instanceof Error) {
        this.logger.error(`Cause: ${error.cause.message}`);
      }
    }
  }
}
