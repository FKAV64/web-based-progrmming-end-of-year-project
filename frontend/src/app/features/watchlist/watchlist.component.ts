import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-6"><h1 class="text-2xl font-bold text-gray-900 dark:text-white">İzleme Listesi</h1><p class="text-gray-500 mt-2">İzleme listenizdeki coinler yakında burada.</p></div>`,
})
export class WatchlistComponent {}
