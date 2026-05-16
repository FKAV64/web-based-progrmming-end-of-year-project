import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as http from 'http';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

async function createApp(): Promise<INestApplication> {
  const fixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = fixture.createNestApplication();
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  return app;
}

// ── Auth flow ─────────────────────────────────────────────────────────────────

describe('Auth flow (e2e)', () => {
  let app: INestApplication;

  // Use a timestamp-based email so every test run creates a fresh user.
  const testEmail = `e2e-${Date.now()}@example.com`;
  const testPassword = 'Test1234';
  const testName = 'E2E Test User';

  let accessToken: string;
  let refreshCookie: string;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/register → 201 with accessToken and refresh cookie', async () => {
    const res = await request(app.getHttpServer() as http.Server)
      .post('/api/auth/register')
      .send({ email: testEmail, password: testPassword, name: testName })
      .expect(201);

    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe(testEmail);
    expect(res.headers['set-cookie']).toBeDefined();

    accessToken = res.body.data.accessToken as string;
    refreshCookie = (res.headers['set-cookie'] as string[])[0];
  });

  it('POST /api/auth/login → 200 with accessToken and refresh cookie', async () => {
    const res = await request(app.getHttpServer() as http.Server)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(200);

    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe(testEmail);
    expect(res.headers['set-cookie']).toBeDefined();

    // Switch to the login-issued tokens for the rest of the flow
    accessToken = res.body.data.accessToken as string;
    refreshCookie = (res.headers['set-cookie'] as string[])[0];
  });

  it('GET /api/auth/me with Bearer token → 200', async () => {
    const res = await request(app.getHttpServer() as http.Server)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.email).toBe(testEmail);
  });

  it('POST /api/auth/refresh with cookie → 200 with rotated accessToken', async () => {
    const res = await request(app.getHttpServer() as http.Server)
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200);

    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.accessToken).not.toBe(accessToken);
    expect(res.headers['set-cookie']).toBeDefined();

    // Carry the new tokens for subsequent tests
    accessToken = res.body.data.accessToken as string;
    refreshCookie = (res.headers['set-cookie'] as string[])[0];
  });

  it('POST /api/auth/logout → 200 and clears cookie', async () => {
    const res = await request(app.getHttpServer() as http.Server)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', refreshCookie)
      .expect(200);

    expect(res.body.data.message).toBe('Logged out');
  });

  it('GET /api/auth/me without token → 401', async () => {
    await request(app.getHttpServer() as http.Server)
      .get('/api/auth/me')
      .expect(401);
  });
});

// ── Throttler — isolated app so it has fresh in-memory state ─────────────────

describe('Throttler (isolated app)', () => {
  let app: INestApplication;
  const throttleEmail = `throttle-${Date.now()}@example.com`;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 429 after 5 failed login attempts within the 60 s window', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer() as http.Server)
        .post('/api/auth/login')
        .send({ email: throttleEmail, password: 'WrongPass1' })
        .expect(401);
    }

    await request(app.getHttpServer() as http.Server)
      .post('/api/auth/login')
      .send({ email: throttleEmail, password: 'WrongPass1' })
      .expect(429);
  });
});
