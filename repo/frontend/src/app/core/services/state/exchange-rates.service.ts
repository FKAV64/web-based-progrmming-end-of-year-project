import { Injectable, effect, inject, signal } from '@angular/core';
import { ExchangeRatesResponse } from '../../models/exchange-rate.model';
import { MarketApiService } from '../api/market.api';
import { AuthService } from './auth.service';

/**
 * Lazy exchange rates loader.
 *
 * Fetches CoinGecko BTC-relative exchange rates once when the user logs in
 * and stores them in a signal so currency converters across the UI can access
 * the latest rates synchronously. Rates are refreshed on the next login if
 * the user logs out and back in. API errors are silently suppressed — components
 * fall back to showing USD values when rates are null.
 *
 * @see MarketApiService
 * @see CurrencyConverterPipe
 */
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
