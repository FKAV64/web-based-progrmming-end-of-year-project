export interface ExchangeRate {
  name: string;
  unit: string;
  value: number;
  type: string;
}

export interface ExchangeRatesResponse {
  rates: Record<string, ExchangeRate>;
}
