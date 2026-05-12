import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SimpleChange, signal } from '@angular/core';
import { Subject, of } from 'rxjs';
import { PriceChartComponent } from './price-chart.component';
import { MarketApiService } from '../../../../core/services/api/market.api';
import { BINANCE_WS } from '../../../../core/services/ws/binance-ws.token';
import { SettingsService } from '../../../../core/services/state/settings.service';
import { ChartType, OHLC } from '../../../../core/models/market.model';
import { PriceTick } from '../../../../core/models/price-tick.model';

class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

describe('PriceChartComponent', () => {
  let fixture: ComponentFixture<PriceChartComponent>;
  let component: PriceChartComponent;
  let api: { getKlines: jest.Mock };
  let ticks$: Subject<PriceTick>;

  const fixtureKlines: OHLC[] = [
    { time: Date.UTC(2026, 3, 29, 10), open: 100, high: 115, low: 95, close: 110 },
    { time: Date.UTC(2026, 3, 29, 11), open: 110, high: 120, low: 105, close: 118 },
  ];

  beforeAll(() => {
    (globalThis as any).ResizeObserver = ResizeObserverMock;
    const matrix = () => ({
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      e: 0,
      f: 0,
      inverse: matrix,
      multiply: matrix,
    });
    Object.defineProperty(SVGElement.prototype, 'getScreenCTM', {
      value: () => matrix(),
      configurable: true,
    });
    Object.defineProperty(SVGSVGElement.prototype, 'createSVGMatrix', {
      value: matrix,
      configurable: true,
    });
  });

  beforeEach(async () => {
    ticks$ = new Subject<PriceTick>();
    api = { getKlines: jest.fn().mockReturnValue(of(fixtureKlines)) };

    await TestBed.configureTestingModule({
      imports: [PriceChartComponent, NoopAnimationsModule],
      providers: [
        { provide: MarketApiService, useValue: api },
        {
          provide: BINANCE_WS,
          useValue: {
            connectionState: signal('live'),
            tick$: jest.fn(() => ticks$.asObservable()),
          },
        },
        {
          provide: SettingsService,
          useValue: {
            theme: signal('LIGHT'),
            locale: signal('EN'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PriceChartComponent);
    component = fixture.componentInstance;
  });

  it.each<ChartType>(['candle', 'line', 'area'])('renders %s chart with fixture klines', (chartType: ChartType) => {
    loadChart(chartType);

    expect(api.getKlines).toHaveBeenCalledWith('BTCUSDT', '1h', 168);
    expect(component.series[0].data.length).toBe(2);

    if (chartType === 'candle') {
      expect(component.series[0].data[0].y).toEqual([100, 115, 95, 110]);
      expect(component.chartOptions.type).toBe('candlestick');
    } else {
      expect(component.series[0].data[0]).toEqual([fixtureKlines[0].time, 110]);
      expect(component.chartOptions.type).toBe(chartType);
    }
  });

  it('switching interval calls getKlines with new params and replaces series', () => {
    const oneMinuteKlines: OHLC[] = [
      { time: Date.UTC(2026, 3, 29, 12), open: 200, high: 220, low: 190, close: 210 },
    ];
    api.getKlines.mockReset();
    api.getKlines
      .mockReturnValueOnce(of(fixtureKlines))
      .mockReturnValueOnce(of(oneMinuteKlines));

    loadChart('line');
    expect(component.series[0].data[0]).toEqual([fixtureKlines[0].time, 110]);

    component.interval = '1m';
    component.limit = 120;
    component.ngOnChanges({
      interval: new SimpleChange('1h', '1m', false),
      limit: new SimpleChange(168, 120, false),
    });
    fixture.detectChanges();

    expect(api.getKlines).toHaveBeenLastCalledWith('BTCUSDT', '1m', 120);
    expect(component.series[0].data).toEqual([[oneMinuteKlines[0].time, 210]]);
  });

  it('live tick updates the last candle close in place', () => {
    loadChart('candle');

    const last = component.klines[component.klines.length - 1];
    ticks$.next({
      symbol: 'BTCUSDT',
      price: 121,
      timestamp: last.time + 30 * 60_000,
    });

    expect(component.klines[component.klines.length - 1]).toBe(last);
    expect(last.close).toBe(121);
    expect(last.high).toBe(121);
    expect(component.series[0].data[1].y).toEqual([110, 121, 105, 121]);
  });

  function loadChart(chartType: ChartType): void {
    component.symbol = 'BTCUSDT';
    component.interval = '1h';
    component.limit = 168;
    component.chartType = chartType;
    component.ngOnChanges({
      symbol: new SimpleChange(undefined, 'BTCUSDT', true),
      interval: new SimpleChange(undefined, '1h', true),
      limit: new SimpleChange(undefined, 168, true),
      chartType: new SimpleChange(undefined, chartType, true),
    });
    fixture.detectChanges();
  }
});
