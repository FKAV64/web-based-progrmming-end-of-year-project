import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { type Request } from 'express';

describe('PortfolioController', () => {
  let controller: PortfolioController;
  let serviceMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    serviceMock = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      close: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortfolioController],
      providers: [{ provide: PortfolioService, useValue: serviceMock }],
    }).compile();

    controller = module.get<PortfolioController>(PortfolioController);
  });

  it('findAll delegates to service', async () => {
    const req = { user: { userId: 'user-1' } } as unknown as Request;
    await controller.findAll(req, 'true');
    expect(serviceMock.findAll).toHaveBeenCalledWith('user-1', true);
  });
});
