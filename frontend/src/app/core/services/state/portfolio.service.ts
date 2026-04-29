import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { CoinSnapshot } from '../../models/market.model';
import {
  ClosePortfolioPositionDto,
  CreatePortfolioPositionDto,
  PortfolioPosition,
  UpdatePortfolioPositionDto,
} from '../../models/portfolio.model';
import { Currency } from '../../models/user.model';
import { ExchangeRatesResponse } from '../../models/exchange-rate.model';
import { MarketApiService } from '../api/market.api';
import { PortfolioApiService } from '../api/portfolio.api';
import { NotificationService } from '../notification.service';
import { AuthService } from './auth.service';
import { PriceStreamService } from './price-stream.service';
import { SettingsService } from './settings.service';

const RATE_KEYS: Record<Currency, string> = {
  USD: 'usd',
  EUR: 'eur',
  TRY: 'try',
};

function toNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export interface PortfolioPositionView {
  position: PortfolioPosition;
  coin: CoinSnapshot | null;
  label: string;
  symbol: string;
  image: string | null;
  quantity: number;
  avgBuyPrice: number;
  avgBuyPriceConverted: number;
  totalCost: number;
  currentPriceConverted: number | null;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  closePrice: number | null;
  closePriceConverted: number | null;
  closeValue: number | null;
}

@Injectable({ providedIn: 'root' })
export class PortfolioService {
  private auth = inject(AuthService);
  private api = inject(PortfolioApiService);
  private marketApi = inject(MarketApiService);
  private settings = inject(SettingsService);
  private priceStream = inject(PriceStreamService);
  private notifications = inject(NotificationService);

  readonly positions = signal<PortfolioPosition[]>([]);
  readonly closedPositions = signal<PortfolioPosition[]>([]);
  readonly totalValue = computed(() =>
    this.activeRows().reduce((sum, row) => sum + row.currentValue, 0),
  );
  readonly totalCost = computed(() =>
    this.activeRows().reduce((sum, row) => sum + row.totalCost, 0),
  );
  readonly totalPnL = computed(() => this.totalValue() - this.totalCost());
  readonly totalPnLPercent = computed(() => {
    const cost = this.totalCost();
    if (!cost) {
      return 0;
    }

    return (this.totalPnL() / cost) * 100;
  });
  readonly activeRows = computed(() => this.enrichPositions(this.positions()));
  readonly closedRows = computed(() => this.enrichPositions(this.closedPositions()));

  private topCoins = toSignal(this.priceStream.topCoins$, {
    initialValue: [] as CoinSnapshot[],
  });
  private exchangeRates = signal<ExchangeRatesResponse | null>(null);
  private loadedUserId: string | null = null;
  private closedLoaded = false;

  constructor() {
    effect(() => {
      const userId = this.auth.currentUser()?.id ?? null;

      if (!userId) {
        this.loadedUserId = null;
        this.closedLoaded = false;
        this.positions.set([]);
        this.closedPositions.set([]);
        this.exchangeRates.set(null);
        return;
      }

      if (this.loadedUserId !== userId) {
        this.loadedUserId = userId;
        this.closedLoaded = false;
        void this.loadActive(true);
        void this.loadExchangeRates();
      }
    });
  }

  async loadActive(silent = false): Promise<void> {
    try {
      const positions = await firstValueFrom(this.api.list(false));
      this.positions.set(positions.filter(position => !position.closedAt));
    } catch (error) {
      this.positions.set([]);
      if (!silent) {
        this.notifications.showError(error, 'Portfoy yuklenemedi.');
      }
    }
  }

  async loadClosed(force = false): Promise<void> {
    if (this.closedLoaded && !force) {
      return;
    }

    try {
      const positions = await firstValueFrom(this.api.list(true));
      this.positions.set(positions.filter(position => !position.closedAt));
      this.closedPositions.set(positions.filter(position => !!position.closedAt));
      this.closedLoaded = true;
    } catch (error) {
      this.closedPositions.set([]);
      this.notifications.showError(error, 'Kapali pozisyonlar yuklenemedi.');
    }
  }

  async loadExchangeRates(): Promise<void> {
    try {
      const rates = await firstValueFrom(this.marketApi.getExchangeRates());
      this.exchangeRates.set(rates);
    } catch {
      this.exchangeRates.set(null);
    }
  }

  async add(dto: CreatePortfolioPositionDto): Promise<void> {
    const currentUser = this.auth.currentUser();
    if (!currentUser) {
      return;
    }

    const previousPositions = this.positions();
    const optimistic: PortfolioPosition = {
      id: `temp-${Date.now()}`,
      userId: currentUser.id,
      coinId: dto.coinId,
      quantity: dto.quantity,
      avgBuyPrice: dto.avgBuyPrice,
      buyCurrency: dto.buyCurrency,
      notes: dto.notes ?? null,
      closedAt: null,
      closePrice: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.positions.set([optimistic, ...previousPositions]);

    try {
      const created = await firstValueFrom(this.api.add(dto));
      this.positions.set([
        created,
        ...previousPositions,
      ]);
    } catch (error) {
      this.positions.set(previousPositions);
      this.notifications.showError(error, 'Pozisyon eklenemedi.');
      throw error;
    }
  }

  async edit(id: string, dto: UpdatePortfolioPositionDto): Promise<void> {
    const previousPositions = this.positions();
    const target = previousPositions.find(position => position.id === id);

    if (!target) {
      return;
    }

    const optimistic: PortfolioPosition = {
      ...target,
      quantity: dto.quantity ?? target.quantity,
      avgBuyPrice: dto.avgBuyPrice ?? target.avgBuyPrice,
      notes: dto.notes ?? target.notes,
      updatedAt: new Date().toISOString(),
    };

    this.positions.set(
      previousPositions.map(position => position.id === id ? optimistic : position),
    );

    try {
      const updated = await firstValueFrom(this.api.update(id, dto));
      this.positions.set(
        previousPositions.map(position => position.id === id ? updated : position),
      );
    } catch (error) {
      this.positions.set(previousPositions);
      this.notifications.showError(error, 'Pozisyon guncellenemedi.');
      throw error;
    }
  }

  async close(id: string, dto: ClosePortfolioPositionDto): Promise<void> {
    const previousActive = this.positions();
    const previousClosed = this.closedPositions();
    const target = previousActive.find(position => position.id === id);

    if (!target) {
      return;
    }

    const optimisticClosed: PortfolioPosition = {
      ...target,
      closePrice: dto.closePrice,
      closedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.positions.set(previousActive.filter(position => position.id !== id));
    if (this.closedLoaded) {
      this.closedPositions.set([optimisticClosed, ...previousClosed]);
    }

    try {
      const closed = await firstValueFrom(this.api.close(id, dto));
      if (this.closedLoaded) {
        this.closedPositions.set([
          closed,
          ...previousClosed,
        ]);
      }
    } catch (error) {
      this.positions.set(previousActive);
      this.closedPositions.set(previousClosed);
      this.notifications.showError(error, 'Pozisyon kapatilamadi.');
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const previousActive = this.positions();
    const previousClosed = this.closedPositions();
    const isActive = previousActive.some(position => position.id === id);
    const isClosed = previousClosed.some(position => position.id === id);

    if (!isActive && !isClosed) {
      return;
    }

    if (isActive) {
      this.positions.set(previousActive.filter(position => position.id !== id));
    }

    if (isClosed) {
      this.closedPositions.set(previousClosed.filter(position => position.id !== id));
    }

    try {
      await firstValueFrom(this.api.remove(id));
    } catch (error) {
      this.positions.set(previousActive);
      this.closedPositions.set(previousClosed);
      this.notifications.showError(error, 'Pozisyon silinemedi.');
      throw error;
    }
  }

  private enrichPositions(positions: PortfolioPosition[]): PortfolioPositionView[] {
    const coinsById = new Map(this.topCoins().map(coin => [coin.id, coin]));
    const preferredCurrency = this.settings.currency();

    return positions.map(position => {
      const quantity = toNumber(position.quantity) ?? 0;
      const avgBuyPrice = toNumber(position.avgBuyPrice) ?? 0;
      const closePrice = toNumber(position.closePrice);
      const coin = coinsById.get(position.coinId) ?? null;
      const symbol = coin?.symbol?.toUpperCase() ?? position.coinId.slice(0, 6).toUpperCase();
      const label = coin?.name ?? position.coinId;
      const image = coin?.image ?? null;
      const avgBuyPriceConverted = this.convert(
        avgBuyPrice,
        position.buyCurrency,
        preferredCurrency,
      );
      const totalCost = quantity * avgBuyPriceConverted;
      const currentPriceConverted = coin
        ? this.convert(coin.current_price, 'USD', preferredCurrency)
        : null;
      const currentValue = currentPriceConverted !== null
        ? quantity * currentPriceConverted
        : totalCost;
      const pnl = currentValue - totalCost;
      const pnlPercent = totalCost ? (pnl / totalCost) * 100 : 0;
      const closePriceConverted = closePrice !== null
        ? this.convert(closePrice, position.buyCurrency, preferredCurrency)
        : null;
      const closeValue = closePriceConverted !== null
        ? quantity * closePriceConverted
        : null;

      return {
        position,
        coin,
        label,
        symbol,
        image,
        quantity,
        avgBuyPrice,
        avgBuyPriceConverted,
        totalCost,
        currentPriceConverted,
        currentValue,
        pnl,
        pnlPercent,
        closePrice,
        closePriceConverted,
        closeValue,
      };
    });
  }

  private convert(amount: number, from: Currency, to: Currency): number {
    if (!Number.isFinite(amount) || from === to) {
      return amount;
    }

    const rates = this.exchangeRates();
    const fromRate = rates?.rates[RATE_KEYS[from]]?.value;
    const toRate = rates?.rates[RATE_KEYS[to]]?.value;

    if (!fromRate || !toRate) {
      return amount;
    }

    return amount * (toRate / fromRate);
  }
}
