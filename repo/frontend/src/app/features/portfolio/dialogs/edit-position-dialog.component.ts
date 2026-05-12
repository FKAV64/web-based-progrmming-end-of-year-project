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
import { PortfolioPosition, UpdatePortfolioPositionDto } from '../../../core/models/portfolio.model';

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
  selector: 'app-edit-position-dialog',
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
    <h2 mat-dialog-title>Pozisyonu Duzenle</h2>

    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <div class="rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-300">
            <div class="font-semibold">{{ data.position.coinId }}</div>
            <div class="mt-1 text-xs uppercase tracking-[0.2em]">
              {{ data.position.buyCurrency }}
            </div>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Adet</label>
          <mat-form-field appearance="outline" class="w-full">
            <input matInput formControlName="quantity" inputmode="decimal" aria-label="Adet" class="w-full">
          </mat-form-field>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Ortalama Alis</label>
          <mat-form-field appearance="outline" class="w-full">
            <input matInput formControlName="avgBuyPrice" inputmode="decimal" aria-label="Ortalama Alis" class="w-full">
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
          Guncelle
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class EditPositionDialogComponent {
  private fb = inject(FormBuilder);

  readonly dialogRef = inject(MatDialogRef<EditPositionDialogComponent>);
  readonly form = this.fb.nonNullable.group({
    quantity: [this.data.position.quantity, [Validators.required, numericString, minNumeric(0.00000001)]],
    avgBuyPrice: [this.data.position.avgBuyPrice, [Validators.required, numericString, minNumeric(0.01)]],
    notes: [this.data.position.notes ?? '', [Validators.maxLength(500)]],
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) readonly data: { position: PortfolioPosition },
  ) {}

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    const dto: UpdatePortfolioPositionDto = {
      quantity: value.quantity.trim(),
      avgBuyPrice: value.avgBuyPrice.trim(),
      notes: value.notes.trim() || undefined,
    };

    this.dialogRef.close(dto);
  }
}
