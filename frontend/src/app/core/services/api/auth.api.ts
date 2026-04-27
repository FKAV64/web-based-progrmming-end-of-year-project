import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AuthResponse, LoginDto, RegisterDto } from '../../models/auth.model';
import { User } from '../../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  register(dto: RegisterDto): Observable<AuthResponse> {
    return this.http
      .post<{ data: AuthResponse }>(`${this.base}/auth/register`, dto, { withCredentials: true })
      .pipe(map(r => r.data));
  }

  login(dto: LoginDto): Observable<AuthResponse> {
    return this.http
      .post<{ data: AuthResponse }>(`${this.base}/auth/login`, dto, { withCredentials: true })
      .pipe(map(r => r.data));
  }

  refresh(): Observable<{ accessToken: string }> {
    return this.http
      .post<{ data: { accessToken: string } }>(`${this.base}/auth/refresh`, {}, { withCredentials: true })
      .pipe(map(r => r.data));
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.base}/auth/logout`, {}, { withCredentials: true });
  }

  me(): Observable<User> {
    return this.http
      .get<{ data: User }>(`${this.base}/me`)
      .pipe(map(r => r.data));
  }
}
