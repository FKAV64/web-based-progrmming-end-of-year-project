import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CoingeckoService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async getCoin(id: string): Promise<any> {
    const cacheKey = `coingecko:coin:${id}`;
    return this.cache.wrap(cacheKey, async () => {
      const response = await fetch(`https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`);
      if (!response.ok) throw new Error(`CoinGecko HTTP error: ${response.status}`);
      return response.json();
    }, 5 * 60_000); // 5 min
  }

  async getMarketChart(id: string, days: string): Promise<any> {
    const cacheKey = `coingecko:chart:${id}:${days}`;
    return this.cache.wrap(cacheKey, async () => {
      const response = await fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`);
      if (!response.ok) throw new Error(`CoinGecko HTTP error: ${response.status}`);
      return response.json();
    }, 60_000); // 60s
  }

  async getExchangeRates(): Promise<any> {
    const cacheKey = `coingecko:exchange_rates`;
    return this.cache.wrap(cacheKey, async () => {
      const response = await fetch(`https://api.coingecko.com/api/v3/exchange_rates`);
      if (!response.ok) throw new Error(`CoinGecko HTTP error: ${response.status}`);
      return response.json();
    }, 60 * 60_000); // 1 hour
  }
}
