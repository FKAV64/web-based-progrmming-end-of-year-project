import { Injectable, Logger, OnApplicationBootstrap, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { type Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CoingeckoFetcherService implements OnApplicationBootstrap {
  private readonly logger = new Logger('CoinGeckoFetcher');
  private readonly url =
    'https://pro-api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&sparkline=true&price_change_percentage=1h,24h,7d';

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

  private async fetchAndStore() {
    try {
      const apiKey = this.configService.get<string>('COINGECKO_API_KEY') || '';
      const response = await fetch(this.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.coingecko.com/',
          'Origin': 'https://www.coingecko.com',
          'x-cg-demo-api-key': apiKey,
        },
        signal: AbortSignal.timeout(10000),
      });

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
      if (error.cause) {
        this.logger.error(`Cause: ${error.cause}`);
      }
      this.logger.error(error.stack);
    }
  }
}
