import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MarketSnapshotService } from './market-snapshot.service';
import { CoingeckoService } from './coingecko.service';
import { BinanceRestService } from './binance-rest.service';
import { SentimentService } from './sentiment.service';
import { NewsService } from './news.service';

@ApiTags('Market')
@ApiBearerAuth()
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
  @ApiOperation({ summary: 'Get top cryptocurrencies by market cap' })
  @ApiResponse({ status: 200, description: 'Array of top coin snapshots' })
  async getTop(): Promise<unknown> {
    return this.marketSnapshotService.getTop();
  }

  @Get('coin/:id')
  @ApiOperation({ summary: 'Get detailed info for a single coin' })
  @ApiParam({ name: 'id', description: 'CoinGecko coin ID (e.g. bitcoin)' })
  @ApiResponse({ status: 200, description: 'Coin detail object' })
  async getCoin(@Param('id') id: string): Promise<unknown> {
    return this.coingeckoService.getCoin(id);
  }

  @Get('ohlc/:symbol')
  @ApiOperation({ summary: 'Get OHLC candlestick data from Binance' })
  @ApiParam({ name: 'symbol', description: 'Binance symbol (e.g. BTCUSDT)' })
  @ApiQuery({
    name: 'interval',
    required: true,
    description: 'Kline interval (1m, 1h, 1d…)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of candles (max 1000)',
  })
  @ApiResponse({ status: 200, description: 'Array of OHLC candles' })
  async getOhlc(
    @Param('symbol') symbol: string,
    @Query('interval') interval: string,
    @Query('limit') limit?: string,
  ): Promise<unknown> {
    if (!interval) throw new BadRequestException('interval is required');
    return this.binanceRestService.getKlines(
      symbol,
      interval,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('chart/:id')
  @ApiOperation({ summary: 'Get market chart data for a coin' })
  @ApiParam({ name: 'id', description: 'CoinGecko coin ID' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days (default: 1)',
  })
  @ApiResponse({ status: 200, description: 'Market chart data' })
  async getChart(
    @Param('id') id: string,
    @Query('days') days?: string,
  ): Promise<unknown> {
    return this.coingeckoService.getMarketChart(id, days || '1');
  }

  @Get('exchange-rates')
  @ApiOperation({ summary: 'Get fiat/crypto exchange rates' })
  @ApiResponse({ status: 200, description: 'Exchange rate map' })
  async getExchangeRates(): Promise<unknown> {
    return this.coingeckoService.getExchangeRates();
  }

  @Get('sentiment')
  @ApiOperation({ summary: 'Get Fear & Greed index' })
  @ApiResponse({ status: 200, description: 'Sentiment data' })
  async getSentiment(): Promise<unknown> {
    return this.sentimentService.get();
  }

  @Get('news')
  @ApiOperation({ summary: 'Get latest crypto news headlines' })
  @ApiResponse({ status: 200, description: 'Array of news items' })
  async getNews(): Promise<unknown> {
    return this.newsService.get();
  }
}
