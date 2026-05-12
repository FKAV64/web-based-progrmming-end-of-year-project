import { Test, TestingModule } from '@nestjs/testing';
import { PushService } from './push.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

// Mock web-push at module level
const mockSendNotification = jest.fn();
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: (...args: any[]) => mockSendNotification(...args),
}));

describe('PushService', () => {
  let service: PushService;
  let prismaMock: Record<string, any>;

  beforeEach(async () => {
    prismaMock = {
      pushSubscription: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const env: Record<string, string> = {
                VAPID_PUBLIC_KEY: 'test-public-key',
                VAPID_PRIVATE_KEY: 'test-private-key',
                VAPID_SUBJECT: 'mailto:test@example.com',
              };
              return env[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PushService>(PushService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('send with no subscriptions does nothing', async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([]);

    await service.send('user-1', { title: 'Test', body: 'Hello' });

    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it('send calls webpush for each subscription', async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([
      {
        id: 'sub-1',
        endpoint: 'https://push.example.com/1',
        p256dhKey: 'key1',
        authKey: 'auth1',
      },
    ]);
    mockSendNotification.mockResolvedValue({});

    await service.send('user-1', { title: 'Test', body: 'Hello' });

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(mockSendNotification).toHaveBeenCalledWith(
      {
        endpoint: 'https://push.example.com/1',
        keys: { p256dh: 'key1', auth: 'auth1' },
      },
      JSON.stringify({ title: 'Test', body: 'Hello' }),
    );
  });

  it('410 response deletes the subscription row', async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([
      {
        id: 'sub-1',
        endpoint: 'https://push.example.com/1',
        p256dhKey: 'key1',
        authKey: 'auth1',
      },
    ]);
    mockSendNotification.mockRejectedValue({
      statusCode: 410,
      message: 'Gone',
    });

    await service.send('user-1', { title: 'Test', body: 'Hello' });

    expect(prismaMock.pushSubscription.delete).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
    });
  });

  it('404 response deletes the subscription row', async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([
      {
        id: 'sub-1',
        endpoint: 'https://push.example.com/1',
        p256dhKey: 'key1',
        authKey: 'auth1',
      },
    ]);
    mockSendNotification.mockRejectedValue({
      statusCode: 404,
      message: 'Not Found',
    });

    await service.send('user-1', { title: 'Test', body: 'Hello' });

    expect(prismaMock.pushSubscription.delete).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
    });
  });

  it('other errors are logged but do not delete subscription', async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([
      {
        id: 'sub-1',
        endpoint: 'https://push.example.com/1',
        p256dhKey: 'key1',
        authKey: 'auth1',
      },
    ]);
    mockSendNotification.mockRejectedValue({
      statusCode: 500,
      message: 'Server Error',
    });

    await service.send('user-1', { title: 'Test', body: 'Hello' });

    expect(prismaMock.pushSubscription.delete).not.toHaveBeenCalled();
  });
});
