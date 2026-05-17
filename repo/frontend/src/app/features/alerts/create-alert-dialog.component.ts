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
import { MatSelectModule } from '@angular/material/select';
import { AlertCondition, CreateAlertDto } from '../../core/models/alerts.model';
import { Currency } from '../../core/models/user.model';
import { SettingsService } from '../../core/services/state/settings.service';
import { CoinPickerComponent } from '../../shared/components/coin-picker/coin-picker.component';

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
    CoinPickerComponent,
  ],
  template: `
    <h2 mat-dialog-title i18n="@@alerts.dialog.create-title">Yeni Alarm</h2>

    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200" i18n="@@alerts.dialog.coin">Coin</label>
          <app-coin-picker [control]="coinIdControl"></app-coin-picker>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200" i18n="@@alerts.dialog.condition">Kosul</label>
          <mat-form-field appearance="outline" class="w-full">
            <mat-select formControlName="condition" aria-label="Kosul" panelClass="dark-panel" class="w-full">
              <mat-option *ngFor="let option of conditions" [value]="option.value">
                {{ option.label }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200" i18n="@@alerts.dialog.target-price">Hedef Fiyat</label>
          <mat-form-field appearance="outline" class="w-full">
            <input matInput formControlName="targetPrice" inputmode="decimal" placeholder="65000" i18n-aria-label="@@alerts.dialog.target-price" aria-label="Hedef Fiyat" class="w-full">
          </mat-form-field>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" class="text-gray-500 hover:text-gray-700 dark:text-gray-400" (click)="dialogRef.close()" i18n="@@common.cancel">Vazgec</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid" i18n="@@alerts.dialog.create-btn">
          Alarmi Olustur
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class CreateAlertDialogComponent {
  private fb = inject(FormBuilder);
  private settings = inject(SettingsService);

  readonly dialogRef = inject(MatDialogRef<CreateAlertDialogComponent>);
  readonly conditions: { label: string; value: AlertCondition }[] = [
    { label: 'Ustunde', value: 'ABOVE' },
    { label: 'Altinda', value: 'BELOW' },
  ];
  readonly form = this.fb.nonNullable.group({
    coinId: ['', [Validators.required, Validators.maxLength(100)]],
    condition: ['ABOVE' as AlertCondition, [Validators.required]],
    targetPrice: ['', [Validators.required, numericString, minNumeric(0.01)]],
  });

  get coinIdControl(): FormControl<string> {
    return this.form.controls.coinId;
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    const dto: CreateAlertDto = {
      coinId: value.coinId.trim().toLowerCase(),
      condition: value.condition,
      targetPrice: value.targetPrice.trim(),
      currency: this.settings.currency() as Currency,
    };

    this.dialogRef.close(dto);
  }
}
