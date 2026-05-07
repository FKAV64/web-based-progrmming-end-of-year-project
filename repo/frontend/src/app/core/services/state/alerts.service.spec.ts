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
  let notificationsMock: { showError: jest.Mock; info: jest.Mock };

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
    jest.useFakeTimers();

    apiMock = {
      list: jest.fn((includeTriggered?: boolean) =>
        of(includeTriggered ? [activeAlert, triggeredAlert] : [activeAlert]),
      ),
      add: jest.fn(),
      remove: jest.fn(),
    } as any;

    notificationsMock = {
      showError: jest.fn(),
      info: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AlertsService,
        { provide: AuthService, useValue: authMock },
        { provide: AlertsApiService, useValue: apiMock },
        { provide: NotificationService, useValue: notificationsMock },
      ],
    });

    service = TestBed.inject(AlertsService);
    await Promise.resolve();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads active alerts by default and triggered alerts on demand', async () => {
    await service.loadActive(true);

    expect(service.active()).toEqual([activeAlert]);
    expect(service.triggered()).toEqual([]);

    await service.loadTriggered();

    expect(apiMock.list).toHaveBeenCalledWith(false);
    expect(apiMock.list).toHaveBeenCalledWith(true);
    expect(service.triggered()).toEqual([triggeredAlert]);
  });

  it('shows an in-app toast for newly triggered alerts after the baseline snapshot is seeded', () => {
    const internal = service as any;

    internal.applyAlertSnapshot([activeAlert], false);
    internal.applyAlertSnapshot([activeAlert, triggeredAlert], true);

    expect(notificationsMock.info).toHaveBeenCalledWith(
      'Alarm tetiklendi: ETHEREUM hedef 2500 EUR',
    );
    expect(service.triggered()).toEqual([triggeredAlert]);
  });
});
