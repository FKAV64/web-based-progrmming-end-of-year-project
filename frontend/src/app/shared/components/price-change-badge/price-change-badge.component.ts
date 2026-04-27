import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-price-change-badge',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <span 
      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      [ngClass]="{
        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400': percentage >= 0,
        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400': percentage < 0
      }">
      <mat-icon class="!w-3 !h-3 !text-[12px] leading-none mr-0.5" *ngIf="percentage >= 0">arrow_upward</mat-icon>
      <mat-icon class="!w-3 !h-3 !text-[12px] leading-none mr-0.5" *ngIf="percentage < 0">arrow_downward</mat-icon>
      {{ math.abs(percentage) | number:'1.2-2' }}%
    </span>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class PriceChangeBadgeComponent {
  @Input() percentage: number = 0;
  math = Math;
}
