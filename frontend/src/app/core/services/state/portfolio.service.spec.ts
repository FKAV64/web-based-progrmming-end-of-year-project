import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { PortfolioService } from './portfolio.service';
import { AuthService } from './auth.service';
import { NotificationService } from '../notification.service';
import { MarketApiService } from '../api/market.api';
import { PortfolioApiService } from '../api/portfolio.api';
import { PriceStreamService } from './price-stream.service';
import { SettingsService } from './settings.service';
import { CoinSnapshot } from '../../models/market.model';
import { Currency } from '../../models/user.model';
import { PortfolioPosition } from '../../models/portfolio.model';

function makeCoin(id: string, symbol: string, currentPrice: number): CoinSnapshot {
  return {
    id,
    symbol,
    name: symbol.toUpperCase(),
    image: '',
    current_price: currentPrice,
    market_cap: 1_000_000,
    market_cap_rank: 1,
    total_volume: 100_000,
    high_24h: currentPrice + 10,
    low_24h: currentPrice - 10,
    price_change_24h: 0,
    price_change_percentage_24h: 0,
    market_cap_change_24h: 0,
    market_cap_change_percentage_24h: 0,
    circulating_supply: 1_000_000,
    ath: currentPrice * 2,
    ath_change_percentage: -20,
    ath_date: '',
    atl: currentPrice * 0.25,
    atl_change_percentage: 300,
    atl_date: '',
    last_updated: '',
  };
}

function position(
  id: string,
  coinId: string,
  quantity: string,
  avgBuyPrice: string,
  buyCurrency: Currency,
): PortfolioPosition {
  return {
    id,
    userId: 'user-1',
    coinId,
    quantity,
    avgBuyPrice,
    buyCurrency,
    notes: null,
    closedAt: null,
    closePrice: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

interface ScenarioSetup {
  positions: PortfolioPosition[];
  coins: CoinSnapshot[];
  currency: Currency;
}

const authMock = {
  currentUser: signal({
    id: 'user-1',
    email: 'demo@example.com',
    name: 'Demo',
    role: 'USER' as const,
    emailVerifiedAt: null,
    createdAt: new Date().toISOString(),
    settings: null,
  }),
};

// CoinGecko-style rates: each value is "1 BTC priced in that currency".
// To convert X USD → EUR: X * (eurRate/usdRate).
const exchangeRates = {
  rates: {
    usd: { name: 'US Dollar', unit: '$', value: 30_000, type: 'fiat' },
    eur: { name: 'Euro', unit: 'EUR', value: 27_000, type: 'fiat' },
    try: { name: 'Turkish Lira', unit: 'TRY', value: 960_000, type: 'fiat' },
  },
};

async function setupScenario(scenario: ScenarioSetup): Promise<PortfolioService> {
  TestBed.resetTestingModule();

  const portfolioApiMock = {
    list: jest.fn().mockReturnValue(of(scenario.positions)),
    add: jest.fn(),
    update: jest.fn(),
    close: jest.fn(),
    remove: jest.fn(),
  };

  const marketApiMock = {
    getExchangeRates: jest.fn().mockReturnValue(of(exchangeRates)),
  };

  const settingsMock = {
    currency: signal<Currency>(scenario.currency),
    locale: signal<'TR' | 'EN'>('EN'),
  };

  TestBed.configureTestingModule({
    providers: [
      PortfolioService,
      { provide: AuthService, useValue: authMock },
      { provide: PortfolioApiService, useValue: portfolioApiMock },
      { provide: MarketApiService, useValue: marketApiMock },
      { provide: NotificationService, useValue: { showError: jest.fn() } },
      {
        provide: PriceStreamService,
        useValue: { topCoins$: of(scenario.coins) },
      },
      { provide: SettingsService, useValue: settingsMock },
    ],
  });

  const service = TestBed.inject(PortfolioService);
  // Allow effect() + async loaders (loadActive + loadExchangeRates) to flush.
  await Promise.resolve();
  await Promise.resolve();
  return service;
}

describe('PortfolioService — computed totals', () => {
  // -------------------------------------------------------------------------
  // Scenario 1: single profitable USD position
  // 1 BTC @ $30k bought, market $40k now → +33.33%
  // -------------------------------------------------------------------------
  it('scenario 1: single profitable USD position computes +33.33% pnl', async () => {
    const service = await setupScenario({
      currency: 'USD',
      positions: [position('btc-1', 'bitcoin', '1', '30000', 'USD')],
      coins: [makeCoin('bitcoin', 'btc', 40_000)],
    });

    expect(service.totalCost()).toBeCloseTo(30_000, 2);
    expect(service.totalValue()).toBeCloseTo(40_000, 2);
    expect(service.totalPnL()).toBeCloseTo(10_000, 2);
    expect(service.totalPnLPercent()).toBeCloseTo(33.3333, 2);
  });

  // -------------------------------------------------------------------------
  // Scenario 2: mixed currencies (BTC in USD, ETH in EUR), preferred = EUR
  // BTC pos:  0.5 @ $30k → cost = 0.5 × (30000 × 27/30) = 13500 EUR
  //           current $40k → value = 0.5 × (40000 × 27/30) = 18000 EUR
  // ETH pos:  2 @ €1000 → cost = 2000 EUR, current $2000 → value 3600 EUR
  // total: cost 15500, value 21600, pnl 6100, pnl% ≈ 39.35
  // -------------------------------------------------------------------------
  it('scenario 2: mixed-currency portfolio in EUR', async () => {
    const service = await setupScenario({
      currency: 'EUR',
      positions: [
        position('btc-pos', 'bitcoin', '0.5', '30000', 'USD'),
        position('eth-pos', 'ethereum', '2', '1000', 'EUR'),
      ],
      coins: [
        makeCoin('bitcoin', 'btc', 40_000),
        makeCoin('ethereum', 'eth', 2_000),
      ],
    });

    expect(service.totalValue()).toBeCloseTo(21_600, 2);
    expect(service.totalCost()).toBeCloseTo(15_500, 2);
    expect(service.totalPnL()).toBeCloseTo(6_100, 2);
    expect(service.totalPnLPercent()).toBeCloseTo(39.35, 2);
  });

  // -------------------------------------------------------------------------
  // Scenario 3: losing position in USD
  // 2 BTC @ $50k cost = $100k, current $40k → value $80k → −20%
  // -------------------------------------------------------------------------
  it('scenario 3: losing USD position computes negative pnl', async () => {
    const service = await setupScenario({
      currency: 'USD',
      positions: [position('btc-loss', 'bitcoin', '2', '50000', 'USD')],
      coins: [makeCoin('bitcoin', 'btc', 40_000)],
    });

    expect(service.totalCost()).toBeCloseTo(100_000, 2);
    expect(service.totalValue()).toBeCloseTo(80_000, 2);
    expect(service.totalPnL()).toBeCloseTo(-20_000, 2);
    expect(service.totalPnLPercent()).toBeCloseTo(-20, 2);
  });

  // -------------------------------------------------------------------------
  // Scenario 4: empty portfolio → all totals zero, pnl% protected from /0
  // -------------------------------------------------------------------------
  it('scenario 4: empty portfolio yields zero totals (no /0 errors)', async () => {
    const service = await setupScenario({
      currency: 'USD',
      positions: [],
      coins: [],
    });

    expect(service.totalCost()).toBe(0);
    expect(service.totalValue()).toBe(0);
    expect(service.totalPnL()).toBe(0);
    expect(service.totalPnLPercent()).toBe(0);
  });
});
