import { CurrencyConverterPipe } from './currency-converter.pipe';
import { ExchangeRatesResponse } from '../../core/models/exchange-rate.model';

const mockRates: ExchangeRatesResponse = {
  rates: {
    usd: { name: 'US Dollar', unit: '$', value: 60000, type: 'fiat' },
    eur: { name: 'Euro', unit: '€', value: 55000, type: 'fiat' },
    try: { name: 'Turkish Lira', unit: '₺', value: 1950000, type: 'fiat' },
  },
};

describe('CurrencyConverterPipe', () => {
  let pipe: CurrencyConverterPipe;

  beforeEach(() => {
    pipe = new CurrencyConverterPipe();
  });

  it('should return "-" for null value', () => {
    expect(pipe.transform(null, 'USD', mockRates, 'EN')).toBe('-');
  });

  it('should return "-" for undefined value', () => {
    expect(pipe.transform(undefined, 'USD', mockRates, 'EN')).toBe('-');
  });

  it('should format USD value without conversion in EN locale', () => {
    const result = pipe.transform(1000, 'USD', mockRates, 'EN');
    expect(result).toContain('1,000');
    expect(result).toContain('$');
  });

  it('should format USD value in TR locale using period as thousands separator', () => {
    const result = pipe.transform(1000, 'USD', mockRates, 'TR');
    expect(result).toContain('1.000');
  });

  it('should convert USD to TRY using exchange rates', () => {
    // 1 USD * (tryRate / usdRate) = 1 * (1950000 / 60000) = 32.5 TRY
    const result = pipe.transform(1, 'TRY', mockRates, 'EN');
    expect(result).toContain('32.50');
    // en-US locale uses "TRY" ISO code; tr-TR locale uses ₺ symbol
    expect(result).toMatch(/TRY|₺/);
  });

  it('should convert USD to EUR using exchange rates', () => {
    // 1 USD * (eurRate / usdRate) = 1 * (55000 / 60000) ≈ 0.917 EUR
    const result = pipe.transform(1, 'EUR', mockRates, 'EN');
    expect(result).toContain('€');
  });

  it('should use value as-is when rates are null', () => {
    const result = pipe.transform(500, 'TRY', null, 'EN');
    expect(result).toContain('500');
    // en-US locale uses ISO code "TRY" for Turkish Lira
    expect(result).toMatch(/TRY|₺/);
  });

  it('should respect minFrac and maxFrac parameters', () => {
    const result = pipe.transform(1234567, 'USD', mockRates, 'EN', 0, 0);
    expect(result).not.toContain('.');
    expect(result).toContain('1,234,567');
  });

  it('should format TRY in TR locale with ₺ symbol and Turkish number rules', () => {
    // tr-TR locale uses ₺ symbol and comma as decimal separator
    const result = pipe.transform(1, 'TRY', mockRates, 'TR');
    // 32.5 TRY → "₺32,50" or "32,50 ₺" in tr-TR locale
    expect(result).toContain('₺');
    expect(result).toContain(',');
  });
});
