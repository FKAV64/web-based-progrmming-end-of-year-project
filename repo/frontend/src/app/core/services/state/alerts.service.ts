import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, firstValueFrom, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CreateAlertDto, PriceAlert } from '../../models/alerts.model';
import { AlertsApiService } from '../api/alerts.api';
import { NotificationService } from '../notification.service';
import { AlarmModalService } from '../alarm-modal.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AlertsService {
  private auth = inject(AuthService);
  private api = inject(AlertsApiService);
  private notifications = inject(NotificationService);
  private alarmModal = inject(AlarmModalService);
  private destroyRef = inject(DestroyRef);

  readonly active = signal<PriceAlert[]>([]);
  readonly triggered = signal<PriceAlert[]>([]);

  private loadedUserId: string | null = null;
  private previousTriggeredIds = new Set<string>();
  private pollerStarted = false;

  constructor() {
    effect(() => {
      const userId = this.auth.currentUser()?.id ?? null;

      if (!userId) {
        this.loadedUserId = null;
        this.previousTriggeredIds.clear();
        this.active.set([]);
        this.triggered.set([]);
        return;
      }

      if (this.loadedUserId !== userId) {
        this.loadedUserId = userId;
        this.previousTriggeredIds.clear();
        void this.loadActive(true);
      }
    }, { allowSignalWrites: true });
  }

  startAlertPoller(): void {
    if (this.pollerStarted) return;
    this.pollerStarted = true;

    // Start immediately (timer(0, ...)), then repeat every 30 s.
    // The first emission seeds previousTriggeredIds and shows modals for
    // recently-triggered alerts (WS fallback). Subsequent emissions only
    // show modals for IDs not yet seen.
    timer(0, 30_000)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() => (this.auth.currentUser() ? this.api.list(true) : EMPTY)),
      )
      .subscribe({
        next: alerts => this.applyAlertSnapshot(alerts, true),
        error: error => this.notifications.showError(error, $localize`:@@alerts.error.poll:Alarm bildirimleri kontrol edilemedi.`),
      });
  }

  async loadActive(silent = false): Promise<void> {
    try {
      const alerts = await firstValueFrom(this.api.list(false));
      this.active.set(alerts.filter(alert => !alert.triggeredAt));
    } catch (error) {
      this.active.set([]);
      if (!silent) {
        this.notifications.showError(error, $localize`:@@alerts.error.load-active:Aktif alarmlar yüklenemedi.`);
      }
    }
  }

  async loadTriggered(): Promise<void> {
    try {
      const alerts = await firstValueFrom(this.api.list(true));
      // Update signals only — do not show modals (WS / poller handle that).
      this.applyAlertSnapshot(alerts, false);
    } catch (error) {
      this.triggered.set([]);
      this.notifications.showError(error, $localize`:@@alerts.error.load-triggered:Tetiklenen alarmlar yüklenemedi.`);
    }
  }

  async add(dto: CreateAlertDto): Promise<void> {
    try {
      const created = await firstValueFrom(this.api.add(dto));
      this.active.update(alerts => [created, ...alerts]);
    } catch (error) {
      this.notifications.showError(error, $localize`:@@alerts.error.create:Alarm oluşturulamadı.`);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const previousActive = this.active();
    const previousTriggered = this.triggered();

    this.active.set(previousActive.filter(alert => alert.id !== id));
    this.triggered.set(previousTriggered.filter(alert => alert.id !== id));

    try {
      await firstValueFrom(this.api.remove(id));
    } catch (error) {
      this.active.set(previousActive);
      this.triggered.set(previousTriggered);
      this.notifications.showError(error, $localize`:@@alerts.error.delete:Alarm silinemedi.`);
      throw error;
    }
  }

  private applyAlertSnapshot(alerts: PriceAlert[], showModals: boolean): void {
    const triggeredAlerts = alerts.filter(alert => !!alert.triggeredAt);
    this.active.set(alerts.filter(alert => !alert.triggeredAt));
    this.triggered.set(triggeredAlerts);

    if (!showModals) return;

    const cutoff = Date.now() - 3 * 60_000;
    for (const alert of triggeredAlerts) {
      if (this.previousTriggeredIds.has(alert.id)) continue;
      this.previousTriggeredIds.add(alert.id);
      // Show modal for alerts that fired within the last 3 minutes — catches
      // triggers that arrived while the WebSocket was reconnecting.
      if (alert.triggeredAt && new Date(alert.triggeredAt).getTime() > cutoff) {
        this.alarmModal.show({
          id: alert.id,
          coinId: alert.coinId,
          condition: alert.condition,
          targetPrice: alert.targetPrice,
          currency: alert.currency,
          triggeredAt: alert.triggeredAt,
          currentPrice: alert.targetPrice,
        });
      }
    }
  }
}
