import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { AuthApiService } from '../api/auth.api';
import { Router } from '@angular/router';

const mockUser = {
  id: 'u1',
  email: 'test@example.com',
  name: 'Test',
  role: 'USER' as const,
  emailVerifiedAt: null,
  createdAt: new Date().toISOString(),
  settings: null,
};

describe('AuthService', () => {
  let service: AuthService;
  let apiMock: jest.Mocked<AuthApiService>;
  let routerMock: { navigate: jest.Mock };

  beforeEach(() => {
    apiMock = {
      login: jest.fn(),
      register: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      me: jest.fn(),
    } as any;

    routerMock = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: AuthApiService, useValue: apiMock },
        { provide: Router, useValue: routerMock },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('login happy path stores token and user', async () => {
    apiMock.login.mockReturnValue(of({ user: mockUser, accessToken: 'tok123' }));

    await service.login({ email: 'test@example.com', password: 'pass1234' });

    expect(service.accessToken()).toBe('tok123');
    expect(service.currentUser()).toEqual(mockUser);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('init() succeeds: sets token + user from refresh+me', async () => {
    apiMock.refresh.mockReturnValue(of({ accessToken: 'refreshed' }));
    apiMock.me.mockReturnValue(of(mockUser));

    await service.init();

    expect(service.accessToken()).toBe('refreshed');
    expect(service.currentUser()).toEqual(mockUser);
  });

  it('init() on 401 leaves signals null', async () => {
    apiMock.refresh.mockReturnValue(throwError(() => ({ status: 401 })));

    await service.init();

    expect(service.accessToken()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('clearLocalSession clears signals without HTTP calls or navigation', () => {
    service.accessToken.set('tok');
    service.currentUser.set(mockUser);

    service.clearLocalSession();

    expect(service.accessToken()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect(apiMock.logout).not.toHaveBeenCalled();
  });

  it('logout clears state and redirects to /login', async () => {
    service.accessToken.set('tok');
    service.currentUser.set(mockUser);
    apiMock.logout.mockReturnValue(of(undefined as any));

    await service.logout();

    expect(service.accessToken()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
  });
});
