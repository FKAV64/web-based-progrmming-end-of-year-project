import { Pipe, PipeTransform } from '@angular/core';
import { ExchangeRatesResponse } from '../../core/models/exchange-rate.model';
import { Currency, Locale } from '../../core/models/user.model';

const RATE_KEYS: Record<Currency, string> = {
  USD: 'usd',
  EUR: 'eur',
  TRY: 'try',
};

const LOCALE_MAP: Record<Locale, string> = {
  TR: 'tr-TR',
  EN: 'en-US',
};

@Pipe({ name: 'currencyConverter', standalone: true })
export class CurrencyConverterPipe implements PipeTransform {
  transform(
    usdValue: number | null | undefined,
    currency: Currency,
    rates: ExchangeRatesResponse | null,
    locale: Locale,
    minFrac = 2,
    maxFrac = 2,
  ): string {
    if (usdValue === null || usdValue === undefined) {
      return '-';
    }

    let converted = usdValue;

    if (currency !== 'USD' && rates) {
      const fromRate = rates.rates[RATE_KEYS['USD']]?.value;
      const toRate = rates.rates[RATE_KEYS[currency]]?.value;
      if (fromRate && toRate) {
        converted = usdValue * (toRate / fromRate);
      }
    }

    return new Intl.NumberFormat(LOCALE_MAP[locale], {
      style: 'currency',
      currency,
      minimumFractionDigits: minFrac,
      maximumFractionDigits: maxFrac,
    }).format(converted);
  }
}
