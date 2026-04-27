import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { type Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CoingeckoService {
  private readonly logger = new Logger('CoingeckoService');
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configService: ConfigService,
  ) {}

  private async fetchWithRetry(url: string, options: any, maxRetries = 3): Promise<any> {
    let lastError: any;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        lastError = new Error(`HTTP ${response.status}`);
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`Fetch attempt ${attempt + 1}/${maxRetries} failed: ${err.message}`);
      }
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        this.logger.log(`Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw lastError;
  }

  private getHeaders(): Record<string, string> {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://www.coingecko.com/',
      'Origin': 'https://www.coingecko.com',
    };
  }

  async getCoin(id: string): Promise<any> {
    const cacheKey = `coingecko:coin:${id}`;
    return this.cache.wrap(cacheKey, async () => {
      const apiKey = this.configService.get<string>('COINGECKO_API_KEY') || '';
      const url = `${this.baseUrl}/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false${apiKey ? `&x_cg_demo_api_key=${apiKey}` : ''}`;
      const response = await this.fetchWithRetry(url, { headers: this.getHeaders(), signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`CoinGecko HTTP error: ${response.status}`);
      return response.json();
    }, 5 * 60_000); // 5 min
  }

  async getMarketChart(id: string, days: string): Promise<any> {
    const cacheKey = `coingecko:chart:${id}:${days}`;
    return this.cache.wrap(cacheKey, async () => {
      const apiKey = this.configService.get<string>('COINGECKO_API_KEY') || '';
      const url = `${this.baseUrl}/coins/${id}/market_chart?vs_currency=usd&days=${days}${apiKey ? `&x_cg_demo_api_key=${apiKey}` : ''}`;
      const response = await this.fetchWithRetry(url, { headers: this.getHeaders(), signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`CoinGecko HTTP error: ${response.status}`);
      return response.json();
    }, 60_000); // 60s
  }

  async getExchangeRates(): Promise<any> {
    const cacheKey = `coingecko:exchange_rates`;
    return this.cache.wrap(cacheKey, async () => {
      const apiKey = this.configService.get<string>('COINGECKO_API_KEY') || '';
      const url = `${this.baseUrl}/exchange_rates${apiKey ? `?x_cg_demo_api_key=${apiKey}` : ''}`;
      const response = await this.fetchWithRetry(url, { headers: this.getHeaders(), signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`CoinGecko HTTP error: ${response.status}`);
      return response.json();
    }, 60 * 60_000); // 1 hour
  }
}
