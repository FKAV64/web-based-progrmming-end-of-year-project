import { Test, TestingModule } from '@nestjs/testing';
import { MarketController } from './market.controller';
import { MarketSnapshotService } from './market-snapshot.service';
import { CoingeckoService } from './coingecko.service';
import { BinanceRestService } from './binance-rest.service';
import { SentimentService } from './sentiment.service';
import { NewsService } from './news.service';

describe('MarketController', () => {
  let controller: MarketController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketController],
      providers: [
        { provide: MarketSnapshotService, useValue: {} },
        { provide: CoingeckoService, useValue: {} },
        { provide: BinanceRestService, useValue: {} },
        { provide: SentimentService, useValue: {} },
        { provide: NewsService, useValue: {} },
      ],
    }).compile();

    controller = module.get<MarketController>(MarketController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
