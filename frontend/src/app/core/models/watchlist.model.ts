export interface WatchlistItem {
  id: string;
  userId: string;
  coinId: string;
  addedAt: string;
}

export interface CreateWatchlistItemDto {
  coinId: string;
}
