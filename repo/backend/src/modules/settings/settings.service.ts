import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

/**
 * User preferences service managing theme, currency, locale, and
 * notification settings stored in the UserSettings table.
 *
 * A default UserSettings row is created alongside every new user account
 * during registration. Partial updates are supported — any field omitted
 * from the DTO is left unchanged.
 *
 * @module SettingsService
 * @see AuditService
 */
@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Returns the UserSettings row for the given user.
   *
   * @param userId - The authenticated user's ID
   * @returns The user's current settings (theme, currency, locale, notifications)
   */
  async findOne(userId: string) {
    return this.prisma.userSettings.findUniqueOrThrow({ where: { userId } });
  }

  /**
   * Partially updates the user's settings and records the change in the audit log.
   *
   * @param userId - The authenticated user's ID
   * @param dto - Fields to update (theme, currency, locale, notificationsEnabled)
   * @param ip - Client IP address for the audit log
   * @param ua - User-Agent header for the audit log
   * @returns The updated UserSettings row
   */
  async update(userId: string, dto: UpdateSettingsDto, ip?: string, ua?: string) {
    const result = await this.prisma.userSettings.update({
      where: { userId },
      data: dto,
    });

    await this.auditService.log('user.settings_changed', userId, ip, ua, dto as unknown as Record<string, unknown>);
    return result;
  }
}
