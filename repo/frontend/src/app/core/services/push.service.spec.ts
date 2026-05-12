import { TestBed } from '@angular/core/testing';
import { PushService } from './push.service';
import { PushApi } from './api/push.api';

function makeKeyBytes(value: string): ArrayBuffer {
  return Uint8Array.from(value.split('').map(char => char.charCodeAt(0))).buffer;
}

function makeSubscription(endpoint: string) {
  return {
    endpoint,
    getKey: jest.fn((keyName: string) => {
      if (keyName === 'p256dh') {
        return makeKeyBytes('p256dh-key');
      }

      if (keyName === 'auth') {
        return makeKeyBytes('auth-key');
      }

      return null;
    }),
    toJSON: () => ({ endpoint, keys: {} }),
    unsubscribe: jest.fn(),
  } as unknown as PushSubscription;
}

function makeSwRegistration(subscription: PushSubscription | null = null) {
  return {
    pushManager: {
      getSubscription: jest.fn().mockResolvedValue(subscription),
      subscribe: jest.fn(),
    },
  } as unknown as ServiceWorkerRegistration;
}

describe('PushService', () => {
  let service: PushService;
  let apiMock: jest.Mocked<PushApi>;

  beforeEach(() => {
    apiMock = {
      getVapidPublicKey: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    } as any;

    TestBed.configureTestingModule({
      providers: [
        PushService,
        { provide: PushApi, useValue: apiMock },
      ],
    });

    service = TestBed.inject(PushService);
  });

  describe('requestPermission', () => {
    it('sets state to granted when browser grants permission', async () => {
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'default', requestPermission: jest.fn().mockResolvedValue('granted') },
        configurable: true,
        writable: true,
      });
      service.state.set('default');

      await service.requestPermission();

      expect(service.state()).toBe('granted');
    });

    it('sets state to denied when browser denies permission', async () => {
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'default', requestPermission: jest.fn().mockResolvedValue('denied') },
        configurable: true,
        writable: true,
      });
      service.state.set('default');

      await service.requestPermission();

      expect(service.state()).toBe('denied');
    });

    it('does nothing when state is already granted', async () => {
      const requestPermission = jest.fn();
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted', requestPermission },
        configurable: true,
        writable: true,
      });
      service.state.set('granted');

      await service.requestPermission();

      expect(requestPermission).not.toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('calls API subscribe and sets state to granted', async () => {
      const fakeSubscription = makeSubscription('https://push.example.com/123');

      const registration = makeSwRegistration(null);
      (registration.pushManager.subscribe as jest.Mock).mockResolvedValue(fakeSubscription);

      Object.defineProperty(navigator, 'serviceWorker', {
        value: { ready: Promise.resolve(registration) },
        configurable: true,
      });
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted', requestPermission: jest.fn().mockResolvedValue('granted') },
        configurable: true,
        writable: true,
      });

      apiMock.getVapidPublicKey.mockResolvedValue('dGVzdC12YXBpZC1rZXk'); // base64
      apiMock.subscribe.mockResolvedValue({ ok: true });

      await service.subscribe();

      expect(apiMock.getVapidPublicKey).toHaveBeenCalled();
      expect(apiMock.subscribe).toHaveBeenCalledWith({
        endpoint: 'https://push.example.com/123',
        keys: {
          p256dh: btoa('p256dh-key'),
          auth: btoa('auth-key'),
        },
      });
      expect(service.state()).toBe('granted');
    });

    it('re-sends an existing subscription to the backend', async () => {
      const existingSubscription = makeSubscription('https://push.example.com/existing');

      const registration = makeSwRegistration(existingSubscription);
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { ready: Promise.resolve(registration) },
        configurable: true,
      });
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted', requestPermission: jest.fn().mockResolvedValue('granted') },
        configurable: true,
        writable: true,
      });

      apiMock.getVapidPublicKey.mockResolvedValue('dGVzdA');
      apiMock.subscribe.mockResolvedValue({ ok: true });

      await service.subscribe();

      expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
      expect(apiMock.subscribe).toHaveBeenCalledWith({
        endpoint: 'https://push.example.com/existing',
        keys: {
          p256dh: btoa('p256dh-key'),
          auth: btoa('auth-key'),
        },
      });
    });
  });

  describe('unsubscribe', () => {
    it('calls unsubscribe on the subscription and the API, then resets state to default', async () => {
      const fakeSubscription = {
        endpoint: 'https://push.example.com/123',
        unsubscribe: jest.fn().mockResolvedValue(true),
      } as unknown as PushSubscription;

      const registration = makeSwRegistration(fakeSubscription);
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { ready: Promise.resolve(registration) },
        configurable: true,
      });

      apiMock.unsubscribe.mockResolvedValue(undefined);
      service.state.set('granted');

      await service.unsubscribe();

      expect(apiMock.unsubscribe).toHaveBeenCalledWith('https://push.example.com/123');
      expect(fakeSubscription.unsubscribe).toHaveBeenCalled();
      expect(service.state()).toBe('default');
    });
  });
});
