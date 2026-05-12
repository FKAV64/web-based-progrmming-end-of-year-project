import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreateAlertDto, PriceAlert } from '../../models/alerts.model';

@Injectable({ providedIn: 'root' })
export class AlertsApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/alerts`;

  list(includeTriggered = false): Observable<PriceAlert[]> {
    const url = includeTriggered ? `${this.baseUrl}?includeTriggered=true` : this.baseUrl;
    return this.http
      .get<{ data: PriceAlert[] }>(url)
      .pipe(map(response => response.data));
  }

  add(dto: CreateAlertDto): Observable<PriceAlert> {
    return this.http
      .post<{ data: PriceAlert }>(this.baseUrl, dto)
      .pipe(map(response => response.data));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }
}
