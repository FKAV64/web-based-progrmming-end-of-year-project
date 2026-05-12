import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

function gaugeColor(value: number): string {
  if (value <= 25) return '#EF4444';
  if (value <= 45) return '#F97316';
  if (value <= 55) return '#EAB308';
  if (value <= 75) return '#84CC16';
  return '#22C55E';
}

@Component({
  selector: 'app-fear-greed-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="flex h-full flex-col items-center justify-center p-2">
      <ng-container *ngIf="loading">
        <div class="flex h-48 items-center justify-center">
          <div class="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500"></div>
        </div>
      </ng-container>

      <ng-container *ngIf="error && !loading">
        <div class="flex h-48 flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
          <mat-icon>error_outline</mat-icon>
          <span class="text-sm">Duygu verisi alınamadı</span>
        </div>
      </ng-container>

      <ng-container *ngIf="!loading && !error">
        <div class="flex flex-col items-center">
          <div class="relative w-56 h-28">
            <svg viewBox="0 0 200 110" class="w-full h-full">
              <defs>
                <filter id="fg-shadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000" flood-opacity="0.25"/>
                </filter>
              </defs>

              <g>
                <g *ngFor="let seg of segmentPaths">
                  <path [attr.d]="seg.d" [attr.stroke]="seg.color" [attr.stroke-width]="strokeWidth" stroke-linecap="round" fill="none"></path>
                </g>

                <circle [attr.cx]="marker.x" [attr.cy]="marker.y" r="6" fill="#fff" stroke="#111827" stroke-width="2" [attr.filter]="'url(#fg-shadow)'" />
              </g>
            </svg>
          </div>

          <div class="mt-1 text-center">
            <div class="text-3xl font-bold" [style.color]="color">{{ value }}</div>
            <div class="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">
              {{ computedClassification }}
            </div>
            <div class="mt-1 text-xs text-gray-400">Fear & Greed Index</div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
})
export class FearGreedCardComponent implements OnInit, OnChanges {
  @Input() value: string | number = 0;
  @Input() classification = '';
  @Input() loading = false;
  @Input() error = false;

  color = '#EAB308';

  // SVG gauge geometry
  readonly cx = 100;
  readonly cy = 100;
  readonly r = 82;
  readonly strokeWidth = 14;
  readonly gapDeg = 2; // gap between segments in degrees

  // Logical score boundaries
  readonly segmentsDef = [
    { from: 0, to: 24, color: '#EF4444' },
    { from: 25, to: 44, color: '#F97316' },
    { from: 45, to: 55, color: '#EAB308' },
    { from: 56, to: 75, color: '#84CC16' },
    { from: 76, to: 100, color: '#22C55E' },
  ];

  segmentPaths: Array<{ d: string; color: string }> = [];
  marker = { x: 100, y: 20 };

  ngOnInit(): void {
    this.refreshGauge();
  }

  ngOnChanges(): void {
    this.refreshGauge();
  }

  private refreshGauge(): void {
    if (!this.loading && !this.error) {
      const numValue = Number(this.value) || 0;
      this.color = gaugeColor(numValue);
      this.buildSegmentPaths();
      this.updateMarker(numValue);
    }
  }

  private buildSegmentPaths(): void {
    const visualSegmentSize = 100 / this.segmentsDef.length; // 20% visual size each

    this.segmentPaths = this.segmentsDef.map((seg, index) => {
      const visualStartPct = index * visualSegmentSize;
      const visualEndPct = (index + 1) * visualSegmentSize;

      const startAngle = this.visualPercentToAngle(visualStartPct) + this.gapDeg / 2;
      const endAngle = this.visualPercentToAngle(visualEndPct) - this.gapDeg / 2;
      const d = this.describeArc(this.cx, this.cy, this.r, startAngle, endAngle);
      return { d, color: seg.color };
    });
  }

  private updateMarker(score: number): void {
    const visualPct = this.scoreToVisualPercent(score);
    const angle = this.visualPercentToAngle(visualPct);
    const pos = this.polarToCartesian(this.cx, this.cy, this.r, angle);
    this.marker = { x: pos.x, y: pos.y };
  }

  private visualPercentToAngle(visualPct: number): number {
    // Map 0..100 visual pct => 180..360 degrees
    return 180 + (visualPct / 100) * 180;
  }

  private scoreToVisualPercent(score: number): number {
    if (score <= 0) return 0;
    if (score >= 100) return 100;

    const visualSegmentSize = 100 / this.segmentsDef.length;

    for (let i = 0; i < this.segmentsDef.length; i++) {
      const seg = this.segmentsDef[i];
      if (score >= seg.from && score <= seg.to) {
        // Calculate progress inside the specific point range
        const range = seg.to - seg.from;
        const progress = (score - seg.from) / (range || 1);
        // Map to the corresponding visual 20% window
        return (i * visualSegmentSize) + (progress * visualSegmentSize);
      }
    }
    return 50; // Fallback
  }

  private polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
    const angleRad = angleDeg * Math.PI / 180.0;
    return {
      x: +(cx + radius * Math.cos(angleRad)).toFixed(3),
      y: +(cy + radius * Math.sin(angleRad)).toFixed(3),
    };
  }

  private describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
    const start = this.polarToCartesian(cx, cy, radius, startAngle);
    const end = this.polarToCartesian(cx, cy, radius, endAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  }

  get computedClassification(): string {
    if (this.classification && this.classification.trim()) return this.classification;
    const v = Number(this.value) || 0;
    if (v <= 24) return 'Aşırı Korku';
    if (v <= 44) return 'Korku';
    if (v <= 55) return 'Nötr';
    if (v <= 75) return 'Açgözlülük';
    return 'Aşırı Açgözlülük';
  }
}
