import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { type Cache } from 'cache-manager';

@Injectable()
export class SentimentService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async get(): Promise<any> {
    const cacheKey = `market:sentiment`;
    return this.cache.wrap(cacheKey, async () => {
      const response = await fetch(`https://api.alternative.me/fng/?limit=30`);
      if (!response.ok) throw new Error(`Alternative.me HTTP error: ${response.status}`);
      return response.json();
    }, 60 * 60_000); // 1 hour
  }
}
