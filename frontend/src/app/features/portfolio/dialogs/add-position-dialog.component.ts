import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CreatePortfolioPositionDto } from '../../../core/models/portfolio.model';
import { Currency } from '../../../core/models/user.model';

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
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Yeni Pozisyon</h2>

    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium mb-1">Coin ID</label>
          <mat-form-field appearance="outline" class="w-full">
            <input matInput formControlName="coinId" placeholder="bitcoin" aria-label="Coin ID" class="w-full">
            <mat-hint>CoinGecko kimligi kullanin</mat-hint>
          </mat-form-field>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Adet</label>
          <mat-form-field appearance="outline" class="w-full">
            <input matInput formControlName="quantity" inputmode="decimal" placeholder="0.50" aria-label="Adet" class="w-full">
          </mat-form-field>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Ortalama Alis</label>
          <mat-form-field appearance="outline" class="w-full">
            <input matInput formControlName="avgBuyPrice" inputmode="decimal" placeholder="30000" aria-label="Ortalama Alis" class="w-full">
          </mat-form-field>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Para Birimi</label>
          <mat-form-field appearance="outline" class="w-full">
            <mat-select formControlName="buyCurrency" aria-label="Para Birimi" class="w-full">
              <mat-option *ngFor="let currency of currencies" [value]="currency">
                {{ currency }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="sm:col-span-2">
          <label class="block text-sm font-medium mb-1">Notlar</label>
          <mat-form-field appearance="outline" class="w-full">
            <textarea matInput rows="3" formControlName="notes" aria-label="Notlar" class="w-full"></textarea>
          </mat-form-field>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="dialogRef.close()">Vazgec</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">
          Kaydet
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class AddPositionDialogComponent {
  private fb = inject(FormBuilder);

  readonly dialogRef = inject(MatDialogRef<AddPositionDialogComponent>);
  readonly currencies: Currency[] = ['USD', 'EUR', 'TRY'];
  readonly form = this.fb.nonNullable.group({
    coinId: ['', [Validators.required, Validators.maxLength(100)]],
    quantity: ['', [Validators.required, numericString, minNumeric(0.00000001)]],
    avgBuyPrice: ['', [Validators.required, numericString, minNumeric(0.01)]],
    buyCurrency: [this.data.defaultCurrency, [Validators.required]],
    notes: ['', [Validators.maxLength(500)]],
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) private data: { defaultCurrency: Currency },
  ) {}

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    const dto: CreatePortfolioPositionDto = {
      coinId: value.coinId.trim().toLowerCase(),
      quantity: value.quantity.trim(),
      avgBuyPrice: value.avgBuyPrice.trim(),
      buyCurrency: value.buyCurrency,
      notes: value.notes.trim() || undefined,
    };

    this.dialogRef.close(dto);
  }
}
