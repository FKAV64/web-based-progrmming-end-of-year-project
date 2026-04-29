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

describe('PortfolioService', () => {
  let service: PortfolioService;

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

  const positions: PortfolioPosition[] = [
    {
      id: 'btc-position',
      userId: 'user-1',
      coinId: 'bitcoin',
      quantity: '0.5',
      avgBuyPrice: '30000',
      buyCurrency: 'USD',
      notes: null,
      closedAt: null,
      closePrice: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'eth-position',
      userId: 'user-1',
      coinId: 'ethereum',
      quantity: '2',
      avgBuyPrice: '1000',
      buyCurrency: 'EUR',
      notes: null,
      closedAt: null,
      closePrice: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    const portfolioApiMock = {
      list: jest.fn().mockReturnValue(of(positions)),
      add: jest.fn(),
      update: jest.fn(),
      close: jest.fn(),
      remove: jest.fn(),
    };

    const marketApiMock = {
      getExchangeRates: jest.fn().mockReturnValue(of({
        rates: {
          usd: { name: 'US Dollar', unit: '$', value: 30_000, type: 'fiat' },
          eur: { name: 'Euro', unit: 'EUR', value: 27_000, type: 'fiat' },
          try: { name: 'Turkish Lira', unit: 'TRY', value: 960_000, type: 'fiat' },
        },
      })),
    };

    const settingsMock = {
      currency: signal<'USD' | 'EUR' | 'TRY'>('EUR'),
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
          useValue: {
            topCoins$: of([
              makeCoin('bitcoin', 'btc', 40_000),
              makeCoin('ethereum', 'eth', 2_000),
            ]),
          },
        },
        { provide: SettingsService, useValue: settingsMock },
      ],
    });

    service = TestBed.inject(PortfolioService);
    await Promise.resolve();
    await Promise.resolve();
  });

  it('computes totals from seeded positions in the preferred currency', () => {
    expect(service.totalValue()).toBeCloseTo(21_600, 2);
    expect(service.totalCost()).toBeCloseTo(15_500, 2);
    expect(service.totalPnL()).toBeCloseTo(6_100, 2);
    expect(service.totalPnLPercent()).toBeCloseTo(39.35, 2);
  });
});
