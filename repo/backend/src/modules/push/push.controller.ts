import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { type Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PushService } from './push.service';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import { UnsubscribePushDto } from './dto/unsubscribe-push.dto';

@ApiTags('Push')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('push')
export class PushController {
  constructor(
    private readonly pushService: PushService,
    private readonly configService: ConfigService,
  ) {}

  @Get('vapid-public-key')
  @ApiOperation({ summary: 'Get VAPID public key for push subscription' })
  @ApiResponse({ status: 200, description: 'VAPID public key' })
  getVapidPublicKey() {
    return { publicKey: this.configService.get<string>('VAPID_PUBLIC_KEY') };
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Register a push subscription' })
  @ApiResponse({ status: 201, description: 'Subscription saved' })
  async subscribe(@Req() req: Request, @Body() dto: SubscribePushDto) {
    const userId = (req.user as { userId: string }).userId;
    const userAgent = req.headers['user-agent'];
    return this.pushService.subscribe(userId, dto, userAgent);
  }

  @Delete('subscribe')
  @ApiOperation({ summary: 'Remove a push subscription' })
  @ApiResponse({ status: 200, description: 'Subscription removed' })
  async unsubscribe(@Req() req: Request, @Body() dto: UnsubscribePushDto) {
    const userId = (req.user as { userId: string }).userId;
    await this.pushService.unsubscribe(userId, dto.endpoint);
  }
}
