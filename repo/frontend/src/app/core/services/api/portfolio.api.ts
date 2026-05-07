import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ClosePortfolioPositionDto,
  CreatePortfolioPositionDto,
  PortfolioPosition,
  UpdatePortfolioPositionDto,
} from '../../models/portfolio.model';

@Injectable({ providedIn: 'root' })
export class PortfolioApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/portfolio`;

  list(includeClosed = false): Observable<PortfolioPosition[]> {
    const url = includeClosed ? `${this.baseUrl}?includeClosed=true` : this.baseUrl;
    return this.http
      .get<{ data: PortfolioPosition[] }>(url)
      .pipe(map(response => response.data));
  }

  add(dto: CreatePortfolioPositionDto): Observable<PortfolioPosition> {
    return this.http
      .post<{ data: PortfolioPosition }>(this.baseUrl, dto)
      .pipe(map(response => response.data));
  }

  update(id: string, dto: UpdatePortfolioPositionDto): Observable<PortfolioPosition> {
    return this.http
      .patch<{ data: PortfolioPosition }>(`${this.baseUrl}/${encodeURIComponent(id)}`, dto)
      .pipe(map(response => response.data));
  }

  close(id: string, dto: ClosePortfolioPositionDto): Observable<PortfolioPosition> {
    return this.http
      .post<{ data: PortfolioPosition }>(`${this.baseUrl}/${encodeURIComponent(id)}/close`, dto)
      .pipe(map(response => response.data));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }
}
