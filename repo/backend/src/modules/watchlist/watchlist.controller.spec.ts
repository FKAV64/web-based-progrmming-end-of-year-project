import { Test, TestingModule } from '@nestjs/testing';
import { WatchlistController } from './watchlist.controller';
import { WatchlistService } from './watchlist.service';
import { type Request } from 'express';

describe('WatchlistController', () => {
  let controller: WatchlistController;
  let serviceMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    serviceMock = {
      findAll: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WatchlistController],
      providers: [{ provide: WatchlistService, useValue: serviceMock }],
    }).compile();

    controller = module.get<WatchlistController>(WatchlistController);
  });

  it('findAll delegates to service', async () => {
    serviceMock.findAll.mockResolvedValue([{ coinId: 'bitcoin' }]);
    const req = { user: { userId: 'user-1' } } as unknown as Request;
    const result = await controller.findAll(req);
    expect(result).toEqual([{ coinId: 'bitcoin' }]);
    expect(serviceMock.findAll).toHaveBeenCalledWith('user-1');
  });

  it('create delegates to service', async () => {
    serviceMock.create.mockResolvedValue({ coinId: 'bitcoin' });
    const req = { user: { userId: 'user-1' } } as unknown as Request;
    const result = await controller.create(req, { coinId: 'bitcoin' });
    expect(result).toEqual({ coinId: 'bitcoin' });
    expect(serviceMock.create).toHaveBeenCalledWith('user-1', {
      coinId: 'bitcoin',
    });
  });

  it('remove delegates to service', async () => {
    const req = { user: { userId: 'user-1' } } as unknown as Request;
    await controller.remove(req, 'bitcoin');
    expect(serviceMock.remove).toHaveBeenCalledWith('user-1', 'bitcoin');
  });
});
