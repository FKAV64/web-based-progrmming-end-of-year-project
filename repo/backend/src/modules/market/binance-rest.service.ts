import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * Binance REST API client for OHLCV candlestick (kline) data.
 *
 * Fetches historical price data from the public Binance klines endpoint and
 * maps the raw array format to a typed OHLC object. Only a pre-approved set
 * of intervals is accepted to prevent abuse of the upstream API.
 *
 * @module BinanceRestService
 */
@Injectable()
export class BinanceRestService {
  private readonly allowedIntervals = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'];

  /**
   * Fetches OHLCV candlestick data for a trading pair from Binance.
   *
   * @param symbol - Binance trading pair symbol (e.g. "BTCUSDT")
   * @param interval - Candlestick interval; must be one of the allowed values
   * @param limit - Number of candles to return (1–1000, default 200)
   * @returns Array of OHLC objects with time (ms), open, high, low, close fields
   * @throws BadRequestException if the interval is not in the allowed list
   * @throws BadRequestException if the limit is outside the 1–1000 range
   * @throws BadRequestException if the Binance API returns a non-OK response
   */
  async getKlines(symbol: string, interval: string, limit: number = 200): Promise<any[]> {
    if (!this.allowedIntervals.includes(interval)) {
      throw new BadRequestException(`Invalid interval. Allowed: ${this.allowedIntervals.join(', ')}`);
    }

    if (limit < 1 || limit > 1000) {
      throw new BadRequestException('Limit must be between 1 and 1000');
    }

    const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`);
    
    if (!response.ok) {
      throw new BadRequestException(`Binance API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Map from Binance array to OHLC format
    return data.map((kline: any) => ({
      time: kline[0],
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
    }));
  }
}
