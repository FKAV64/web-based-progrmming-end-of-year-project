import { Test, TestingModule } from '@nestjs/testing';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { type Request } from 'express';

describe('AlertsController', () => {
  let controller: AlertsController;
  let serviceMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    serviceMock = {
      findAll: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertsController],
      providers: [{ provide: AlertsService, useValue: serviceMock }],
    }).compile();

    controller = module.get<AlertsController>(AlertsController);
  });

  it('findAll delegates to service', async () => {
    const req = { user: { userId: 'user-1' } } as unknown as Request;
    await controller.findAll(req, 'false');
    expect(serviceMock.findAll).toHaveBeenCalledWith('user-1', false);
  });
});
