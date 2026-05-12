import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWatchlistItemDto } from './dto/create-watchlist-item.dto';
import { Prisma } from '@prisma/client';

/**
 * Watchlist service managing the coins a user tracks.
 *
 * Each (userId, coinId) pair is unique — the Prisma unique constraint
 * maps to a conflict exception on duplicate inserts. Deletion is
 * idempotent: removing a coin that is not in the list is a silent no-op
 * (returns 204 without throwing).
 *
 * @module WatchlistService
 */
@Injectable()
export class WatchlistService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns all watchlist items for the user, newest-first.
   *
   * @param userId - The authenticated user's ID
   * @returns Array of WatchlistItem ordered by addedAt descending
   */
  async findAll(userId: string) {
    return this.prisma.watchlistItem.findMany({
      where: { userId },
      orderBy: { addedAt: 'desc' },
    });
  }

  /**
   * Adds a coin to the user's watchlist.
   *
   * @param userId - The authenticated user's ID
   * @param dto - DTO containing the coinId (CoinGecko identifier, e.g. "bitcoin")
   * @returns The newly created WatchlistItem
   * @throws ConflictException if the coin is already in the user's watchlist
   */
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

  /**
   * Removes a coin from the user's watchlist.
   *
   * Uses deleteMany scoped to the (userId, coinId) pair so the operation is
   * idempotent — calling it when the item is already gone returns 204 without
   * throwing a not-found error.
   *
   * @param userId - The authenticated user's ID
   * @param coinId - CoinGecko coin identifier to remove
   */
  async remove(userId: string, coinId: string) {
    // Delete many so it doesn't throw a generic Prisma error if not found,
    // we want to ensure it only deletes if it exists for this user.
    // Wait, the spec says "DELETE /api/watchlist/:coinId", and "ownership enforcement".
    // For watchlist, since the unique constraint is [userId, coinId], we can just delete it.
    await this.prisma.watchlistItem.deleteMany({
      where: {
        userId,
        coinId,
      },
    });

    // Make DELETE idempotent: if it's already gone, still return 204.
    // This avoids noisy 404s when the UI retries or users click quickly.
  }
}
