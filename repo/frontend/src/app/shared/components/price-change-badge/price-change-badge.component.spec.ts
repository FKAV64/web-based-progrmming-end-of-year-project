import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PriceChangeBadgeComponent } from './price-change-badge.component';

describe('PriceChangeBadgeComponent', () => {
  let component: PriceChangeBadgeComponent;
  let fixture: ComponentFixture<PriceChangeBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriceChangeBadgeComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PriceChangeBadgeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display positive percentage correctly', () => {
    component.percentage = 5.25;
    fixture.detectChanges();
    
    const spanElement = fixture.nativeElement.querySelector('span');
    expect(spanElement.classList).toContain('text-green-800');
    expect(spanElement.textContent).toContain('5.25%');
  });

  it('should display negative percentage correctly', () => {
    component.percentage = -3.14;
    fixture.detectChanges();
    
    const spanElement = fixture.nativeElement.querySelector('span');
    expect(spanElement.classList).toContain('text-red-800');
    expect(spanElement.textContent).toContain('3.14%');
  });
});
