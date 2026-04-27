import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/state/auth.service';
import { SettingsService } from '../../../core/services/state/settings.service';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authMock: { login: jest.Mock };
  let settingsMock: { load: jest.Mock };

  beforeEach(async () => {
    authMock = { login: jest.fn() };
    settingsMock = { load: jest.fn().mockResolvedValue(undefined) };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimations(),
        { provide: AuthService, useValue: { ...authMock, currentUser: { set: jest.fn() }, accessToken: { set: jest.fn() }, isAuthenticated: () => false } },
        { provide: SettingsService, useValue: settingsMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows error message when login fails', async () => {
    authMock.login.mockRejectedValue({
      error: { error: { message: 'E-posta veya şifre hatalı.' } },
    });

    component.form.setValue({ email: 'bad@test.com', password: 'wrongpassword1' });
    await component.submit();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('E-posta veya şifre hatalı.');
    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
    expect(alert.textContent.trim()).toContain('E-posta veya şifre hatalı.');
  });

  it('does not call login when form is invalid', async () => {
    component.form.setValue({ email: '', password: '' });
    await component.submit();
    expect(authMock.login).not.toHaveBeenCalled();
  });

  it('clears error and calls login on valid submit', async () => {
    authMock.login.mockResolvedValue(undefined);

    component.form.setValue({ email: 'user@test.com', password: 'Password1' });
    await component.submit();

    expect(authMock.login).toHaveBeenCalledWith({ email: 'user@test.com', password: 'Password1' });
    expect(component.errorMessage()).toBeNull();
  });
});
