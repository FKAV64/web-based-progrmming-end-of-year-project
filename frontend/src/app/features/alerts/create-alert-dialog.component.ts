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
import { AlertCondition, CreateAlertDto } from '../../core/models/alerts.model';
import { Currency } from '../../core/models/user.model';

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
  selector: 'app-create-alert-dialog',
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
    <h2 mat-dialog-title>Yeni Alarm</h2>

    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="grid gap-4 sm:grid-cols-2">
        <mat-form-field appearance="outline" class="sm:col-span-2">
          <mat-label>Coin ID</mat-label>
          <input matInput formControlName="coinId" placeholder="bitcoin">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Kosul</mat-label>
          <mat-select formControlName="condition">
            <mat-option *ngFor="let option of conditions" [value]="option.value">
              {{ option.label }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Hedef Fiyat</mat-label>
          <input matInput formControlName="targetPrice" inputmode="decimal" placeholder="65000">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Para Birimi</mat-label>
          <mat-select formControlName="currency">
            <mat-option *ngFor="let currency of currencies" [value]="currency">
              {{ currency }}
            </mat-option>
          </mat-select>
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="dialogRef.close()">Vazgec</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">
          Alarmi Olustur
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class CreateAlertDialogComponent {
  private fb = inject(FormBuilder);

  readonly dialogRef = inject(MatDialogRef<CreateAlertDialogComponent>);
  readonly currencies: Currency[] = ['USD', 'EUR', 'TRY'];
  readonly conditions: { label: string; value: AlertCondition }[] = [
    { label: 'Ustunde', value: 'ABOVE' },
    { label: 'Altinda', value: 'BELOW' },
  ];
  readonly form = this.fb.nonNullable.group({
    coinId: ['', [Validators.required, Validators.maxLength(100)]],
    condition: ['ABOVE' as AlertCondition, [Validators.required]],
    targetPrice: ['', [Validators.required, numericString, minNumeric(0.01)]],
    currency: [this.data.defaultCurrency, [Validators.required]],
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) private data: { defaultCurrency: Currency },
  ) {}

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    const dto: CreateAlertDto = {
      coinId: value.coinId.trim().toLowerCase(),
      condition: value.condition,
      targetPrice: value.targetPrice.trim(),
      currency: value.currency,
    };

    this.dialogRef.close(dto);
  }
}
