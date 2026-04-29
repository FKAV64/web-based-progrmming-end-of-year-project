import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { WatchlistService } from './watchlist.service';
import { AuthService } from './auth.service';
import { NotificationService } from '../notification.service';
import { WatchlistApiService } from '../api/watchlist.api';
import { WatchlistItem } from '../../models/watchlist.model';

describe('WatchlistService', () => {
  let service: WatchlistService;
  let apiMock: jest.Mocked<WatchlistApiService>;
  let notificationsMock: { showError: jest.Mock };

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

  beforeEach(async () => {
    apiMock = {
      list: jest.fn().mockReturnValue(of([])),
      add: jest.fn(),
      remove: jest.fn(),
    } as any;

    notificationsMock = {
      showError: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        WatchlistService,
        { provide: AuthService, useValue: authMock },
        { provide: WatchlistApiService, useValue: apiMock },
        { provide: NotificationService, useValue: notificationsMock },
      ],
    });

    service = TestBed.inject(WatchlistService);
    await Promise.resolve();
  });

  it('rolls back optimistic add when the API call fails', async () => {
    const previousItem: WatchlistItem = {
      id: 'watch-eth',
      userId: 'user-1',
      coinId: 'ethereum',
      addedAt: new Date().toISOString(),
    };
    service.items.set([previousItem]);

    apiMock.add.mockReturnValue(
      throwError(() => ({ error: { message: 'Coin is already in the watchlist' } })),
    );

    await expect(service.add('bitcoin')).rejects.toEqual(
      expect.objectContaining({
        error: { message: 'Coin is already in the watchlist' },
      }),
    );

    expect(service.items()).toEqual([previousItem]);
    expect(notificationsMock.showError).toHaveBeenCalledWith(
      expect.anything(),
      'Coin izleme listesine eklenemedi.',
    );
  });
});
