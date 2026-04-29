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
import { ClosePortfolioPositionDto } from '../../../core/models/portfolio.model';

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
  selector: 'app-close-position-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>Pozisyonu Kapat</h2>

    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="grid gap-4">
        <div class="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          {{ data.coinId }} pozisyonu kapatiliyor. Girilen fiyat kapatma fiyati olarak kaydedilecek.
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Kapanis Fiyati</mat-label>
          <input matInput formControlName="closePrice" inputmode="decimal" placeholder="42000">
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="dialogRef.close()">Vazgec</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">
          Kapat
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class ClosePositionDialogComponent {
  private fb = inject(FormBuilder);

  readonly dialogRef = inject(MatDialogRef<ClosePositionDialogComponent>);
  readonly form = this.fb.nonNullable.group({
    closePrice: ['', [Validators.required, numericString, minNumeric(0.01)]],
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) readonly data: { coinId: string },
  ) {}

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    const dto: ClosePortfolioPositionDto = {
      closePrice: this.form.getRawValue().closePrice.trim(),
    };

    this.dialogRef.close(dto);
  }
}
