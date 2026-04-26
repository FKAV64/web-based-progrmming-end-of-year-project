import { Controller, Get, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MarketSnapshotService } from './market-snapshot.service';
import { CoingeckoService } from './coingecko.service';
import { BinanceRestService } from './binance-rest.service';
import { SentimentService } from './sentiment.service';
import { NewsService } from './news.service';

@Controller('market')
@UseGuards(JwtAuthGuard)
export class MarketController {
  constructor(
    private readonly marketSnapshotService: MarketSnapshotService,
    private readonly coingeckoService: CoingeckoService,
    private readonly binanceRestService: BinanceRestService,
    private readonly sentimentService: SentimentService,
    private readonly newsService: NewsService,
  ) {}

  @Get('top')
  async getTop() {
    return this.marketSnapshotService.getTop();
  }

  @Get('coin/:id')
  async getCoin(@Param('id') id: string) {
    return this.coingeckoService.getCoin(id);
  }

  @Get('ohlc/:symbol')
  async getOhlc(
    @Param('symbol') symbol: string,
    @Query('interval') interval: string,
    @Query('limit') limit?: string,
  ) {
    if (!interval) throw new BadRequestException('interval is required');
    return this.binanceRestService.getKlines(
      symbol,
      interval,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('chart/:id')
  async getChart(
    @Param('id') id: string,
    @Query('days') days?: string,
  ) {
    return this.coingeckoService.getMarketChart(id, days || '1');
  }

  @Get('exchange-rates')
  async getExchangeRates() {
    return this.coingeckoService.getExchangeRates();
  }

  @Get('sentiment')
  async getSentiment() {
    return this.sentimentService.get();
  }

  @Get('news')
  async getNews() {
    return this.newsService.get();
  }
}
