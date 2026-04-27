import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-6"><h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1><p class="text-gray-500 mt-2">Yakında burada kripto özet bilgileri görünecek.</p></div>`,
})
export class DashboardComponent {}
