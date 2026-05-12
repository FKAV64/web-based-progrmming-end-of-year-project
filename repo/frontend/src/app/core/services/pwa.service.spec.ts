import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { PwaService } from './pwa.service';

describe('PwaService', () => {
  let service: PwaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
    service = TestBed.inject(PwaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('canInstall starts as false', () => {
    expect(service.canInstall()).toBe(false);
  });

  it('isOnline starts as true in JSDOM (navigator.onLine defaults to true)', () => {
    expect(service.isOnline()).toBe(true);
  });

  it('beforeinstallprompt event sets canInstall to true', () => {
    const mockPrompt = {
      preventDefault: jest.fn(),
      prompt: jest.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    };
    const event = Object.assign(new Event('beforeinstallprompt'), mockPrompt);
    window.dispatchEvent(event);
    expect(service.canInstall()).toBe(true);
  });

  it('appinstalled event sets canInstall back to false', () => {
    const mockPrompt = {
      preventDefault: jest.fn(),
      prompt: jest.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    };
    const promptEvent = Object.assign(new Event('beforeinstallprompt'), mockPrompt);
    window.dispatchEvent(promptEvent);
    expect(service.canInstall()).toBe(true);

    window.dispatchEvent(new Event('appinstalled'));
    expect(service.canInstall()).toBe(false);
  });

  it('offline event sets isOnline to false', () => {
    window.dispatchEvent(new Event('offline'));
    expect(service.isOnline()).toBe(false);
  });

  it('online event sets isOnline back to true', () => {
    window.dispatchEvent(new Event('offline'));
    expect(service.isOnline()).toBe(false);
    window.dispatchEvent(new Event('online'));
    expect(service.isOnline()).toBe(true);
  });
});
