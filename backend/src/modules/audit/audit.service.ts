import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

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
