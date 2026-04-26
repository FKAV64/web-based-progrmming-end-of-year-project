import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(userId: string) {
    return this.prisma.userSettings.findUniqueOrThrow({ where: { userId } });
  }

  async update(userId: string, dto: UpdateSettingsDto) {
    return this.prisma.userSettings.update({
      where: { userId },
      data: dto,
    });
  }
}
