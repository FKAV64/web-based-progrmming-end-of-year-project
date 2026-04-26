import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import * as webpush from 'web-push';

@Injectable()
export class PushService {
  private readonly logger = new Logger('PushService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.configService.get<string>('VAPID_SUBJECT');

    if (publicKey && privateKey && subject) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
    } else {
      this.logger.warn('VAPID keys not configured — push notifications disabled');
    }
  }

  async subscribe(userId: string, dto: SubscribePushDto, userAgent?: string) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      update: {
        userId,
        p256dhKey: dto.keys.p256dh,
        authKey: dto.keys.auth,
        userAgent: userAgent ?? null,
      },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dhKey: dto.keys.p256dh,
        authKey: dto.keys.auth,
        userAgent: userAgent ?? null,
      },
    });
  }

  async unsubscribe(userId: string, endpoint: string) {
    const sub = await this.prisma.pushSubscription.findFirst({
      where: { endpoint, userId },
    });

    if (!sub) {
      throw new NotFoundException('Push subscription not found');
    }

    await this.prisma.pushSubscription.delete({
      where: { id: sub.id },
    });
  }

  async send(userId: string, payload: { title: string; body: string; url?: string }) {
    const subs = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subs.length === 0) {
      this.logger.debug(`No push subscriptions for user ${userId}`);
      return;
    }

    const payloadStr = JSON.stringify(payload);

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dhKey,
              auth: sub.authKey,
            },
          },
          payloadStr,
        );
      } catch (error: any) {
        const statusCode = error?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          this.logger.warn(`Subscription ${sub.endpoint} is stale (${statusCode}). Deleting.`);
          await this.prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          this.logger.error(`Push failed for ${sub.endpoint}: ${error.message}`);
        }
      }
    }
  }
}
