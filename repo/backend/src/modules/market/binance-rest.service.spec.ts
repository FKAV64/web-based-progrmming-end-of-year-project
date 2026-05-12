import { Test, TestingModule } from '@nestjs/testing';
import { BinanceRestService } from './binance-rest.service';
import { BadRequestException } from '@nestjs/common';

describe('BinanceRestService', () => {
  let service: BinanceRestService;
  let globalFetchMock: jest.Mock;

  beforeEach(async () => {
    globalFetchMock = jest.fn();
    global.fetch = globalFetchMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [BinanceRestService],
    }).compile();

    service = module.get<BinanceRestService>(BinanceRestService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should map Binance response correctly', async () => {
    globalFetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          [
            1609459200000,
            '28923.63000000',
            '29031.34000000',
            '28690.17000000',
            '28995.13000000',
          ],
        ]),
    });

    const result = await service.getKlines('BTCUSDT', '1h', 1);
    expect(result).toEqual([
      {
        time: 1609459200000,
        open: 28923.63,
        high: 29031.34,
        low: 28690.17,
        close: 28995.13,
      },
    ]);
  });

  it('should throw 400 on invalid interval', async () => {
    await expect(service.getKlines('BTCUSDT', '7m')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw 400 on limit out of bounds', async () => {
    await expect(service.getKlines('BTCUSDT', '1h', 1001)).rejects.toThrow(
      BadRequestException,
    );
  });
});
