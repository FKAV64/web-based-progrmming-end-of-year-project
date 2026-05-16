import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createKeyv } from '@keyv/redis';
import { MarketController } from './market.controller';
import { MarketSnapshotService } from './market-snapshot.service';
import { CoingeckoFetcherService } from './coingecko-fetcher.service';
import { CoingeckoService } from './coingecko.service';
import { BinanceRestService } from './binance-rest.service';
import { BinanceProxyGateway } from './binance-proxy.gateway';
import { SentimentService } from './sentiment.service';
import { NewsService } from './news.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        stores: [createKeyv(configService.get<string>('REDIS_URL'))],
      }),
    }),
  ],
  controllers: [MarketController],
  providers: [
    MarketSnapshotService,
    CoingeckoFetcherService,
    CoingeckoService,
    BinanceRestService,
    BinanceProxyGateway,
    SentimentService,
    NewsService,
  ],
  exports: [CoingeckoService],
})
export class MarketModule {}
