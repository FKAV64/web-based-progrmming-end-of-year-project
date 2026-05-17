import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { type PriceAlert } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { AuditService } from '../audit/audit.service';
import { CoingeckoService } from '../market/coingecko.service';
import { AlertsNotifyGateway } from './alerts-notify.gateway';

interface CoinGeckoRateEntry {
  value: number;
}

interface CoinGeckoRatesResponse {
  rates?: Record<string, CoinGeckoRateEntry>;
}

interface CoinSnapshot {
  id: string;
  current_price: number;
  [key: string]: any;
}

// Fallback rates for dev when CoinGecko is unreachable
const FALLBACK_RATES: Record<string, number> = {
  usd: 1,
  eur: 0.92,
  try: 38.5,
};

/**
 * Event-driven alert evaluation service.
 *
 * Listens for snapshot.updated events emitted by CoingeckoFetcherService every
 * 15 seconds. On each event it:
 *   1. Builds an O(1) price lookup map from the snapshot.
 *   2. Fetches exchange rates (cached 1 h) to support non-USD alerts.
 *   3. Loads all untriggered alerts in a single query.
 *   4. Evaluates ABOVE/BELOW conditions and collects matches.
 *   5. Uses an atomic compare-and-swap (updateMany with triggeredAt = null guard)
 *      to prevent duplicate triggering under concurrent workers.
 *   6. Sends a push notification and writes an audit entry for each triggered alert.
 *
 * @module AlertsEvaluatorService
 * @see CoingeckoFetcherService
 * @see PushService
 * @see AuditService
 */
@Injectable()
export class AlertsEvaluatorService {
  private readonly logger = new Logger('AlertsEvaluator');

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
    private readonly auditService: AuditService,
    private readonly coingeckoService: CoingeckoService,
    private readonly alertsNotifyGateway: AlertsNotifyGateway,
  ) {}

  /**
   * Evaluates all untriggered price alerts against the freshest market snapshot.
   *
   * Called asynchronously on every snapshot.updated event. Exchange rate
   * failures are recovered with built-in fallback rates so alert evaluation
   * continues even when CoinGecko is unreachable.
   *
   * @param snapshot - Array of coin market data from the latest CoinGecko fetch
   */
  @OnEvent('snapshot.updated', { async: true })
  async handleSnapshot(snapshot: CoinSnapshot[]) {
    // 1. Build a price map for O(1) lookup by coin id
    const priceByCoinId = new Map<string, number>(
      snapshot.map((c) => [c.id, c.current_price]),
    );

    // 2. Load exchange rates (cached 1h) — with fallback for dev
    let rates: Record<string, number>;
    try {
      // CoinGecko returns { rates: { usd: { value: 1 }, eur: { value: 0.92 }, ... } }
      const ratesResponse =
        (await this.coingeckoService.getExchangeRates()) as CoinGeckoRatesResponse;
      rates = {};
      if (ratesResponse?.rates) {
        for (const [currency, entry] of Object.entries(ratesResponse.rates)) {
          rates[currency] = entry.value;
        }
      } else {
        rates = FALLBACK_RATES;
      }
    } catch {
      this.logger.warn('Exchange rates unavailable — using fallback rates');
      rates = FALLBACK_RATES;
    }

    // 3. Load all active alerts in one query
    const alerts = await this.prisma.priceAlert.findMany({
      where: { triggeredAt: null },
    });

    if (alerts.length === 0) return;

    // 4. Evaluate each alert
    const triggered: {
      alert: PriceAlert;
      priceUsd: number;
      priceInAlertCurrency: number;
    }[] = [];
    for (const alert of alerts) {
      const priceUsd = priceByCoinId.get(alert.coinId);
      if (priceUsd === undefined) continue; // coin not in snapshot — silently skip

      const price = this.convert(priceUsd, 'USD', alert.currency, rates);

      const fired =
        (alert.condition === 'ABOVE' && price >= Number(alert.targetPrice)) ||
        (alert.condition === 'BELOW' && price <= Number(alert.targetPrice));

      if (fired)
        triggered.push({ alert, priceUsd, priceInAlertCurrency: price });
    }

    // 5. For each triggered alert: atomic CAS update
    for (const t of triggered) {
      const result = await this.prisma.priceAlert.updateMany({
        where: { id: t.alert.id, triggeredAt: null },
        data: { triggeredAt: new Date() },
      });
      if (result.count === 0) continue; // someone else triggered it first

      const triggeredAt = new Date();
      this.logger.log(
        `Alert ${t.alert.id} triggered: ${t.alert.coinId} ${t.alert.condition} ${t.alert.targetPrice.toString()} ${t.alert.currency}`,
      );

      // Push real-time event to all open browser sessions for this user
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

  private convert(
    priceUsd: number,
    _from: string,
    to: string,
    rates: Record<string, number>,
  ): number {
    // CoinGecko rates are all relative to BTC; our prices are in USD.
    // For simplicity: if to === 'USD' return as-is. Otherwise use the rate.
    if (to === 'USD') return priceUsd;

    const toRate = rates[to.toLowerCase()];
    const usdRate = rates['usd'];
    if (!toRate || !usdRate) return priceUsd;

    return priceUsd * (toRate / usdRate);
  }
}
