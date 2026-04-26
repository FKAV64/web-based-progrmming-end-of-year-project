import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findOne(userId: string) {
    return this.prisma.userSettings.findUniqueOrThrow({ where: { userId } });
  }

  async update(userId: string, dto: UpdateSettingsDto, ip?: string, ua?: string) {
    const result = await this.prisma.userSettings.update({
      where: { userId },
      data: dto,
    });

    await this.auditService.log('user.settings_changed', userId, ip, ua, dto);
    return result;
  }
}
