import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePortfolioPositionDto } from './dto/create-portfolio-position.dto';
import { UpdatePortfolioPositionDto } from './dto/update-portfolio-position.dto';
import { ClosePortfolioPositionDto } from './dto/close-portfolio-position.dto';

@Injectable()
export class PortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(userId: string, includeClosed: boolean) {
    const whereClause: any = { userId };
    if (!includeClosed) {
      whereClause.closedAt = null;
    }

    return this.prisma.portfolioPosition.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });
  }

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
        avgBuyPrice: dto.avgBuyPrice !== undefined ? dto.avgBuyPrice : undefined,
        notes: dto.notes !== undefined ? dto.notes : undefined,
      },
    });
  }

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

    await this.auditService.log(
      'portfolio.position_closed',
      userId,
      ip,
      ua,
      { positionId: id, coinId: position.coinId, closePrice: dto.closePrice }
    );

    return closedPosition;
  }

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
