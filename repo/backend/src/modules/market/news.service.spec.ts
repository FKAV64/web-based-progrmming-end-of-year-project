import { Test, TestingModule } from '@nestjs/testing';
import { NewsService } from './news.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

jest.mock('rss-parser', () => {
  return jest.fn().mockImplementation(() => {
    return {
      parseURL: jest.fn().mockImplementation((url: string) => {
        if (url.includes('coindesk')) {
          return Promise.resolve({
            items: [{ title: 'Bitcoin surges!', link: 'https://coindesk', pubDate: '2026-04-26T10:00:00Z', contentSnippet: 'Bitcoin gains' }]
          });
        }
        return Promise.resolve({
          items: [{ title: 'Crypto crash', link: 'https://cointelegraph', pubDate: '2026-04-26T09:00:00Z', contentSnippet: 'Market plunges' }]
        });
      }),
    };
  });
});

describe('NewsService', () => {
  let service: NewsService;
  let cacheWrapMock: jest.Mock;

  beforeEach(async () => {
    cacheWrapMock = jest.fn().mockImplementation((key, fn) => fn());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsService,
        { provide: CACHE_MANAGER, useValue: { wrap: cacheWrapMock } }
      ],
    }).compile();

    service = module.get<NewsService>(NewsService);
  });

  it('should fetch, merge, and sort RSS feeds', async () => {
    const result = await service.get();
    expect(result.length).toBe(2);
    expect(result[0].title).toBe('Bitcoin surges!');
    expect(result[0].sentiment).toBe('bullish');
    expect(result[1].title).toBe('Crypto crash');
    expect(result[1].sentiment).toBe('bearish');
  });
});
