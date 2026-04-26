import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { type Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WatchlistService } from './watchlist.service';
import { CreateWatchlistItemDto } from './dto/create-watchlist-item.dto';

@UseGuards(JwtAuthGuard)
@Controller('watchlist')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  async findAll(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.watchlistService.findAll(userId);
  }

  @Post()
  async create(@Req() req: Request, @Body() dto: CreateWatchlistItemDto) {
    const userId = (req.user as { userId: string }).userId;
    return this.watchlistService.create(userId, dto);
  }

  @Delete(':coinId')
  @HttpCode(204)
  async remove(@Req() req: Request, @Param('coinId') coinId: string) {
    const userId = (req.user as { userId: string }).userId;
    await this.watchlistService.remove(userId, coinId);
  }
}
