import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectionState } from '../../../core/services/ws/binance-ws.service';

@Component({
  selector: 'app-connection-status',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      [ngClass]="pillClass"
    >
      <span class="h-2 w-2 rounded-full" [ngClass]="dotClass"></span>
      {{ label }}
    </span>
  `,
})
export class ConnectionStatusComponent {
  @Input() state: ConnectionState = 'connecting';

  get label(): string {
    switch (this.state) {
      case 'live':         return $localize`:@@ws.status.live:Canlı`;
      case 'reconnecting': return $localize`:@@ws.status.reconnecting:Yeniden bağlanıyor...`;
      case 'offline':      return $localize`:@@ws.status.offline:Çevrimdışı`;
      default:             return $localize`:@@ws.status.connecting:Bağlanıyor...`;
    }
  }

  get dotClass(): string {
    switch (this.state) {
      case 'live':         return 'bg-green-400';
      case 'reconnecting': return 'bg-yellow-400 animate-pulse';
      case 'offline':      return 'bg-red-500';
      default:             return 'bg-gray-400 animate-pulse';
    }
  }

  get pillClass(): string {
    switch (this.state) {
      case 'live':         return 'bg-green-900/40 text-green-300';
      case 'reconnecting': return 'bg-yellow-900/40 text-yellow-300';
      case 'offline':      return 'bg-red-900/40 text-red-300';
      default:             return 'bg-gray-700/40 text-gray-300';
    }
  }
}
