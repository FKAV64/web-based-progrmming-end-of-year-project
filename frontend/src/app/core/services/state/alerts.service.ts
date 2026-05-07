import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, firstValueFrom, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CreateAlertDto, PriceAlert } from '../../models/alerts.model';
import { AlertsApiService } from '../api/alerts.api';
import { NotificationService } from '../notification.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AlertsService {
  private auth = inject(AuthService);
  private api = inject(AlertsApiService);
  private notifications = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  readonly active = signal<PriceAlert[]>([]);
  readonly triggered = signal<PriceAlert[]>([]);

  private loadedUserId: string | null = null;
  private previousTriggeredIds = new Set<string>();
  private pollerStarted = false;
  private seededTriggeredSnapshot = false;

  constructor() {
    effect(() => {
      const userId = this.auth.currentUser()?.id ?? null;

      if (!userId) {
        this.loadedUserId = null;
        this.previousTriggeredIds.clear();
        this.seededTriggeredSnapshot = false;
        this.active.set([]);
        this.triggered.set([]);
        return;
      }

      if (this.loadedUserId !== userId) {
        this.loadedUserId = userId;
        this.previousTriggeredIds.clear();
        this.seededTriggeredSnapshot = false;
        void this.loadActive(true);
      }
    });
  }

  startAlertPoller(): void {
    if (this.pollerStarted) return;
    this.pollerStarted = true;

    void this.syncTriggeredAlerts(false);

    timer(15_000, 30_000)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() => (this.auth.currentUser() ? this.api.list(true) : EMPTY)),
      )
      .subscribe({
        next: alerts => this.applyAlertSnapshot(alerts, true),
        error: error => this.notifications.showError(error, 'Alarm bildirimleri kontrol edilemedi.'),
      });
  }

  async loadActive(silent = false): Promise<void> {
    try {
      const alerts = await firstValueFrom(this.api.list(false));
      this.active.set(alerts.filter(alert => !alert.triggeredAt));
    } catch (error) {
      this.active.set([]);
      if (!silent) {
        this.notifications.showError(error, 'Aktif alarmlar yuklenemedi.');
      }
    }
  }

  async loadTriggered(): Promise<void> {
    try {
      const alerts = await firstValueFrom(this.api.list(true));
      this.applyAlertSnapshot(alerts, false);
    } catch (error) {
      this.triggered.set([]);
      this.notifications.showError(error, 'Tetiklenen alarmlar yuklenemedi.');
    }
  }

  async add(dto: CreateAlertDto): Promise<void> {
    try {
      const created = await firstValueFrom(this.api.add(dto));
      this.active.update(alerts => [created, ...alerts]);
    } catch (error) {
      this.notifications.showError(error, 'Alarm olusturulamadi.');
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
      this.notifications.showError(error, 'Alarm silinemedi.');
      throw error;
    }
  }

  private async syncTriggeredAlerts(notifyNewTriggered: boolean): Promise<void> {
    if (!this.auth.currentUser()) return;

    try {
      const alerts = await firstValueFrom(this.api.list(true));
      this.applyAlertSnapshot(alerts, notifyNewTriggered);
    } catch (error) {
      this.notifications.showError(error, 'Alarm bildirimleri kontrol edilemedi.');
    }
  }

  private applyAlertSnapshot(alerts: PriceAlert[], notifyNewTriggered: boolean): void {
    const triggeredAlerts = alerts.filter(alert => !!alert.triggeredAt);
    this.active.set(alerts.filter(alert => !alert.triggeredAt));
    this.triggered.set(triggeredAlerts);

    if (!this.seededTriggeredSnapshot || !notifyNewTriggered) {
      triggeredAlerts.forEach(alert => this.previousTriggeredIds.add(alert.id));
      this.seededTriggeredSnapshot = true;
      return;
    }

    for (const alert of triggeredAlerts) {
      if (this.previousTriggeredIds.has(alert.id)) continue;

      this.previousTriggeredIds.add(alert.id);
      this.notifications.info(
        `Alarm tetiklendi: ${alert.coinId.toUpperCase()} hedef ${alert.targetPrice} ${alert.currency}`,
      );
    }
  }
}
