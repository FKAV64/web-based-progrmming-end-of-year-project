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
  private initPromise: Promise<void> | null = null;

  readonly currentUser = signal<User | null>(null);
  readonly accessToken = signal<string | null>(null);
  readonly isInitializing = signal(false);
  readonly isInitialized = signal(false);
  readonly isAuthenticated = computed(() => !!this.accessToken() || !!this.currentUser());

  private _isLoggingOut = false;

  private readonly broadcastChannel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('auth') : null;

  constructor() {
    this.broadcastChannel?.addEventListener('message', (event: MessageEvent) => {
      if (event.data?.type === 'logout') {
        this.clearLocalSession();
        void this.router.navigate(['/login']);
      }
    });

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
        if (event.data?.type === 'FORCE_LOGOUT') {
          this.clearLocalSession();
          void this.router.navigate(['/login']);
        }
      });
    }
  }

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing.set(true);
    this.initPromise = (async () => {
      try {
        const { accessToken } = await firstValueFrom(this.api.refresh());
        this.accessToken.set(accessToken);

        const user = await firstValueFrom(this.api.me());
        this.currentUser.set(user);
      } catch {
        // not logged in - leave signals cleared
        this.clearLocalSession();
      } finally {
        this.isInitializing.set(false);
        this.isInitialized.set(true);
      }
    })();

    return this.initPromise;
  }

  startInit(): void {
    void this.init();
  }

  waitForInit(): Promise<void> {
    return this.initPromise ?? Promise.resolve();
  }

  async login(dto: LoginDto): Promise<void> {
    const { user, accessToken } = await firstValueFrom(this.api.login(dto));
    this.accessToken.set(accessToken);
    this.currentUser.set(user);
    this.isInitialized.set(true);
  }

  async register(dto: RegisterDto): Promise<void> {
    const { user, accessToken } = await firstValueFrom(this.api.register(dto));
    this.accessToken.set(accessToken);
    this.currentUser.set(user);
    this.isInitialized.set(true);
  }

  async logout(): Promise<void> {
    if (this._isLoggingOut) return;
    this._isLoggingOut = true;
    try {
      await firstValueFrom(this.api.logout());
    } finally {
      this._isLoggingOut = false;
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

  async logoutAll(): Promise<void> {
    if (this._isLoggingOut) return;
    this._isLoggingOut = true;
    try {
      await firstValueFrom(this.api.logoutAll());
    } finally {
      this._isLoggingOut = false;
      this.accessToken.set(null);
      this.currentUser.set(null);
      this.broadcastChannel?.postMessage({ type: 'logout' });
      this.router.navigate(['/login']);
    }
  }

  async exportMe(): Promise<void> {
    const blob = await firstValueFrom(this.api.exportMe());
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clearLocalSession(): void {
    this.accessToken.set(null);
    this.currentUser.set(null);
  }

  setToken(token: string): void {
    this.accessToken.set(token);
  }
}
