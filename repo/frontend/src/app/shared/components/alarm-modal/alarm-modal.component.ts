import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe, UpperCasePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AlarmNotification } from '../../../core/models/alerts.model';

@Component({
  selector: 'app-alarm-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule, DecimalPipe, DatePipe, UpperCasePipe],
  templateUrl: './alarm-modal.component.html',
  styleUrl: './alarm-modal.component.scss',
})
export class AlarmModalComponent {
  @Input({ required: true }) alarm!: AlarmNotification;
  @Output() dismissed = new EventEmitter<void>();

  dismiss(): void {
    this.dismissed.emit();
  }
}
