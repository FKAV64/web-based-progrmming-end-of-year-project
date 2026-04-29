import { Currency } from './user.model';

export type AlertCondition = 'ABOVE' | 'BELOW';

export interface PriceAlert {
  id: string;
  userId: string;
  coinId: string;
  condition: AlertCondition;
  targetPrice: string;
  currency: Currency;
  triggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertDto {
  coinId: string;
  condition: AlertCondition;
  targetPrice: string;
  currency: Currency;
}
