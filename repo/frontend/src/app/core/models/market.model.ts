export interface CoinSnapshot {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation?: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply?: number;
  max_supply?: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  roi?: { times: number; currency: string; percentage: number } | null;
  last_updated: string;
  sparkline_in_7d?: { price: number[] };
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_24h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
}

export interface OHLC {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export type BinanceInterval = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M';

export type ChartType = 'candle' | 'line' | 'area';

export interface TimeframeOption {
  label: string;
  interval: BinanceInterval;
  limit: number;
}

export interface CoinDetailMarketData {
  current_price?: Record<string, number>;
  market_cap?: Record<string, number>;
  market_cap_rank?: number;
  total_volume?: Record<string, number>;
  high_24h?: Record<string, number>;
  low_24h?: Record<string, number>;
  price_change_24h?: number;
  price_change_percentage_24h?: number;
  ath?: Record<string, number>;
  ath_date?: Record<string, string>;
  atl?: Record<string, number>;
  atl_date?: Record<string, string>;
  circulating_supply?: number;
  total_supply?: number;
  max_supply?: number;
}

export interface CoinDetail {
  id: string;
  symbol: string;
  name: string;
  image?: {
    thumb?: string;
    small?: string;
    large?: string;
  };
  market_cap_rank?: number;
  market_data?: CoinDetailMarketData;
}

export type NewsSentiment = 'bullish' | 'bearish' | 'neutral';

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  sentiment: NewsSentiment;
}

export interface SentimentDataPoint {
  value: string;
  classification: string;
  timestamp: string;
}

export interface SentimentResponse {
  name: string;
  data: SentimentDataPoint[];
  metadata: { error: string | null };
}
