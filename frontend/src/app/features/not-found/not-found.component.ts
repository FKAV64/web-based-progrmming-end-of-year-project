import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 text-center p-8">
      <h1 class="text-8xl font-black text-indigo-600">404</h1>
      <p class="mt-4 text-xl text-gray-700 dark:text-gray-300">Sayfa bulunamadı.</p>
      <a mat-flat-button color="primary" routerLink="/dashboard" class="mt-6">Ana Sayfaya Dön</a>
    </div>
  `,
})
export class NotFoundComponent {}
