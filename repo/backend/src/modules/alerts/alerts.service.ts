import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsEvaluatorService } from './alerts-evaluator.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly evaluator: AlertsEvaluatorService,
  ) {}

  async findAll(userId: string, includeTriggered: boolean) {
    const whereClause: Prisma.PriceAlertWhereInput = { userId };
    if (!includeTriggered) {
      whereClause.triggeredAt = null;
    }

    return this.prisma.priceAlert.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateAlertDto) {
    const alert = await this.prisma.priceAlert.create({
      data: {
        userId,
        coinId: dto.coinId,
        condition: dto.condition,
        targetPrice: dto.targetPrice,
        currency: dto.currency,
      },
    });
    this.evaluator.addToCache(alert);
    return alert;
  }

  async remove(userId: string, id: string) {
    const alert = await this.prisma.priceAlert.findFirst({
      where: { id, userId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    await this.prisma.priceAlert.delete({ where: { id } });
    this.evaluator.removeFromCache(id, alert.coinId);
  }
}
