import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CreatePortfolioPositionDto } from '../../../core/models/portfolio.model';
import { Currency } from '../../../core/models/user.model';
import { CoinSnapshot } from '../../../core/models/market.model';
import { SettingsService } from '../../../core/services/state/settings.service';
import { CoinPickerComponent } from '../../../shared/components/coin-picker/coin-picker.component';

function numericString(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  return /^\d+(\.\d+)?$/.test(value) ? null : { numericString: true };
}

function minNumeric(min: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = Number(control.value);
    return Number.isFinite(value) && value >= min ? null : { minNumeric: true };
  };
}

@Component({
  selector: 'app-add-position-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    CoinPickerComponent,
  ],
  template: `
    <h2 mat-dialog-title>Yeni Pozisyon</h2>

    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Coin</label>
          <app-coin-picker
            [control]="coinIdControl"
            (coinSelected)="onCoinSelected($event)">
          </app-coin-picker>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Adet</label>
          <mat-form-field appearance="outline" class="w-full">
            <input matInput formControlName="quantity" inputmode="decimal" placeholder="0.50" aria-label="Adet" class="w-full">
          </mat-form-field>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Ortalama Alis</label>
          <mat-form-field appearance="outline" class="w-full">
            <input matInput formControlName="avgBuyPrice" inputmode="decimal" placeholder="30000" aria-label="Ortalama Alis" class="w-full">
          </mat-form-field>
        </div>

        <div class="sm:col-span-2">
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Notlar</label>
          <mat-form-field appearance="outline" class="w-full">
            <textarea matInput rows="3" formControlName="notes" aria-label="Notlar" class="w-full"></textarea>
          </mat-form-field>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" class="text-gray-500 hover:text-gray-700 dark:text-gray-400" (click)="dialogRef.close()">Vazgec</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">
          Kaydet
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class AddPositionDialogComponent {
  private fb = inject(FormBuilder);
  private settings = inject(SettingsService);

  readonly dialogRef = inject(MatDialogRef<AddPositionDialogComponent>);
  readonly form = this.fb.nonNullable.group({
    coinId: ['', [Validators.required, Validators.maxLength(100)]],
    quantity: ['', [Validators.required, numericString, minNumeric(0.00000001)]],
    avgBuyPrice: ['', [Validators.required, numericString, minNumeric(0.01)]],
    notes: ['', [Validators.maxLength(500)]],
  });

  get coinIdControl(): FormControl<string> {
    return this.form.controls.coinId;
  }

  onCoinSelected(coin: CoinSnapshot): void {
    this.form.get('avgBuyPrice')?.setValue(coin.current_price.toString());
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    const dto: CreatePortfolioPositionDto = {
      coinId: value.coinId.trim().toLowerCase(),
      quantity: value.quantity.trim(),
      avgBuyPrice: value.avgBuyPrice.trim(),
      buyCurrency: this.settings.currency() as Currency,
      notes: value.notes.trim() || undefined,
    };

    this.dialogRef.close(dto);
  }
}
