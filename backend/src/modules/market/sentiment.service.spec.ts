import { Test, TestingModule } from '@nestjs/testing';
import { SentimentService } from './sentiment.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('SentimentService', () => {
  let service: SentimentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentimentService,
        { provide: CACHE_MANAGER, useValue: { wrap: jest.fn() } },
      ],
    }).compile();

    service = module.get<SentimentService>(SentimentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
