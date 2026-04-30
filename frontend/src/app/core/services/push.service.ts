import { Injectable, inject, signal } from '@angular/core';
import { PushApi } from './api/push.api';

export type PushPermissionState = 'denied' | 'granted' | 'default' | 'unsupported';

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
    if (this.state() !== 'default') return;
    const result = await Notification.requestPermission();
    this.state.set(result as PushPermissionState);
  }

  async subscribe(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;

    const publicKey = await this.api.getVapidPublicKey();
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (existing) return;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(publicKey),
    });

    await this.api.subscribe(subscription.toJSON());
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
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  }
}
