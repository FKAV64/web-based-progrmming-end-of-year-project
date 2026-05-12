import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import * as webpush from 'web-push';

/**
 * Web Push notification service using the VAPID protocol.
 *
 * Stores push subscriptions (endpoint + encryption keys) and fans out
 * notifications to all active subscriptions for a given user. Stale
 * subscriptions (HTTP 410 / 404 from the push gateway) are deleted
 * automatically to avoid wasted fanout on future sends.
 *
 * VAPID keys are read from env vars (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
 * VAPID_SUBJECT). If they are absent the service starts in degraded mode
 * and logs a warning — no exceptions are thrown during bootstrap.
 *
 * @module PushService
 */
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
      this.logger.warn(
        'VAPID keys not configured — push notifications disabled',
      );
    }
  }

  /**
   * Registers or refreshes a push subscription for the user.
   *
   * Uses an upsert on the endpoint so re-subscribing with a renewed
   * subscription object from the browser updates the keys without creating
   * a duplicate row.
   *
   * @param userId - The authenticated user's ID
   * @param dto - Push subscription data (endpoint, p256dh key, auth key)
   * @param userAgent - Optional User-Agent header for device identification
   * @returns The created or updated PushSubscription record
   */
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

  /**
   * Removes the push subscription identified by its endpoint URL.
   *
   * Ownership is enforced: the subscription must belong to the requesting user.
   *
   * @param userId - The authenticated user's ID
   * @param endpoint - The push endpoint URL to unsubscribe
   * @throws NotFoundException if no matching subscription is found for this user
   */
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

  /**
   * Delivers a push notification to all active subscriptions for the user.
   *
   * Iterates every stored subscription and calls the Web Push gateway. On a
   * 410 or 404 response the subscription is automatically deleted. Other
   * errors are logged but do not abort delivery to remaining subscriptions.
   *
   * @param userId - The user whose subscriptions will receive the notification
   * @param payload - Notification content (title, body, optional deep-link url)
   */
  async send(
    userId: string,
    payload: { title: string; body: string; url?: string },
  ) {
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
      } catch (error: unknown) {
        const statusCode =
          error !== null && typeof error === 'object' && 'statusCode' in error
            ? (error as { statusCode: number }).statusCode
            : undefined;
        if (statusCode === 410 || statusCode === 404) {
          this.logger.warn(
            `Subscription ${sub.endpoint} is stale (${statusCode}). Deleting.`,
          );
          await this.prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          const msg = error instanceof Error ? error.message : String(error);
          this.logger.error(`Push failed for ${sub.endpoint}: ${msg}`);
        }
      }
    }
  }
}
