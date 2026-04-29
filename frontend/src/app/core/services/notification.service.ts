import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private snackBar = inject(MatSnackBar);

  error(message: string): void {
    this.snackBar.open(message, 'Kapat', {
      duration: 4000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['app-snackbar-error'],
    });
  }

  success(message: string): void {
    this.snackBar.open(message, 'Kapat', {
      duration: 2500,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['app-snackbar-success'],
    });
  }

  showError(error: unknown, fallback: string): void {
    const message =
      (error as { error?: { message?: string } })?.error?.message ||
      (error as { message?: string })?.message ||
      fallback;
    this.error(message);
  }
}
