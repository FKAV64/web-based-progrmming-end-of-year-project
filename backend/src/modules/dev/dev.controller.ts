import { Controller, ForbiddenException, Logger, Post } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as path from 'path';
import * as fs from 'fs';

@Controller('dev')
export class DevController {
  private readonly logger = new Logger('DevController');

  constructor(private readonly eventEmitter: EventEmitter2) {}

  @Post('trigger-snapshot')
  async triggerSnapshot() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('This endpoint is not available in production');
    }

    const fixturePath = path.join(__dirname, '..', '..', '..', 'test', 'fixtures', 'top-5-coins.json');
    const raw = fs.readFileSync(fixturePath, 'utf-8');
    const data = JSON.parse(raw);

    this.logger.log(`Emitting snapshot.updated with ${data.length} coins from fixture`);
    this.eventEmitter.emit('snapshot.updated', data);

    return { message: 'Snapshot event emitted', coins: data.length };
  }
}
