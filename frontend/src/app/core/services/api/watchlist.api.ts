import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreateWatchlistItemDto, WatchlistItem } from '../../models/watchlist.model';

@Injectable({ providedIn: 'root' })
export class WatchlistApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/watchlist`;

  list(): Observable<WatchlistItem[]> {
    return this.http
      .get<{ data: WatchlistItem[] }>(this.baseUrl)
      .pipe(map(response => response.data));
  }

  add(dto: CreateWatchlistItemDto): Observable<WatchlistItem> {
    return this.http
      .post<{ data: WatchlistItem }>(this.baseUrl, dto)
      .pipe(map(response => response.data));
  }

  remove(coinId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(coinId)}`);
  }
}
