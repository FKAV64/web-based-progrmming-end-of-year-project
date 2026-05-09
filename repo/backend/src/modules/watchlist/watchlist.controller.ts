import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { type Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WatchlistService } from './watchlist.service';
import { CreateWatchlistItemDto } from './dto/create-watchlist-item.dto';

@ApiTags('Watchlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('watchlist')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  @ApiOperation({ summary: 'List all watchlist items' })
  @ApiResponse({ status: 200, description: 'Array of watchlist items' })
  async findAll(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.watchlistService.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a coin to the watchlist' })
  @ApiResponse({ status: 201, description: 'Watchlist item created' })
  async create(@Req() req: Request, @Body() dto: CreateWatchlistItemDto) {
    const userId = (req.user as { userId: string }).userId;
    return this.watchlistService.create(userId, dto);
  }

  @Delete(':coinId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a coin from the watchlist' })
  @ApiParam({ name: 'coinId', description: 'CoinGecko coin ID' })
  @ApiResponse({ status: 204, description: 'Removed' })
  async remove(@Req() req: Request, @Param('coinId') coinId: string) {
    const userId = (req.user as { userId: string }).userId;
    await this.watchlistService.remove(userId, coinId);
  }
}
