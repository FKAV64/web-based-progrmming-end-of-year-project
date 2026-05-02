import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-delete-account-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title i18n="@@settings.delete-title">Hesabı Sil</h2>
    <mat-dialog-content>
      <p i18n="@@settings.delete-warning">Bu işlem geri alınamaz. Tüm verileriniz silinecektir.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close i18n="@@settings.delete-cancel">İptal</button>
      <button mat-flat-button color="warn" [mat-dialog-close]="true" i18n="@@settings.delete-confirm">Hesabı Sil</button>
    </mat-dialog-actions>
  `,
})
export class DeleteAccountDialogComponent {}
