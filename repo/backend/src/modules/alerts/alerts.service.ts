import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';

/**
 * Price alert CRUD service.
 *
 * Manages the lifecycle of PriceAlert records. Each alert monitors one
 * (coinId, condition, targetPrice, currency) tuple. When AlertsEvaluatorService
 * fires a snapshot.updated event, it reads all untriggered alerts and marks
 * matching ones; once triggered, alerts are no longer evaluated.
 *
 * @module AlertsService
 * @see AlertsEvaluatorService
 */
@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns price alerts for the user.
   *
   * @param userId - The authenticated user's ID
   * @param includeTriggered - When true, includes already-triggered alerts
   * @returns Array of PriceAlert ordered by createdAt descending
   */
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

  /**
   * Creates a new price alert for the user.
   *
   * @param userId - The authenticated user's ID
   * @param dto - Alert definition (coinId, condition ABOVE|BELOW, targetPrice, currency)
   * @returns The newly created PriceAlert
   */
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

  /**
   * Deletes a price alert owned by the user.
   *
   * @param userId - The authenticated user's ID (ownership check)
   * @param id - The alert ID to delete
   * @throws NotFoundException if the alert does not exist or belongs to another user
   */
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
