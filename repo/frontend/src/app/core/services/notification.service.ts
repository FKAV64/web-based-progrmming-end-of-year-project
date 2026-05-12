import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private snackBar = inject(MatSnackBar);

  show(message: string, variant: 'info' | 'success' | 'error' = 'info', duration?: number): void {
    this.snackBar.open(message, 'Kapat', {
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [`app-snackbar-${variant}`],
      ...(duration === undefined ? {} : { duration }),
    });
  }

  error(message: string): void {
    this.show(message, 'error', 4000);
  }

  success(message: string): void {
    this.show(message, 'success', 2500);
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  showError(error: unknown, fallback: string): void {
    const message =
      (error as { error?: { message?: string } })?.error?.message ||
      (error as { message?: string })?.message ||
      fallback;
    this.error(message);
  }
}
