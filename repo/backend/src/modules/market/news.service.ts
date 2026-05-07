import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { type Cache } from 'cache-manager';
import Parser from 'rss-parser';

/**
 * Crypto news aggregation service.
 *
 * Fetches RSS feeds from CoinDesk and CoinTelegraph in parallel, merges the
 * items, infers a bullish/bearish/neutral sentiment label from the headline
 * text, sorts by publication date, and returns the 30 most recent articles.
 * Results are cached for 15 minutes.
 *
 * Individual feed failures are swallowed with a warning log so that a
 * single unavailable source does not prevent articles from the other source
 * from being served.
 *
 * @module NewsService
 */
@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private readonly parser = new Parser();

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  /**
   * Returns the 30 most recent crypto news articles from CoinDesk and CoinTelegraph.
   * Results are cached for 15 minutes.
   *
   * @returns Array of news items (title, link, pubDate, source, sentiment)
   */
  async get(): Promise<any[]> {
    const cacheKey = `market:news`;
    return this.cache.wrap(cacheKey, async () => {
      try {
        const [coindesk, cointelegraph] = await Promise.all([
          this.parser.parseURL('https://www.coindesk.com/arc/outboundfeeds/rss/'),
          this.parser.parseURL('https://cointelegraph.com/rss')
        ].map(p => p.catch(err => {
          this.logger.warn(`Failed to fetch RSS: ${err.message}`);
          return { items: [] };
        })));

        const items = [...coindesk.items, ...cointelegraph.items].map(item => ({
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          source: item.link?.includes('coindesk') ? 'CoinDesk' : 'CoinTelegraph',
          sentiment: this.guessSentiment(item.title + ' ' + (item.contentSnippet || ''))
        }));

        items.sort((a, b) => new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime());
        
        return items.slice(0, 30);
      } catch (error: any) {
        this.logger.error(`News fetch failed: ${error.message}`);
        return [];
      }
    }, 15 * 60_000); // 15 min
  }

  private guessSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
    const lower = text.toLowerCase();
    const bullishWords = ['surge', 'jump', 'rally', 'bull', 'soar', 'gain', 'positive', 'breakout'];
    const bearishWords = ['crash', 'drop', 'plunge', 'bear', 'fall', 'loss', 'negative', 'hack', 'scam'];
    
    let score = 0;
    for (const w of bullishWords) if (lower.includes(w)) score++;
    for (const w of bearishWords) if (lower.includes(w)) score--;
    
    if (score > 0) return 'bullish';
    if (score < 0) return 'bearish';
    return 'neutral';
  }
}
