import { Injectable, Logger, OnApplicationBootstrap, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CoingeckoFetcherService implements OnApplicationBootstrap {
  private readonly logger = new Logger('CoinGeckoFetcher');
  private readonly url =
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&sparkline=true&price_change_percentage=1h,24h,7d';

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Warming up Market Snapshot cache...');
    await this.fetchAndStore();
  }

  @Cron('*/15 * * * * *')
  async handleCron() {
    await this.fetchAndStore();
  }

  private async fetchAndStore() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(this.url, {
        signal: controller.signal as any,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          this.logger.warn('rate limit exceeded (429). Skipping snapshot update.');
        } else {
          this.logger.error(`HTTP error: ${response.status} ${response.statusText}`);
        }
        return;
      }

      const data = await response.json();
      
      // Store in cache for 60s
      await this.cache.set('market:top', data, 60_000);
      
      this.logger.log(`snapshot updated (${data.length} coins)`);
      
      // Emit event
      this.eventEmitter.emit('snapshot.updated', data);
    } catch (error: any) {
      this.logger.error(`Failed to fetch: ${error.message}`);
    }
  }
}
