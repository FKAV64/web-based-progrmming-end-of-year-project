import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class BinanceRestService {
  private readonly allowedIntervals = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'];

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
