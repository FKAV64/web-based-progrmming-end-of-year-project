import { Test, TestingModule } from '@nestjs/testing';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { ConfigService } from '@nestjs/config';
import { type Request } from 'express';

describe('PushController', () => {
  let controller: PushController;
  let serviceMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    serviceMock = {
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PushController],
      providers: [
        { provide: PushService, useValue: serviceMock },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-vapid-public-key') },
        },
      ],
    }).compile();

    controller = module.get<PushController>(PushController);
  });

  it('getVapidPublicKey returns the key', () => {
    const result = controller.getVapidPublicKey();
    expect(result).toEqual({ publicKey: 'test-vapid-public-key' });
  });

  it('subscribe delegates to service', async () => {
    const req = { user: { userId: 'user-1' }, headers: { 'user-agent': 'jest' } } as unknown as Request;
    const dto = { endpoint: 'https://push.example.com/1', keys: { p256dh: 'k1', auth: 'a1' } };
    await controller.subscribe(req, dto);
    expect(serviceMock.subscribe).toHaveBeenCalledWith('user-1', dto, 'jest');
  });

  it('unsubscribe delegates to service', async () => {
    const req = { user: { userId: 'user-1' } } as unknown as Request;
    await controller.unsubscribe(req, { endpoint: 'https://push.example.com/1' });
    expect(serviceMock.unsubscribe).toHaveBeenCalledWith('user-1', 'https://push.example.com/1');
  });
});
