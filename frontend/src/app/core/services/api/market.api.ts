import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, timer } from 'rxjs';
import { switchMap, shareReplay, map, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ExchangeRatesResponse } from '../../models/exchange-rate.model';
import { BinanceInterval, CoinDetail, CoinSnapshot, NewsItem, OHLC, SentimentResponse } from '../../models/market.model';

@Injectable({
  providedIn: 'root'
})
export class MarketApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/market`;

  private klineCache = new Map<string, { data: OHLC[]; fetchedAt: number }>();

  // refCount:false keeps the observable alive with zero subscribers (between navigations)
  topCoins$ = timer(0, 15_000).pipe(
    switchMap(() => this.getTop()),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  getTop(): Observable<CoinSnapshot[]> {
    return this.http.get<{ data: CoinSnapshot[] }>(`${this.baseUrl}/top`)
      .pipe(map(r => r.data));
  }

  getCoin(id: string): Observable<CoinDetail> {
    return this.http.get<{ data: CoinDetail }>(`${this.baseUrl}/coin/${encodeURIComponent(id)}`)
      .pipe(map(r => r.data));
  }

  getKlines(symbol: string, interval: BinanceInterval, limit?: number): Observable<OHLC[]> {
    const key = `${symbol}|${interval}|${limit}`;
    const cached = this.klineCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < 60_000) {
      return of(cached.data);
    }
    let url = `${this.baseUrl}/ohlc/${encodeURIComponent(symbol)}?interval=${encodeURIComponent(interval)}`;
    if (limit) {
      url += `&limit=${limit}`;
    }
    return this.http.get<{ data: OHLC[] }>(url)
      .pipe(
        map(r => r.data),
        tap(data => this.klineCache.set(key, { data, fetchedAt: Date.now() }))
      );
  }

  getChart(id: string, days?: string): Observable<any> {
    let url = `${this.baseUrl}/chart/${id}`;
    if (days) {
      url += `?days=${days}`;
    }
    return this.http.get<{ data: any }>(url)
      .pipe(map(r => r.data));
  }

  getExchangeRates(): Observable<ExchangeRatesResponse> {
    return this.http.get<{ data: ExchangeRatesResponse }>(`${this.baseUrl}/exchange-rates`)
      .pipe(map(r => r.data));
  }

  getSentiment(): Observable<SentimentResponse> {
    return this.http.get<{ data: SentimentResponse }>(`${this.baseUrl}/sentiment`)
      .pipe(map(r => r.data));
  }

  getNews(): Observable<NewsItem[]> {
    return this.http.get<{ data: NewsItem[] }>(`${this.baseUrl}/news`)
      .pipe(map(r => r.data));
  }
}
