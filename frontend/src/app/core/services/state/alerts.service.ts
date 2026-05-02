import { Injectable, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CreateAlertDto, PriceAlert } from '../../models/alerts.model';
import { AlertsApiService } from '../api/alerts.api';
import { NotificationService } from '../notification.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AlertsService {
  private auth = inject(AuthService);
  private api = inject(AlertsApiService);
  private notifications = inject(NotificationService);

  readonly active = signal<PriceAlert[]>([]);
  readonly triggered = signal<PriceAlert[]>([]);

  private loadedUserId: string | null = null;

  constructor() {
    effect(() => {
      const userId = this.auth.currentUser()?.id ?? null;

      if (!userId) {
        this.loadedUserId = null;
        this.active.set([]);
        this.triggered.set([]);
        return;
      }

      if (this.loadedUserId !== userId) {
        this.loadedUserId = userId;
        void this.loadActive(true);
      }
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
      this.triggered.set(alerts.filter(alert => !!alert.triggeredAt));
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
}
