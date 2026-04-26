import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWatchlistItemDto } from './dto/create-watchlist-item.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class WatchlistService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.watchlistItem.findMany({
      where: { userId },
      orderBy: { addedAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateWatchlistItemDto) {
    try {
      return await this.prisma.watchlistItem.create({
        data: {
          userId,
          coinId: dto.coinId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Coin is already in the watchlist');
        }
      }
      throw error;
    }
  }

  async remove(userId: string, coinId: string) {
    // Delete many so it doesn't throw a generic Prisma error if not found, 
    // we want to ensure it only deletes if it exists for this user.
    // Wait, the spec says "DELETE /api/watchlist/:coinId", and "ownership enforcement".
    // For watchlist, since the unique constraint is [userId, coinId], we can just delete it.
    const result = await this.prisma.watchlistItem.deleteMany({
      where: {
        userId,
        coinId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Watchlist item not found');
    }
  }
}
