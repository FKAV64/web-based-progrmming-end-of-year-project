import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/state/auth.service';
import { AuthApiService } from '../services/api/auth.api';
import { of, throwError } from 'rxjs';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let authService: AuthService;
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
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        AuthService,
        { provide: AuthApiService, useValue: apiMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => httpTesting.verify());

  it('adds Authorization header when token present', () => {
    authService.accessToken.set('mytoken');
    http.get('/api/market/top').subscribe();
    const req = httpTesting.expectOne('/api/market/top');
    expect(req.request.headers.get('Authorization')).toBe('Bearer mytoken');
    req.flush({ data: [] });
  });

  it('does not add Authorization header for refresh endpoint', () => {
    authService.accessToken.set('mytoken');
    http.post('/api/auth/refresh', {}).subscribe();
    const req = httpTesting.expectOne('/api/auth/refresh');
    expect(req.request.headers.get('Authorization')).toBeNull();
    req.flush({ data: { accessToken: 'new' } });
  });

  it('on 401 refreshes token and retries original request', fakeAsync(() => {
    authService.accessToken.set('expired');
    apiMock.refresh.mockReturnValue(of({ accessToken: 'new-token' }));

    let result: any;
    http.get('/api/market/top').subscribe(r => (result = r));

    // First attempt → 401
    const first = httpTesting.expectOne('/api/market/top');
    first.flush({ error: { code: 'UNAUTHORIZED' } }, { status: 401, statusText: 'Unauthorized' });

    tick();

    // Retry with new token
    const retry = httpTesting.expectOne('/api/market/top');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-token');
    retry.flush({ data: 'ok' });

    tick();
    expect(result).toEqual({ data: 'ok' });
    expect(authService.accessToken()).toBe('new-token');
  }));

  it('on 401 + failed refresh navigates to /login', fakeAsync(() => {
    authService.accessToken.set('expired');
    apiMock.refresh.mockReturnValue(throwError(() => ({ status: 401 })));

    http.get('/api/market/top').subscribe({ error: () => {} });

    const first = httpTesting.expectOne('/api/market/top');
    first.flush({}, { status: 401, statusText: 'Unauthorized' });

    tick();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
  }));
});
