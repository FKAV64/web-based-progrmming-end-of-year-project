import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs/operators';
import { CoinSnapshot } from '../../../core/models/market.model';
import { MarketApiService } from '../../../core/services/api/market.api';

@Component({
  selector: 'app-coin-picker',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
  ],
  template: `
    <div class="relative">
      <input
        type="text"
        [formControl]="$any(displayControl)"
        [matAutocomplete]="auto"
        [placeholder]="placeholder"
        (focus)="openPanel()"
        class="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-md w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Coin seç"
      >
      <mat-autocomplete
        #auto="matAutocomplete"
        [displayWith]="displayFn"
        (optionSelected)="onOptionSelected($event)"
        panelClass="coin-picker-panel">
        <mat-option *ngFor="let coin of filteredCoins()" [value]="coin">
          <div class="flex items-center gap-2 cursor-pointer text-gray-900 dark:text-gray-100">
            <img *ngIf="!imageErrors().has(coin.id)"
                 [src]="coin.image" [alt]="coin.symbol"
                 class="w-6 h-6 rounded-full shrink-0"
                 (error)="onImageError(coin.id)">
            <div *ngIf="imageErrors().has(coin.id)"
                 class="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 shrink-0">
              {{ coin.symbol[0].toUpperCase() }}
            </div>
            <span class="font-semibold">{{ coin.name }}</span>
            <span class="text-gray-400 dark:text-gray-500 text-xs font-mono ml-auto">{{ coin.symbol.toUpperCase() }}</span>
          </div>
        </mat-option>
        <mat-option *ngIf="filteredCoins().length === 0" disabled>
          <div class="text-center text-gray-400 dark:text-gray-500 text-sm">Sonuç bulunamadı</div>
        </mat-option>
      </mat-autocomplete>
    </div>
  `,
})
export class CoinPickerComponent implements OnInit {
  @Input() control!: FormControl<string>;
  @Input() placeholder = 'Coin ara...';
  @Output() coinSelected = new EventEmitter<CoinSnapshot>();

  @ViewChild(MatAutocompleteTrigger) private autoTrigger!: MatAutocompleteTrigger;

  private market = inject(MarketApiService);

  // Internal control for the display value (may hold string or CoinSnapshot)
  readonly displayControl = new FormControl<CoinSnapshot | string | null>(null);

  private coins = signal<CoinSnapshot[]>([]);
  readonly imageErrors = signal<Set<string>>(new Set());

  private query = toSignal(
    this.displayControl.valueChanges.pipe(
      startWith(null),
      map(v => (typeof v === 'string' ? v : '')),
    ),
    { initialValue: '' },
  );

  readonly filteredCoins = computed(() => {
    const q = this.query().toLowerCase().trim();
    const allCoins = this.coins();
    if (!q) return allCoins;
    return allCoins.filter(
      c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q),
    );
  });

  constructor() {
    this.market.topCoins$.pipe(takeUntilDestroyed()).subscribe(coins => this.coins.set(coins));
  }

  ngOnInit(): void {
    if (this.control.value) {
      const coin = this.coins().find(c => c.id === this.control.value);
      if (coin) {
        this.displayControl.setValue(coin);
      }
    }
  }

  displayFn(coin: CoinSnapshot | string | null): string {
    if (!coin) return '';
    if (typeof coin === 'string') return coin;
    return `${coin.name}  ${coin.symbol.toUpperCase()}`;
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent): void {
    const coin = event.option.value as CoinSnapshot;
    this.control.setValue(coin.id);
    this.coinSelected.emit(coin);
  }

  onImageError(coinId: string): void {
    this.imageErrors.update(set => new Set([...set, coinId]));
  }

  openPanel(): void {
    this.autoTrigger?.openPanel();
  }
}
