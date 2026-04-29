import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { CoinsTableComponent } from './coins-table.component';
import { CoinSnapshot } from '../../../core/models/market.model';
import { SimpleChange, signal } from '@angular/core';
import { WatchlistService } from '../../../core/services/state/watchlist.service';

describe('CoinsTableComponent', () => {
  let component: CoinsTableComponent;
  let fixture: ComponentFixture<CoinsTableComponent>;

  const mockCoins: CoinSnapshot[] = [
    {
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
    },
    {
      id: 'ethereum',
      symbol: 'eth',
      name: 'Ethereum',
      image: 'url',
      current_price: 3000,
      market_cap: 500000,
      market_cap_rank: 2,
      total_volume: 30000,
      high_24h: 3100,
      low_24h: 2900,
      price_change_24h: -100,
      price_change_percentage_24h: -3.2,
      market_cap_change_24h: -100,
      market_cap_change_percentage_24h: -3.2,
      circulating_supply: 120000000,
      ath: 4800,
      ath_change_percentage: -30,
      ath_date: 'date',
      atl: 50,
      atl_change_percentage: 6000,
      atl_date: 'date',
      last_updated: 'date'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoinsTableComponent, NoopAnimationsModule, RouterTestingModule],
      providers: [
        {
          provide: WatchlistService,
          useValue: {
            has: jest.fn(() => signal(false)),
            toggle: jest.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CoinsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update dataSource when coins change', () => {
    component.coins = mockCoins;
    component.ngOnChanges({
      coins: new SimpleChange(null, mockCoins, true)
    });
    
    expect(component.dataSource.data.length).toBe(2);
    expect(component.dataSource.data[0].id).toBe('bitcoin');
  });

  it('should trigger flash animation on price change', fakeAsync(() => {
    // Initial data
    component.coins = mockCoins;
    component.ngOnChanges({
      coins: new SimpleChange(null, mockCoins, true)
    });

    // Price goes up
    const updatedCoins = [...mockCoins];
    updatedCoins[0] = { ...mockCoins[0], current_price: 51000 };

    component.coins = updatedCoins;
    component.ngOnChanges({
      coins: new SimpleChange(mockCoins, updatedCoins, false)
    });

    expect(component.flashingRows.get('bitcoin')).toBe('up');

    // Wait for 300ms for flash to disappear
    tick(300);
    expect(component.flashingRows.has('bitcoin')).toBeFalsy();
  }));

  it('should filter correctly', () => {
    component.coins = mockCoins;
    component.ngOnChanges({
      coins: new SimpleChange(null, mockCoins, true)
    });
    
    const event = { target: { value: 'eth' } } as unknown as Event;
    component.applyFilter(event);

    expect(component.dataSource.filteredData.length).toBe(1);
    expect(component.dataSource.filteredData[0].id).toBe('ethereum');
  });
});
