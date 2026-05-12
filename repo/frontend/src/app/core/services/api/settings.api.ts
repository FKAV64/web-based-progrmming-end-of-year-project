import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { UserSettings } from '../../models/user.model';

export interface UpdateSettingsDto {
  theme?: UserSettings['theme'];
  currency?: UserSettings['currency'];
  locale?: UserSettings['locale'];
  notificationsEnabled?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SettingsApiService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  get(): Observable<UserSettings> {
    return this.http
      .get<{ data: UserSettings }>(`${this.base}/settings`)
      .pipe(map(r => r.data));
  }

  update(dto: UpdateSettingsDto): Observable<UserSettings> {
    return this.http
      .patch<{ data: UserSettings }>(`${this.base}/settings`, dto)
      .pipe(map(r => r.data));
  }
}
