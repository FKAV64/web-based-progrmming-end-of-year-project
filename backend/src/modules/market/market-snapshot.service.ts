import { Injectable, Inject, ServiceUnavailableException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class MarketSnapshotService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async getTop(): Promise<any> {
    const data = await this.cache.get('market:top');
    if (!data) {
      throw new ServiceUnavailableException('Market data warming up, retry shortly.');
    }
    return data;
  }
}
