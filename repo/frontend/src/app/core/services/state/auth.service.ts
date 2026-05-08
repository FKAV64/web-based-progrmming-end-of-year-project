import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApiService } from '../api/auth.api';
import { LoginDto, RegisterDto } from '../../models/auth.model';
import { User } from '../../models/user.model';

/**
 * Client-side authentication state service.
 *
 * Maintains the currently authenticated user and access token as Angular
 * signals so any component can reactively subscribe. On bootstrap, `init()`
 * silently attempts a token refresh from the HTTP-only cookie; if it fails the
 * signals remain null and the app continues in the unauthenticated state.
 *
 * Token storage: the access token is held in memory only (never localStorage)
 * to reduce XSS exposure. The refresh token lives in an HTTP-only cookie
 * managed by the backend.
 *
 * @see AuthApiService
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(AuthApiService);
  private router = inject(Router);

  readonly currentUser = signal<User | null>(null);
  readonly accessToken = signal<string | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());

  async init(): Promise<void> {
    try {
      const { accessToken } = await firstValueFrom(this.api.refresh());
      this.accessToken.set(accessToken);
      const user = await firstValueFrom(this.api.me());
      this.currentUser.set(user);
    } catch {
      // not logged in — leave signals null
    }
  }

  async login(dto: LoginDto): Promise<void> {
    const { user, accessToken } = await firstValueFrom(this.api.login(dto));
    this.accessToken.set(accessToken);
    this.currentUser.set(user);
  }

  async register(dto: RegisterDto): Promise<void> {
    const { user, accessToken } = await firstValueFrom(this.api.register(dto));
    this.accessToken.set(accessToken);
    this.currentUser.set(user);
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.api.logout());
    } finally {
      this.accessToken.set(null);
      this.currentUser.set(null);
      this.router.navigate(['/login']);
    }
  }

  async deleteAccount(): Promise<void> {
    await firstValueFrom(this.api.deleteMe());
    this.accessToken.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  clearLocalSession(): void {
    this.accessToken.set(null);
    this.currentUser.set(null);
  }

  setToken(token: string): void {
    this.accessToken.set(token);
  }
}
