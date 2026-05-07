import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Immutable audit log service.
 *
 * Writes a structured record to the AuditLog table for every security-relevant
 * or compliance-relevant event (authentication, data export, account deletion,
 * alert triggers, etc.). Rows are never updated or deleted — they are
 * append-only by design.
 *
 * userId is nullable so that events such as failed login attempts (where the
 * user may not exist) and post-deletion events can still be recorded.
 *
 * @module AuditService
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Appends a single audit log entry.
   *
   * @param action - Dot-separated event name (e.g. "auth.login_success", "alert.triggered")
   * @param userId - The acting user's ID; undefined for events with no authenticated user
   * @param ip - Client IP address; undefined if not available in the request context
   * @param ua - User-Agent header; undefined if not available in the request context
   * @param meta - Optional structured metadata specific to the event type
   */
  async log(
    action: string,
    userId?: string,
    ip?: string,
    ua?: string,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action,
        userId: userId ?? null,
        ip: ip ?? null,
        userAgent: ua ?? null,
        meta: meta ? (meta as object) : undefined,
      },
    });
  }
}
