import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { ShellComponent } from './shell.component';
import { AuthService } from '../../core/services/state/auth.service';
import { SettingsService } from '../../core/services/state/settings.service';
import { BINANCE_WS } from '../../core/services/ws/binance-ws.token';

describe('ShellComponent — a11y', () => {
  let fixture: ComponentFixture<ShellComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellComponent, NoopAnimationsModule, RouterTestingModule],
      providers: [
        {
          provide: AuthService,
          useValue: { currentUser: signal(null), logout: jest.fn() },
        },
        {
          provide: SettingsService,
          useValue: {
            currency: signal('USD'),
            theme: signal('LIGHT'),
            locale: signal('TR'),
            setCurrency: jest.fn(),
            setTheme: jest.fn(),
          },
        },
        {
          provide: BINANCE_WS,
          useValue: { connectionState: signal('CONNECTED') },
        },
        {
          provide: BreakpointObserver,
          useValue: { observe: jest.fn(() => of({ matches: false, breakpoints: {} })) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should have an aria-live="polite" region for toast announcements', () => {
    const liveRegion = el.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion?.getAttribute('aria-atomic')).toBe('true');
  });

  it('should have aria-label on the hamburger menu button', () => {
    const menuBtn = el.querySelector('button[mat-icon-button]');
    expect(menuBtn?.getAttribute('aria-label')).toBeTruthy();
  });

  it('sidenav navigation links should have aria-label', () => {
    const navLinks = el.querySelectorAll('a[mat-list-item]');
    navLinks.forEach(link => {
      expect(link.getAttribute('aria-label')).toBeTruthy();
    });
  });
});
