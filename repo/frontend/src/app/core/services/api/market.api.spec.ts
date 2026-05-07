import { TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { HttpTestingController, HttpClientTestingModule } from '@angular/common/http/testing';
import { MarketApiService } from './market.api';
import { environment } from '../../../../environments/environment';
import { CoinSnapshot } from '../../models/market.model';

describe('MarketApiService', () => {
  let service: MarketApiService;
  let httpMock: HttpTestingController;

  const mockCoin: CoinSnapshot = {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Bitcoin',
    image: 'url',
    current_price: 50000,
    market_cap: 1000000,
    market_cap_rank: 1,
    total_volume: 50000,
    high_24h: 51000,
    low_24h: 49000,
    price_change_24h: 1000,
    price_change_percentage_24h: 2,
    market_cap_change_24h: 1000,
    market_cap_change_percentage_24h: 2,
    circulating_supply: 19000000,
    ath: 69000,
    ath_change_percentage: -20,
    ath_date: 'date',
    atl: 100,
    atl_change_percentage: 50000,
    atl_date: 'date',
    last_updated: 'date'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MarketApiService]
    });
    service = TestBed.inject(MarketApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should map getTop() response correctly', () => {
    service.getTop().subscribe(coins => {
      expect(coins.length).toBe(1);
      expect(coins[0].id).toBe('bitcoin');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/market/top`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [mockCoin] });
  });

  it('should poll topCoins$ every 15s', fakeAsync(() => {
    let emits = 0;
    const sub = service.topCoins$.subscribe(() => {
      emits++;
    });

    tick(0);

    // First emission at 0
    const req1 = httpMock.expectOne(`${environment.apiBaseUrl}/market/top`);
    req1.flush({ data: [mockCoin] });
    expect(emits).toBe(1);

    // Second emission at 15s
    tick(15000);
    const req2 = httpMock.expectOne(`${environment.apiBaseUrl}/market/top`);
    req2.flush({ data: [mockCoin] });
    expect(emits).toBe(2);

    sub.unsubscribe();
    discardPeriodicTasks();
  }));

  it('should map getCoin() response correctly', () => {
    service.getCoin('bitcoin').subscribe(coin => {
      expect(coin.id).toBe('bitcoin');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/market/coin/bitcoin`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: mockCoin });
  });
});
