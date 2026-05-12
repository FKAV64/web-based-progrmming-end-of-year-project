import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ClosePortfolioPositionDto } from '../../../core/models/portfolio.model';
import { PriceStreamService } from '../../../core/services/state/price-stream.service';

interface ClosePositionDialogData {
  coinId: string;
  coinName: string;
  coinSymbol: string;
  fallbackPrice: number;
}

@Component({
  selector: 'app-close-position-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Pozisyonu Kapat</h2>

    <mat-dialog-content class="max-w-sm">
      <p class="text-gray-600 dark:text-gray-300 text-sm mt-2">
        <strong>{{ data.coinName }}</strong> pozisyonunuzu kapatmak istediğinizden emin misiniz?
        Güncel fiyat
        <span class="font-mono font-semibold text-gray-900 dark:text-white">{{ formatPrice(currentPrice) }}</span>
        olarak kullanılacaktır.
      </p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button"
              class="text-gray-500 hover:text-gray-700 dark:text-gray-400"
              (click)="dialogRef.close()">
        Vazgeç
      </button>
      <button mat-flat-button type="button"
              color="primary"
              class="bg-blue-600 hover:bg-blue-500 text-white font-medium"
              (click)="confirm()">
        Pozisyonu Kapat
      </button>
    </mat-dialog-actions>
  `,
})
export class ClosePositionDialogComponent {
  readonly data = inject<ClosePositionDialogData>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<ClosePositionDialogComponent>);

  private priceStream = inject(PriceStreamService);
  private coinSignal = this.priceStream.priceFor(this.data.coinSymbol);

  get currentPrice(): number {
    return this.coinSignal()?.current_price ?? this.data.fallbackPrice;
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(price);
  }

  confirm(): void {
    const dto: ClosePortfolioPositionDto = {
      closePrice: this.currentPrice.toString(),
    };
    this.dialogRef.close(dto);
  }
}
