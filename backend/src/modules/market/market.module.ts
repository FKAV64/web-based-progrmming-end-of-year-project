import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';
import { MarketController } from './market.controller';
import { MarketSnapshotService } from './market-snapshot.service';
import { CoingeckoFetcherService } from './coingecko-fetcher.service';
import { CoingeckoService } from './coingecko.service';
import { BinanceRestService } from './binance-rest.service';
import { SentimentService } from './sentiment.service';
import { NewsService } from './news.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          url: configService.get<string>('REDIS_URL'),
        }),
      }),
    }),
  ],
  controllers: [MarketController],
  providers: [
    MarketSnapshotService,
    CoingeckoFetcherService,
    CoingeckoService,
    BinanceRestService,
    SentimentService,
    NewsService,
  ],
})
export class MarketModule {}
