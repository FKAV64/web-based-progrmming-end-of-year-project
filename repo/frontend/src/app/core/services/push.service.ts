import { Injectable, inject, signal } from '@angular/core';
import { PushApi } from './api/push.api';

type PushPermissionState = 'denied' | 'granted' | 'default' | 'unsupported';

/**
 * Browser Web Push notification service.
 *
 * Wraps the browser Push API to request notification permission, create a
 * VAPID-signed push subscription, and register it with the backend. The
 * current permission state is exposed as a signal so the settings UI can
 * reflect it reactively.
 *
 * The `unsupported` state is set on environments where the Notification API
 * or ServiceWorker API is unavailable (e.g. Firefox Private Browsing, Safari
 * < 16).
 *
 * @see PushApi
 * @see ShellComponent
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  private api = inject(PushApi);

  readonly state = signal<PushPermissionState>(this.detectInitialState());

  private detectInitialState(): PushPermissionState {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      return 'unsupported';
    }
    return Notification.permission as PushPermissionState;
  }

  async requestPermission(): Promise<void> {
    if (this.state() !== 'default') {
      return;
    }

    const result = await Notification.requestPermission();
    this.state.set(result as PushPermissionState);
  }

  async subscribe(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      this.state.set('unsupported');
      return;
    }

    const permission =
      this.state() === 'granted' ? Notification.permission : await Notification.requestPermission();

    if (permission !== 'granted') {
      this.state.set(permission as PushPermissionState);
      return;
    }

    const publicKey = await this.api.getVapidPublicKey();
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey),
      });

    await this.api.subscribe({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: this.encodeSubscriptionKey(subscription, 'p256dh'),
        auth: this.encodeSubscriptionKey(subscription, 'auth'),
      },
    });

    this.state.set('granted');
  }

  async unsubscribe(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    await this.api.unsubscribe(subscription.endpoint);
    await subscription.unsubscribe();
    this.state.set('default');
  }

  /** Enable = requestPermission + subscribe; disable = unsubscribe */
  async toggle(enable: boolean): Promise<void> {
    if (enable) {
      await this.requestPermission();
      if (this.state() === 'granted') {
        await this.subscribe();
      }
    } else {
      await this.unsubscribe();
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
  }

  private encodeSubscriptionKey(subscription: PushSubscription, keyName: 'p256dh' | 'auth'): string {
    const key = subscription.getKey(keyName);
    if (!key) {
      throw new Error(`Push subscription is missing the ${keyName} key.`);
    }

    return btoa(String.fromCharCode(...new Uint8Array(key)));
  }
}
