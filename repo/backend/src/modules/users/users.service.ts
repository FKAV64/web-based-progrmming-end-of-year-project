import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * User profile management service.
 *
 * Handles authenticated profile retrieval, GDPR-compliant full data export,
 * and account deletion. All destructive operations are preceded by an audit
 * log entry so the event is recorded even if the user row is later removed.
 *
 * @module UsersService
 * @see AuditService
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Returns the authenticated user's profile together with their settings row.
   *
   * @param userId - The authenticated user's ID
   * @returns Profile fields (id, email, name, role, createdAt) plus the nested settings object
   */
  async findMe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { settings: true },
    });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      settings: user.settings,
    };
  }

  /**
   * Exports the full account data for GDPR "right to data portability" requests.
   *
   * Fetches the user with all related entities (settings, watchlist, portfolio
   * positions, alerts, push subscriptions, and audit logs) in a single query,
   * strips the passwordHash, and records the export event in the audit log.
   *
   * @param userId - The authenticated user's ID
   * @param ip - Client IP address for the audit log
   * @param ua - User-Agent header for the audit log
   * @returns Full user data object without the passwordHash field
   */
  async exportData(userId: string, ip: string, ua: string) {
    const data = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        settings: true,
        watchlistItems: true,
        positions: true,
        alerts: true,
        pushSubs: true,
        auditLogs: true,
      },
    });

    await this.audit.log('user.exported_data', userId, ip, ua);

    const { passwordHash: _, ...rest } = data;
    return rest;
  }

  /**
   * Permanently deletes the user's account and all associated data.
   *
   * The audit log entry is written before the delete so the event is
   * persisted even after the user row is removed (AuditLog.userId is set
   * to null by the DB cascade, not deleted).
   *
   * @param userId - The authenticated user's ID
   * @param ip - Client IP address for the audit log
   * @param ua - User-Agent header for the audit log
   */
  async deleteMe(userId: string, ip: string, ua: string) {
    // Audit log written BEFORE the delete so the userId is recorded.
    // The AuditLog.user relation uses onDelete: SetNull, so the row survives
    // the cascade with userId nulled out.
    await this.audit.log('user.deleted', userId, ip, ua);
    await this.prisma.user.delete({ where: { id: userId } });
  }
}
