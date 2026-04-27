import { Test, TestingModule } from '@nestjs/testing';
import { CoingeckoService } from './coingecko.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';


describe('CoingeckoService', () => {
  let service: CoingeckoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoingeckoService,
        { provide: CACHE_MANAGER, useValue: { wrap: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('dummy_key') } },
      ],
    }).compile();

    service = module.get<CoingeckoService>(CoingeckoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
