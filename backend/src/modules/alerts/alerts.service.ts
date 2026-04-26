import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, includeTriggered: boolean) {
    const whereClause: any = { userId };
    if (!includeTriggered) {
      whereClause.triggeredAt = null;
    }

    return this.prisma.priceAlert.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateAlertDto) {
    return this.prisma.priceAlert.create({
      data: {
        userId,
        coinId: dto.coinId,
        condition: dto.condition,
        targetPrice: dto.targetPrice,
        currency: dto.currency,
      },
    });
  }

  async remove(userId: string, id: string) {
    const alert = await this.prisma.priceAlert.findFirst({
      where: { id, userId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    await this.prisma.priceAlert.delete({
      where: { id },
    });
  }
}
