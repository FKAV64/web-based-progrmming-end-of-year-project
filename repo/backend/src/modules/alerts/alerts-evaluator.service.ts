import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { type PriceAlert } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { AuditService } from '../audit/audit.service';
import { CoingeckoService } from '../market/coingecko.service';
import { BinanceProxyGateway } from '../market/binance-proxy.gateway';
import { AlertsNotifyGateway } from './alerts-notify.gateway';

interface CoinGeckoRateEntry {
  value: number;
}

interface CoinGeckoRatesResponse {
  rates?: Record<string, CoinGeckoRateEntry>;
}

interface CoinSnapshot {
  id: string;
  symbol: string;
  current_price: number;
  [key: string]: unknown;
}

interface BinanceTick {
  symbol: string;
  price: number;
  timestamp: number;
}

// Fallback rates for dev when CoinGecko is unreachable
const FALLBACK_RATES: Record<string, number> = {
  usd: 1,
  eur: 0.92,
  try: 38.5,
};

@Injectable()
export class AlertsEvaluatorService implements OnApplicationBootstrap {
  private readonly logger = new Logger('AlertsEvaluator');

  // In-memory alarm cache — avoids a DB read on every Binance tick.
  private readonly alertsByCoinId = new Map<string, PriceAlert[]>();
  private readonly alertCoinMap = new Map<string, string>(); // alertId → coinId

  // Symbol translation maps built from the CoinGecko snapshot.
  private readonly coinIdToWsSymbol = new Map<string, string>(); // bitcoin → BTCUSDT
  private readonly wsSymbolToCoinId = new Map<string, string>(); // BTCUSDT → bitcoin

  // Exchange rates refreshed every snapshot cycle (CoinGecko caches for 1 h).
  private lastRates: Record<string, number> = FALLBACK_RATES;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
    private readonly auditService: AuditService,
    private readonly coingeckoService: CoingeckoService,
    private readonly alertsNotifyGateway: AlertsNotifyGateway,
    private readonly binanceGateway: BinanceProxyGateway,
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async onApplicationBootstrap() {
    const alerts = await this.prisma.priceAlert.findMany({
      where: { triggeredAt: null },
    });
    for (const alert of alerts) {
      this.insertIntoCache(alert);
    }
    this.logger.log(`Alarm cache warmed: ${alerts.length} alert(s)`);
  }

  // ── Snapshot handler — symbol map refresh only ─────────────────────────────

  /**
   * Refreshes the CoinGecko-ID ↔ Binance-symbol translation maps and the
   * cached exchange rates. No longer queries the DB or evaluates conditions —
   * that responsibility now belongs to handleBinanceTick.
   */
  @OnEvent('snapshot.updated', { async: true })
  async handleSnapshot(snapshot: CoinSnapshot[]) {
    // 1. Rebuild symbol translation maps from the snapshot.
    for (const coin of snapshot) {
      if (!coin.symbol) continue;
      const wsSymbol = `${coin.symbol.toUpperCase()}USDT`;
      this.coinIdToWsSymbol.set(coin.id, wsSymbol);
      this.wsSymbolToCoinId.set(wsSymbol, coin.id);
    }

    // 2. Refresh exchange rates (CoinGecko caches the response for 1 h).
    try {
      const ratesResponse =
        (await this.coingeckoService.getExchangeRates()) as CoinGeckoRatesResponse;
      const rates: Record<string, number> = {};
      if (ratesResponse?.rates) {
        for (const [currency, entry] of Object.entries(ratesResponse.rates)) {
          rates[currency] = entry.value;
        }
        this.lastRates = rates;
      }
    } catch {
      this.logger.warn('Exchange rates unavailable — keeping last rates');
    }

    // 3. Subscribe to Binance streams for every cached coin.
    this.syncBinanceSubscriptions();
  }

  // ── Binance tick handler — fast evaluation path ────────────────────────────

  /**
   * Evaluates cached alerts against each Binance tick (~1 s latency).
   *
   * Uses an in-memory Map for O(1) lookup per symbol. An atomic DB CAS
   * (updateMany WHERE triggeredAt IS NULL) prevents duplicate notifications
   * even if two ticks arrive close together.
   */
  @OnEvent('binance.tick')
  async handleBinanceTick(tick: BinanceTick) {
    const coinId = this.wsSymbolToCoinId.get(tick.symbol);
    if (!coinId) return;

    const alerts = this.alertsByCoinId.get(coinId);
    if (!alerts?.length) return;

    const triggered: { alert: PriceAlert; priceInAlertCurrency: number }[] = [];
    for (const alert of alerts) {
      const price = this.convert(tick.price, 'USD', alert.currency, this.lastRates);
      const fired =
        (alert.condition === 'ABOVE' && price >= Number(alert.targetPrice)) ||
        (alert.condition === 'BELOW' && price <= Number(alert.targetPrice));
      if (fired) triggered.push({ alert, priceInAlertCurrency: price });
    }

    for (const t of triggered) {
      const result = await this.prisma.priceAlert.updateMany({
        where: { id: t.alert.id, triggeredAt: null },
        data: { triggeredAt: new Date() },
      });
      if (result.count === 0) continue; // CAS guard — another event won the race

      const triggeredAt = new Date();
      this.removeFromCache(t.alert.id, coinId);

      this.logger.log(
        `Alert ${t.alert.id} triggered: ${t.alert.coinId} ${t.alert.condition} ${t.alert.targetPrice.toString()} ${t.alert.currency}`,
      );

      this.alertsNotifyGateway.notifyUser(t.alert.userId, {
        id: t.alert.id,
        coinId: t.alert.coinId,
        condition: t.alert.condition,
        targetPrice: t.alert.targetPrice.toString(),
        currency: t.alert.currency,
        triggeredAt: triggeredAt.toISOString(),
        currentPrice: t.priceInAlertCurrency.toFixed(2),
      });

      await this.pushService.send(t.alert.userId, {
        title: `${t.alert.coinId.toUpperCase()} ${t.alert.condition.toLowerCase()} ${t.alert.targetPrice.toString()} ${t.alert.currency}`,
        body: `Now at ${t.priceInAlertCurrency.toFixed(2)} ${t.alert.currency}`,
      });

      await this.auditService.log(
        'alert.triggered',
        t.alert.userId,
        undefined,
        undefined,
        {
          alertId: t.alert.id,
          coinId: t.alert.coinId,
          condition: t.alert.condition,
          targetPrice: t.alert.targetPrice.toString(),
          currentPrice: t.priceInAlertCurrency.toFixed(2),
          currency: t.alert.currency,
        },
      );
    }
  }

  // ── Public cache-mutation API (called by AlertsService) ────────────────────

  addToCache(alert: PriceAlert): void {
    this.insertIntoCache(alert);
    const wsSymbol = this.coinIdToWsSymbol.get(alert.coinId);
    if (wsSymbol) {
      this.binanceGateway.addServerSubscription(`${wsSymbol.toLowerCase()}@miniTicker`);
    }
  }

  removeFromCache(alertId: string, coinId: string): void {
    const list = this.alertsByCoinId.get(coinId);
    if (list) {
      const updated = list.filter((a) => a.id !== alertId);
      if (updated.length) {
        this.alertsByCoinId.set(coinId, updated);
      } else {
        this.alertsByCoinId.delete(coinId);
      }
    }
    this.alertCoinMap.delete(alertId);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private insertIntoCache(alert: PriceAlert): void {
    const existing = this.alertsByCoinId.get(alert.coinId) ?? [];
    this.alertsByCoinId.set(alert.coinId, [...existing, alert]);
    this.alertCoinMap.set(alert.id, alert.coinId);
  }

  private syncBinanceSubscriptions(): void {
    for (const coinId of this.alertsByCoinId.keys()) {
      const wsSymbol = this.coinIdToWsSymbol.get(coinId);
      if (wsSymbol) {
        this.binanceGateway.addServerSubscription(`${wsSymbol.toLowerCase()}@miniTicker`);
      }
    }
  }

  private convert(
    priceUsd: number,
    _from: string,
    to: string,
    rates: Record<string, number>,
  ): number {
    if (to === 'USD') return priceUsd;
    const toRate = rates[to.toLowerCase()];
    const usdRate = rates['usd'];
    if (!toRate || !usdRate) return priceUsd;
    return priceUsd * (toRate / usdRate);
  }
}
