import {
  ApplicationRef,
  ComponentRef,
  EnvironmentInjector,
  Injectable,
  createComponent,
  inject,
} from '@angular/core';
import { Subject } from 'rxjs';
import { AlarmNotification } from '../models/alerts.model';
import { AlarmModalComponent } from '../../shared/components/alarm-modal/alarm-modal.component';
import { AlarmSoundService } from './alarm-sound.service';

/**
 * Manages the alarm modal overlay queue.
 *
 * show() enqueues an AlarmNotification. If no modal is currently open, the
 * next queued item is rendered immediately via a dynamically-created
 * AlarmModalComponent appended to <body>. The sound plays for the duration
 * the modal is open.
 *
 * dismissById() is called when another device dismisses an alarm (received
 * via WebSocket alarm.dismissed). It silently removes the alarm from the
 * queue/view WITHOUT emitting dismissed$ to avoid an echo loop.
 *
 * dismiss() is called by the user clicking the button. It closes the modal,
 * stops the sound, and emits dismissed$ so AlertWsService can relay the
 * event to other devices.
 */
@Injectable({ providedIn: 'root' })
export class AlarmModalService {
  private appRef = inject(ApplicationRef);
  private injector = inject(EnvironmentInjector);
  private sound = inject(AlarmSoundService);

  /** AlertWsService subscribes to this to relay dismiss events over WS */
  readonly dismissed$ = new Subject<string>();

  private queue: AlarmNotification[] = [];
  private currentRef: ComponentRef<AlarmModalComponent> | null = null;
  private currentHost: HTMLElement | null = null;
  private currentAlertId: string | null = null;

  show(alarm: AlarmNotification): void {
    // Ignore duplicates already in queue or currently displayed
    if (
      this.currentAlertId === alarm.id ||
      this.queue.some(a => a.id === alarm.id)
    ) {
      return;
    }
    this.queue.push(alarm);
    if (!this.currentRef) {
      this.openNext();
    }
  }

  /** User clicked dismiss on THIS device — relay to others via dismissed$ */
  dismiss(alertId: string): void {
    this.dismissed$.next(alertId);
    this.closeAndAdvance(alertId);
  }

  /** Remote dismiss received from another device — close silently, no relay */
  dismissById(alertId: string): void {
    this.queue = this.queue.filter(a => a.id !== alertId);
    if (this.currentAlertId === alertId) {
      this.closeAndAdvance(alertId);
    }
  }

  private openNext(): void {
    if (this.queue.length === 0) return;
    const alarm = this.queue[0];
    this.currentAlertId = alarm.id;

    const host = document.createElement('div');
    document.body.appendChild(host);
    this.currentHost = host;

    const ref = createComponent(AlarmModalComponent, {
      environmentInjector: this.injector,
      hostElement: host,
    });

    ref.setInput('alarm', alarm);
    ref.instance.dismissed.subscribe(() => this.dismiss(alarm.id));

    this.appRef.attachView(ref.hostView);
    ref.changeDetectorRef.detectChanges();
    this.currentRef = ref;

    this.sound.start();
  }

  private closeAndAdvance(alertId: string): void {
    if (this.currentAlertId !== alertId) {
      // It was queued but not yet displayed
      this.queue = this.queue.filter(a => a.id !== alertId);
      return;
    }

    this.sound.stop();
    if (this.currentRef) {
      this.appRef.detachView(this.currentRef.hostView);
      this.currentRef.destroy();
      this.currentRef = null;
    }
    if (this.currentHost) {
      this.currentHost.remove();
      this.currentHost = null;
    }
    this.currentAlertId = null;
    this.queue.shift();

    // Show the next queued alarm, if any
    if (this.queue.length > 0) {
      this.openNext();
    }
  }
}
