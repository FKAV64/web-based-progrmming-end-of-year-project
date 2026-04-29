import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { CoinSnapshot } from '../../../core/models/market.model';
import { WatchlistService } from '../../../core/services/state/watchlist.service';
import { PriceChangeBadgeComponent } from '../../../shared/components/price-change-badge/price-change-badge.component';

interface SparklineOptions {
  series: { data: number[] }[];
  chart: {
    type: 'line';
    width: number;
    height: number;
    sparkline: { enabled: boolean };
    animations: { enabled: boolean };
  };
  stroke: {
    curve: 'smooth';
    width: number;
  };
  colors: string[];
  tooltip: {
    fixed: { enabled: boolean };
    x: { show: boolean };
    y: {
      title: { formatter: () => string };
    };
    marker: { show: boolean };
  };
}

@Component({
  selector: 'app-coins-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatButtonModule,
    RouterModule,
    NgApexchartsModule,
    PriceChangeBadgeComponent,
  ],
  templateUrl: './coins-table.component.html',
  styleUrls: ['./coins-table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinsTableComponent implements OnChanges, AfterViewInit {
  @Input() coins: CoinSnapshot[] | null = null;

  watchlist = inject(WatchlistService);

  displayedColumns: string[] = [
    'market_cap_rank',
    'name',
    'current_price',
    'price_change_percentage_1h_in_currency',
    'price_change_percentage_24h',
    'price_change_percentage_7d_in_currency',
    'market_cap',
    'total_volume',
    'sparkline',
    'watchlist',
  ];
  dataSource = new MatTableDataSource<CoinSnapshot>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private previousPrices = new Map<string, number>();
  private sparklineOptions = new Map<string, SparklineOptions>();
  flashingRows = new Map<string, 'up' | 'down'>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['coins'] && this.coins) {
      this.updateData(this.coins);
    }
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'name':
          return item.name;
        case 'current_price':
          return item.current_price;
        case 'price_change_percentage_1h_in_currency':
          return item.price_change_percentage_1h_in_currency || 0;
        case 'price_change_percentage_24h':
          return item.price_change_percentage_24h;
        case 'price_change_percentage_7d_in_currency':
          return item.price_change_percentage_7d_in_currency || 0;
        case 'market_cap':
          return item.market_cap;
        case 'total_volume':
          return item.total_volume;
        default:
          return (item as any)[property];
      }
    };
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  getSparklineOptions(coinId: string): SparklineOptions | null {
    return this.sparklineOptions.get(coinId) ?? null;
  }

  isWatched(coinId: string): boolean {
    return this.watchlist.has(coinId)();
  }

  toggleWatchlist(event: MouseEvent, coinId: string): void {
    event.stopPropagation();
    event.preventDefault();
    void this.watchlist.toggle(coinId);
  }

  private updateData(newCoins: CoinSnapshot[]) {
    newCoins.forEach((coin) => {
      const prevPrice = this.previousPrices.get(coin.id);
      if (prevPrice !== undefined && prevPrice !== coin.current_price) {
        const direction = coin.current_price > prevPrice ? 'up' : 'down';
        this.flashingRows.set(coin.id, direction);

        setTimeout(() => {
          this.flashingRows.delete(coin.id);
        }, 300);
      }

      this.previousPrices.set(coin.id, coin.current_price);
      this.sparklineOptions.set(coin.id, this.buildSparklineOptions(coin));
    });

    this.dataSource.data = newCoins;
  }

  private buildSparklineOptions(coin: CoinSnapshot): SparklineOptions {
    const data = coin.sparkline_in_7d?.price || [];
    const color =
      coin.price_change_percentage_7d_in_currency &&
      coin.price_change_percentage_7d_in_currency >= 0
        ? '#10B981'
        : '#EF4444';

    return {
      series: [{ data }],
      chart: {
        type: 'line',
        width: 100,
        height: 35,
        sparkline: { enabled: true },
        animations: { enabled: false },
      },
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      colors: [color],
      tooltip: {
        fixed: { enabled: false },
        x: { show: false },
        y: {
          title: { formatter: () => '' },
        },
        marker: { show: false },
      },
    };
  }
}
