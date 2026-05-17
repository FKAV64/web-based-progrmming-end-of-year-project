import { Injectable, inject, OnDestroy } from '@angular/core';
import { AlarmModalService } from '../alarm-modal.service';
import { AlarmNotification } from '../../models/alerts.model';
import { environment } from '../../../../environments/environment';

const MAX_RECONNECT_DELAY_MS = 30_000;

/**
 * WebSocket client for the /ws/alerts notification channel.
 *
 * connect(token) opens the connection and handles:
 *   - alert.triggered → AlarmModalService.show()
 *   - alarm.dismissed → AlarmModalService.dismissById() (cross-device close)
 *
 * When the user dismisses a modal on THIS device, AlarmModalService emits
 * dismissed$ and this service relays the event to the backend gateway, which
 * re-broadcasts to all other sessions of the same user.
 *
 * disconnect() is called on logout.
 */
@Injectable({ providedIn: 'root' })
export class AlertWsService implements OnDestroy {
  private alarmModal = inject(AlarmModalService);

  private ws: WebSocket | null = null;
  private token: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private intentionalClose = false;

  constructor() {
    // Relay local dismissals to the backend so other devices can close too
    this.alarmModal.dismissed$.subscribe(alertId => {
      this.sendDismissed(alertId);
    });
  }

  connect(token: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    this.token = token;
    this.intentionalClose = false;
    this.reconnectAttempt = 0;
    this.open();
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.token = null;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  sendDismissed(alertId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'alarm.dismissed', alertId }));
    }
  }

  private open(): void {
    if (!this.token) return;

    const url = `${environment.alertsWsUrl}?token=${this.token}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
    };

    this.ws.onmessage = (ev: MessageEvent) => {
      this.handleMessage(ev.data as string);
    };

    this.ws.onclose = () => {
      this.ws = null;
      if (!this.intentionalClose && this.token) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onclose fires right after, reconnect logic lives there
    };
  }

  private handleMessage(raw: string): void {
    try {
      const msg = JSON.parse(raw) as { type: string; data?: AlarmNotification; alertId?: string };
      if (msg.type === 'alert.triggered' && msg.data) {
        this.alarmModal.show(msg.data);
      } else if (msg.type === 'alarm.dismissed' && msg.alertId) {
        this.alarmModal.dismissById(msg.alertId);
      }
    } catch {
      // ignore malformed server messages
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return;
    const delay = Math.min(MAX_RECONNECT_DELAY_MS, 2 ** this.reconnectAttempt * 1_000);
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, delay);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
