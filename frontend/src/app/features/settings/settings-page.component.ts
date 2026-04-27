import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { SettingsService } from '../../core/services/state/settings.service';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, MatButtonToggleModule, MatCardModule],
  template: `
    <div class="p-6 max-w-lg">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Ayarlar</h1>
      <mat-card class="mb-4">
        <mat-card-header><mat-card-title>Tema</mat-card-title></mat-card-header>
        <mat-card-content class="pt-4">
          <mat-button-toggle-group [value]="settings.theme()" (change)="settings.setTheme($event.value)" aria-label="Tema seç">
            <mat-button-toggle value="LIGHT">Açık</mat-button-toggle>
            <mat-button-toggle value="DARK">Koyu</mat-button-toggle>
            <mat-button-toggle value="SYSTEM">Sistem</mat-button-toggle>
          </mat-button-toggle-group>
        </mat-card-content>
      </mat-card>
      <mat-card>
        <mat-card-header><mat-card-title>Para Birimi</mat-card-title></mat-card-header>
        <mat-card-content class="pt-4">
          <mat-button-toggle-group [value]="settings.currency()" (change)="settings.setCurrency($event.value)" aria-label="Para birimi seç">
            <mat-button-toggle value="USD">USD</mat-button-toggle>
            <mat-button-toggle value="EUR">EUR</mat-button-toggle>
            <mat-button-toggle value="TRY">TRY</mat-button-toggle>
          </mat-button-toggle-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class SettingsPageComponent {
  settings = inject(SettingsService);
}
