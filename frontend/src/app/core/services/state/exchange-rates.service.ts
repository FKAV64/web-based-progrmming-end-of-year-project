import { Injectable, effect, inject, signal } from '@angular/core';
import { ExchangeRatesResponse } from '../../models/exchange-rate.model';
import { MarketApiService } from '../api/market.api';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ExchangeRatesService {
  private marketApi = inject(MarketApiService);
  private auth = inject(AuthService);

  readonly rates = signal<ExchangeRatesResponse | null>(null);

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.load();
      } else {
        this.rates.set(null);
      }
    });
  }

  private load(): void {
    this.marketApi.getExchangeRates().subscribe({
      next: rates => this.rates.set(rates),
      error: () => {},
    });
  }
}
