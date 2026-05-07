import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { SettingsService } from './settings.service';
import { SettingsApiService } from '../api/settings.api';
import { AuthService } from './auth.service';
import { UserSettings } from '../../models/user.model';

describe('SettingsService', () => {
  let service: SettingsService;
  let apiMock: jest.Mocked<SettingsApiService>;
  const authMock = {
    currentUser: signal<{ settings: UserSettings | null } | null>(null),
  };

  const seededSettings: UserSettings = {
    theme: 'DARK',
    currency: 'EUR',
    locale: 'EN',
    notificationsEnabled: false,
  };

  beforeEach(() => {
    apiMock = {
      get: jest.fn().mockReturnValue(of(seededSettings)),
      update: jest.fn().mockReturnValue(of(seededSettings)),
    } as any;

    TestBed.configureTestingModule({
      providers: [
        SettingsService,
        { provide: SettingsApiService, useValue: apiMock },
        { provide: AuthService, useValue: authMock },
      ],
    });

    service = TestBed.inject(SettingsService);
  });

  it('exposes default signals before load()', () => {
    expect(service.theme()).toBe('SYSTEM');
    expect(service.currency()).toBe('USD');
    expect(service.locale()).toBe('TR');
    expect(service.notificationsEnabled()).toBe(true);
  });

  it('load() pulls settings from the API and applies them to signals', async () => {
    await service.load();
    expect(apiMock.get).toHaveBeenCalled();
    expect(service.theme()).toBe('DARK');
    expect(service.currency()).toBe('EUR');
    expect(service.locale()).toBe('EN');
    expect(service.notificationsEnabled()).toBe(false);
  });

  it('setTheme updates the signal', () => {
    service.setTheme('LIGHT');
    expect(service.theme()).toBe('LIGHT');
  });

  it('setCurrency updates the signal', () => {
    service.setCurrency('TRY');
    expect(service.currency()).toBe('TRY');
  });

  it('setLocale updates the signal', () => {
    service.setLocale('EN');
    expect(service.locale()).toBe('EN');
  });

  it('applySettings populates all four signals from a UserSettings payload', () => {
    service.applySettings(seededSettings);
    expect(service.theme()).toBe('DARK');
    expect(service.currency()).toBe('EUR');
    expect(service.locale()).toBe('EN');
    expect(service.notificationsEnabled()).toBe(false);
  });
});
