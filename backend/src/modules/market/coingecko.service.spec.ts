import { Test, TestingModule } from '@nestjs/testing';
import { CoingeckoService } from './coingecko.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('CoingeckoService', () => {
  let service: CoingeckoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoingeckoService,
        { provide: CACHE_MANAGER, useValue: { wrap: jest.fn() } },
      ],
    }).compile();

    service = module.get<CoingeckoService>(CoingeckoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
