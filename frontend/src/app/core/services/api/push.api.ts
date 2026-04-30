import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PushApi {
  private http = inject(HttpClient);
  private base = '/api/push';

  async getVapidPublicKey(): Promise<string> {
    const res = await firstValueFrom(
      this.http.get<{ publicKey: string }>(`${this.base}/vapid-public-key`),
    );
    return res.publicKey;
  }

  subscribe(subscription: PushSubscriptionJSON): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${this.base}/subscribe`, subscription),
    );
  }

  unsubscribe(endpoint: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.base}/subscribe`, { body: { endpoint } }),
    );
  }
}
