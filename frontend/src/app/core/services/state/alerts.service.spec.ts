import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { AlertsService } from './alerts.service';
import { AuthService } from './auth.service';
import { NotificationService } from '../notification.service';
import { AlertsApiService } from '../api/alerts.api';
import { PriceAlert } from '../../models/alerts.model';

describe('AlertsService', () => {
  let service: AlertsService;
  let apiMock: jest.Mocked<AlertsApiService>;

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

  const activeAlert: PriceAlert = {
    id: 'alert-active',
    userId: 'user-1',
    coinId: 'bitcoin',
    condition: 'ABOVE',
    targetPrice: '65000',
    currency: 'USD',
    triggeredAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const triggeredAlert: PriceAlert = {
    id: 'alert-triggered',
    userId: 'user-1',
    coinId: 'ethereum',
    condition: 'BELOW',
    targetPrice: '2500',
    currency: 'EUR',
    triggeredAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    apiMock = {
      list: jest.fn((includeTriggered?: boolean) =>
        of(includeTriggered ? [activeAlert, triggeredAlert] : [activeAlert]),
      ),
      add: jest.fn(),
      remove: jest.fn(),
    } as any;

    TestBed.configureTestingModule({
      providers: [
        AlertsService,
        { provide: AuthService, useValue: authMock },
        { provide: AlertsApiService, useValue: apiMock },
        { provide: NotificationService, useValue: { showError: jest.fn() } },
      ],
    });

    service = TestBed.inject(AlertsService);
    await Promise.resolve();
  });

  it('loads active alerts by default and triggered alerts on demand', async () => {
    expect(service.active()).toEqual([activeAlert]);
    expect(service.triggered()).toEqual([]);

    await service.loadTriggered();

    expect(apiMock.list).toHaveBeenCalledWith(false);
    expect(apiMock.list).toHaveBeenCalledWith(true);
    expect(service.triggered()).toEqual([triggeredAlert]);
  });
});
