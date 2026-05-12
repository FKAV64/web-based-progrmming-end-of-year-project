import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Prisma } from '@prisma/client';
import { CreatePortfolioPositionDto } from './dto/create-portfolio-position.dto';
import { UpdatePortfolioPositionDto } from './dto/update-portfolio-position.dto';
import { ClosePortfolioPositionDto } from './dto/close-portfolio-position.dto';

/**
 * Portfolio service for tracking cryptocurrency positions.
 *
 * Positions progress through three states: open → closed → deleted.
 * - Open positions have closedAt = null and track unrealised P&L.
 * - Closing a position records the exit price and timestamp.
 * - Deletion is permanent and ownership is enforced on every mutation.
 *
 * All close events are written to the audit log for compliance.
 *
 * @module PortfolioService
 * @see AuditService
 */
@Injectable()
export class PortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Returns portfolio positions for the user.
   *
   * @param userId - The authenticated user's ID
   * @param includeClosed - When true, includes closed positions in the result
   * @returns Array of PortfolioPosition ordered by createdAt descending
   */
  async findAll(userId: string, includeClosed: boolean) {
    const whereClause: Prisma.PortfolioPositionWhereInput = { userId };
    if (!includeClosed) {
      whereClause.closedAt = null;
    }

    return this.prisma.portfolioPosition.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Opens a new portfolio position.
   *
   * @param userId - The authenticated user's ID
   * @param dto - Position data (coinId, quantity, avgBuyPrice, buyCurrency, notes)
   * @returns The newly created PortfolioPosition
   */
  async create(userId: string, dto: CreatePortfolioPositionDto) {
    return this.prisma.portfolioPosition.create({
      data: {
        userId,
        coinId: dto.coinId,
        quantity: dto.quantity,
        avgBuyPrice: dto.avgBuyPrice,
        buyCurrency: dto.buyCurrency,
        notes: dto.notes,
      },
    });
  }

  /**
   * Updates an open portfolio position's quantity, average buy price, or notes.
   *
   * @param userId - The authenticated user's ID (ownership check)
   * @param id - The position ID to update
   * @param dto - Fields to change (all optional)
   * @returns The updated PortfolioPosition
   * @throws NotFoundException if the position does not exist or belongs to another user
   * @throws BadRequestException if the position has already been closed
   */
  async update(userId: string, id: string, dto: UpdatePortfolioPositionDto) {
    const position = await this.prisma.portfolioPosition.findFirst({
      where: { id, userId },
    });

    if (!position) {
      throw new NotFoundException('Portfolio position not found');
    }

    if (position.closedAt !== null) {
      throw new BadRequestException('Cannot update a closed position');
    }

    return this.prisma.portfolioPosition.update({
      where: { id },
      data: {
        quantity: dto.quantity !== undefined ? dto.quantity : undefined,
        avgBuyPrice:
          dto.avgBuyPrice !== undefined ? dto.avgBuyPrice : undefined,
        notes: dto.notes !== undefined ? dto.notes : undefined,
      },
    });
  }

  /**
   * Closes an open portfolio position by recording the exit price and timestamp.
   *
   * Marks closedAt with the current time and persists the closePrice so the
   * realised P&L can be computed later. The event is written to the audit log.
   *
   * @param userId - The authenticated user's ID (ownership check)
   * @param id - The position ID to close
   * @param dto - Close data (closePrice in the position's buyCurrency)
   * @param ip - Client IP address for the audit log
   * @param ua - User-Agent header for the audit log
   * @returns The updated (closed) PortfolioPosition
   * @throws NotFoundException if the position does not exist or belongs to another user
   * @throws BadRequestException if the position is already closed
   */
  async close(
    userId: string,
    id: string,
    dto: ClosePortfolioPositionDto,
    ip?: string,
    ua?: string,
  ) {
    const position = await this.prisma.portfolioPosition.findFirst({
      where: { id, userId },
    });

    if (!position) {
      throw new NotFoundException('Portfolio position not found');
    }

    if (position.closedAt !== null) {
      throw new BadRequestException('Cannot close an already closed position');
    }

    const closedPosition = await this.prisma.portfolioPosition.update({
      where: { id },
      data: {
        closedAt: new Date(),
        closePrice: dto.closePrice,
      },
    });

    await this.auditService.log('portfolio.position_closed', userId, ip, ua, {
      positionId: id,
      coinId: position.coinId,
      closePrice: dto.closePrice,
    });

    return closedPosition;
  }

  /**
   * Permanently deletes a portfolio position.
   *
   * @param userId - The authenticated user's ID (ownership check)
   * @param id - The position ID to delete
   * @throws NotFoundException if the position does not exist or belongs to another user
   */
  async remove(userId: string, id: string) {
    const position = await this.prisma.portfolioPosition.findFirst({
      where: { id, userId },
    });

    if (!position) {
      throw new NotFoundException('Portfolio position not found');
    }

    await this.prisma.portfolioPosition.delete({
      where: { id },
    });
  }
}
