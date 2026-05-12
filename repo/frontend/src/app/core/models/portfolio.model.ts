import { Currency } from './user.model';

export interface PortfolioPosition {
  id: string;
  userId: string;
  coinId: string;
  quantity: string;
  avgBuyPrice: string;
  buyCurrency: Currency;
  notes: string | null;
  closedAt: string | null;
  closePrice: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePortfolioPositionDto {
  coinId: string;
  quantity: string;
  avgBuyPrice: string;
  buyCurrency: Currency;
  notes?: string;
}

export interface UpdatePortfolioPositionDto {
  quantity?: string;
  avgBuyPrice?: string;
  notes?: string;
}

export interface ClosePortfolioPositionDto {
  closePrice: string;
}
