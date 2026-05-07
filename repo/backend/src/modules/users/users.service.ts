import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

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

    const {
      passwordHash: _passwordHash,
      ...rest
    } = data;
    return rest;
  }

  async deleteMe(userId: string, ip: string, ua: string) {
    // Audit log written BEFORE the delete so the userId is recorded.
    // The AuditLog.user relation uses onDelete: SetNull, so the row survives
    // the cascade with userId nulled out.
    await this.audit.log('user.deleted', userId, ip, ua);
    await this.prisma.user.delete({ where: { id: userId } });
  }
}
