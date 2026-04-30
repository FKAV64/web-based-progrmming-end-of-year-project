import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer } from 'rxjs';
import { switchMap, shareReplay, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ExchangeRatesResponse } from '../../models/exchange-rate.model';
import { BinanceInterval, CoinDetail, CoinSnapshot, NewsItem, OHLC, SentimentResponse } from '../../models/market.model';

@Injectable({
  providedIn: 'root'
})
export class MarketApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/market`;

  // The Top-100 stream, aligned with backend snapshot cadence
  topCoins$ = timer(0, 15_000).pipe(
    switchMap(() => this.getTop()),
    shareReplay(1)
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
    let url = `${this.baseUrl}/ohlc/${encodeURIComponent(symbol)}?interval=${encodeURIComponent(interval)}`;
    if (limit) {
      url += `&limit=${limit}`;
    }
    return this.http.get<{ data: OHLC[] }>(url)
      .pipe(map(r => r.data));
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
