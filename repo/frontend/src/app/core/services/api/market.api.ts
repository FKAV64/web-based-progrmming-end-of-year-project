import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable, of, timer } from 'rxjs';
import { catchError, switchMap, shareReplay, map, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ExchangeRatesResponse } from '../../models/exchange-rate.model';
import { BinanceInterval, CoinDetail, CoinSnapshot, NewsItem, OHLC, SentimentResponse } from '../../models/market.model';
import { AuthService } from '../state/auth.service';

/**
 * HTTP client service for the /market backend endpoints.
 *
 * All methods map the `{ data: T }` response wrapper to the inner type.
 * `topCoins$` is a shared, auto-polling observable that fetches the top-100
 * coins every 15 seconds and keeps the last value alive even with zero
 * subscribers (refCount: false) so the cache survives navigation events.
 *
 * `getKlines` maintains a 60-second in-memory cache to avoid re-fetching
 * identical data when the user switches chart intervals back and forth.
 *
 * @see PriceStreamService
 * @see PortfolioService
 */
@Injectable({
  providedIn: 'root'
})
export class MarketApiService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private readonly baseUrl = `${environment.apiBaseUrl}/market`;

  private klineCache = new Map<string, { data: OHLC[]; fetchedAt: number }>();

  // Polling intentionally swallows per-tick errors so a transient 401 (e.g.,
  // between logout and next login) does not poison the shareReplay buffer and
  // cascade into errored signals across every consumer. The poll is also gated
  // on auth state to avoid burning network cycles while signed out.
  // refCount:false keeps the observable alive with zero subscribers (between navigations)
  topCoins$ = timer(0, 15_000).pipe(
    switchMap(() =>
      this.auth.isAuthenticated()
        ? this.getTop().pipe(catchError(() => EMPTY))
        : EMPTY,
    ),
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
