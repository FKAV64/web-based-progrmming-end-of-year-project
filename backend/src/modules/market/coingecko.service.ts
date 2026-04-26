import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { type Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CoingeckoService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configService: ConfigService,
  ) {}

  async getCoin(id: string): Promise<any> {
    const cacheKey = `coingecko:coin:${id}`;
    return this.cache.wrap(cacheKey, async () => {
      const apiKey = this.configService.get<string>('COINGECKO_API_KEY') || '';
      const response = await fetch(`https://pro-api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`, {
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
      if (!response.ok) throw new Error(`CoinGecko HTTP error: ${response.status}`);
      return response.json();
    }, 5 * 60_000); // 5 min
  }

  async getMarketChart(id: string, days: string): Promise<any> {
    const cacheKey = `coingecko:chart:${id}:${days}`;
    return this.cache.wrap(cacheKey, async () => {
      const apiKey = this.configService.get<string>('COINGECKO_API_KEY') || '';
      const response = await fetch(`https://pro-api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`, {
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
      if (!response.ok) throw new Error(`CoinGecko HTTP error: ${response.status}`);
      return response.json();
    }, 60_000); // 60s
  }

  async getExchangeRates(): Promise<any> {
    const cacheKey = `coingecko:exchange_rates`;
    return this.cache.wrap(cacheKey, async () => {
      const apiKey = this.configService.get<string>('COINGECKO_API_KEY') || '';
      const response = await fetch(`https://pro-api.coingecko.com/api/v3/exchange_rates`, {
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
      if (!response.ok) throw new Error(`CoinGecko HTTP error: ${response.status}`);
      return response.json();
    }, 60 * 60_000); // 1 hour
  }
}
