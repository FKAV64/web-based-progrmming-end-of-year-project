import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { AuditService } from '../audit/audit.service';
import { CoingeckoService } from '../market/coingecko.service';

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

@Injectable()
export class AlertsEvaluatorService {
  private readonly logger = new Logger('AlertsEvaluator');

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
    private readonly auditService: AuditService,
    private readonly coingeckoService: CoingeckoService,
  ) {}

  @OnEvent('snapshot.updated', { async: true })
  async handleSnapshot(snapshot: CoinSnapshot[]) {
    // 1. Build a price map for O(1) lookup by coin id
    const priceByCoinId = new Map<string, number>(
      snapshot.map((c) => [c.id, c.current_price]),
    );

    // 2. Load exchange rates (cached 1h) — with fallback for dev
    let rates: Record<string, number>;
    try {
      const ratesResponse = await this.coingeckoService.getExchangeRates();
      // CoinGecko returns { rates: { usd: { value: 1 }, eur: { value: 0.92 }, ... } }
      rates = {};
      if (ratesResponse?.rates) {
        for (const [currency, data] of Object.entries(ratesResponse.rates)) {
          rates[currency] = (data as any).value;
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
    const triggered: { alert: any; priceUsd: number; priceInAlertCurrency: number }[] = [];
    for (const alert of alerts) {
      const priceUsd = priceByCoinId.get(alert.coinId);
      if (priceUsd === undefined) continue; // coin not in snapshot — silently skip

      const price = this.convert(priceUsd, 'USD', alert.currency, rates);

      const fired =
        (alert.condition === 'ABOVE' && price >= Number(alert.targetPrice)) ||
        (alert.condition === 'BELOW' && price <= Number(alert.targetPrice));

      if (fired) triggered.push({ alert, priceUsd, priceInAlertCurrency: price });
    }

    // 5. For each triggered alert: atomic CAS update
    for (const t of triggered) {
      const result = await this.prisma.priceAlert.updateMany({
        where: { id: t.alert.id, triggeredAt: null },
        data: { triggeredAt: new Date() },
      });
      if (result.count === 0) continue; // someone else triggered it first

      this.logger.log(`Alert ${t.alert.id} triggered: ${t.alert.coinId} ${t.alert.condition} ${t.alert.targetPrice} ${t.alert.currency}`);

      await this.pushService.send(t.alert.userId, {
        title: `${t.alert.coinId.toUpperCase()} ${t.alert.condition.toLowerCase()} ${t.alert.targetPrice} ${t.alert.currency}`,
        body: `Now at ${t.priceInAlertCurrency.toFixed(2)} ${t.alert.currency}`,
      });

      await this.auditService.log('alert.triggered', t.alert.userId, undefined, undefined, {
        alertId: t.alert.id,
        coinId: t.alert.coinId,
        condition: t.alert.condition,
        targetPrice: t.alert.targetPrice.toString(),
        currentPrice: t.priceInAlertCurrency.toFixed(2),
        currency: t.alert.currency,
      });
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
