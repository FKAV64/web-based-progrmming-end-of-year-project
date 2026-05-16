import {
  Controller,
  ForbiddenException,
  Inject,
  Logger,
  Post,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { type Cache } from 'cache-manager';
import * as path from 'path';
import * as fs from 'fs';

@Controller('dev')
export class DevController {
  private readonly logger = new Logger('DevController');

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  @Post('trigger-snapshot')
  triggerSnapshot() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        'This endpoint is not available in production',
      );
    }

    const fixturePath = path.join(
      process.cwd(),
      'test',
      'fixtures',
      'top-20-coins.json',
    );
    const raw = fs.readFileSync(fixturePath, 'utf-8');
    const data = JSON.parse(raw) as unknown[];

    this.logger.log(
      `Emitting snapshot.updated with ${data.length} coins from fixture`,
    );
    this.eventEmitter.emit('snapshot.updated', data);

    return { message: 'Snapshot event emitted', coins: data.length };
  }

  @Post('seed-market-data')
  async seedMarketData() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        'This endpoint is not available in production',
      );
    }

    const fixturePath = path.join(
      process.cwd(),
      'test',
      'fixtures',
      'top-20-coins.json',
    );
    const raw = fs.readFileSync(fixturePath, 'utf-8');
    const data = JSON.parse(raw) as unknown[];

    // Write to Redis with 1-hour TTL so it survives server restarts
    await this.cache.set('market:top', data, 3_600_000);

    this.logger.log(`Seeded market:top with ${data.length} coins (TTL 1h)`);

    // Also emit snapshot.updated so the alert evaluator fires
    this.eventEmitter.emit('snapshot.updated', data);

    return { seeded: true, coins: data.length };
  }
}
