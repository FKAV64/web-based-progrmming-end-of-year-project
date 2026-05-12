import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { NEVER, of } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';
import { signal } from '@angular/core';
import { MarketsComponent } from './markets.component';
import { PriceStreamService } from '../../core/services/state/price-stream.service';
import { WatchlistService } from '../../core/services/state/watchlist.service';
import { SettingsService } from '../../core/services/state/settings.service';
import { ExchangeRatesService } from '../../core/services/state/exchange-rates.service';

const mockSettings = { currency: signal('USD' as const), locale: signal('TR' as const), theme: signal('LIGHT' as const) };
const mockRates = { rates: signal(null) };
const mockWatchlist = { has: jest.fn(() => signal(false)), toggle: jest.fn() };
const mockBreakpoints = { observe: jest.fn(() => of({ matches: false, breakpoints: {} })) };

describe('MarketsComponent — skeleton loader', () => {
  async function setup(topCoins$: any) {
    await TestBed.configureTestingModule({
      imports: [MarketsComponent, NoopAnimationsModule, RouterTestingModule],
      providers: [
        { provide: PriceStreamService, useValue: { topCoins$ } },
        { provide: WatchlistService, useValue: mockWatchlist },
        { provide: SettingsService, useValue: mockSettings },
        { provide: ExchangeRatesService, useValue: mockRates },
        { provide: BreakpointObserver, useValue: mockBreakpoints },
      ],
    }).compileComponents();

    const fixture: ComponentFixture<MarketsComponent> = TestBed.createComponent(MarketsComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should show skeleton while stream has not emitted', async () => {
    const fixture = await setup(NEVER);
    const el: HTMLElement = fixture.nativeElement;
    const skeleton = el.querySelector('[role="status"]');
    expect(skeleton).not.toBeNull();
  });

  it('skeleton should have accessible loading label', async () => {
    const fixture = await setup(NEVER);
    const el: HTMLElement = fixture.nativeElement;
    const skeleton = el.querySelector('[role="status"]');
    expect(skeleton?.getAttribute('aria-label')).toBeTruthy();
  });

  it('should hide skeleton and show table once coins arrive', async () => {
    const fixture = await setup(of([]));
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const skeleton = el.querySelector('[role="status"]');
    const table = el.querySelector('app-coins-table');
    expect(skeleton).toBeNull();
    expect(table).not.toBeNull();
  });
});

