import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { PrismaService } from '../src/prisma/prisma.service';

type AppOptions = { withCsrf?: boolean };

async function createApp(opts: AppOptions = {}): Promise<INestApplication> {
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

  if (opts.withCsrf) {
    const csrfProtection = csurf({
      cookie: { httpOnly: true, sameSite: 'lax' },
    });
    const csrfSkip = new Set([
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh',
    ]);
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (csrfSkip.has(req.path)) return next();
      csrfProtection(req, res, (err) => {
        if (err) return next(err);
        res.cookie('XSRF-TOKEN', req.csrfToken(), { sameSite: 'lax' });
        next();
      });
    });
  }

  await app.init();
  return app;
}

// ── 1. Account lockout (rate limit returns 429 after threshold) ──────────────

describe('Security — account lockout', () => {
  let app: INestApplication;
  const email = `lockout-${Date.now()}@example.com`;
  const password = 'CorrectPass1';

  beforeAll(async () => {
    process.env.DISABLE_THROTTLE = '1';
    app = await createApp();
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password, name: 'Lockout User' })
      .expect(201);
  });

  afterAll(async () => {
    delete process.env.DISABLE_THROTTLE;
    await app.close();
  });

  it('returns 429 on the 11th failed login (10 wrong attempts trip the lockout)', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'WrongPass1' });
      expect(res.status).toBe(401);
    }

    const res11 = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'WrongPass1' });
    expect(res11.status).toBe(429);

    // Even the correct password is rejected while locked
    const correctWhileLocked = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });
    expect(correctWhileLocked.status).toBe(429);
  });
});

// ── 2. CSRF — POST without X-XSRF-TOKEN → 403 ────────────────────────────────

describe('Security — CSRF protection on /portfolio', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    process.env.DISABLE_THROTTLE = '1';
    app = await createApp({ withCsrf: true });

    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `csrf-${Date.now()}@example.com`,
        password: 'Test1234',
        name: 'CSRF Test User',
      })
      .expect(201);
    accessToken = reg.body.data.accessToken as string;
  });

  afterAll(async () => {
    delete process.env.DISABLE_THROTTLE;
    await app.close();
  });

  it('rejects POST /api/portfolio with 403 when X-XSRF-TOKEN is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/portfolio')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        coinId: 'bitcoin',
        quantity: '0.5',
        avgBuyPrice: '30000.00',
        buyCurrency: 'USD',
      });

    expect(res.status).toBe(403);
  });
});

// ── 3. Expired access token → refresh → retry → 200 ──────────────────────────

describe('Security — expired token then refresh flow', () => {
  let app: INestApplication;
  let userId: string;
  let userEmail: string;
  let refreshCookie: string;
  let jwt: JwtService;
  let config: ConfigService;

  beforeAll(async () => {
    process.env.DISABLE_THROTTLE = '1';
    app = await createApp();
    jwt = app.get(JwtService);
    config = app.get(ConfigService);

    userEmail = `expired-${Date.now()}@example.com`;
    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: userEmail, password: 'Test1234', name: 'Expired Token User' })
      .expect(201);

    userId = reg.body.data.user.id as string;
    refreshCookie = (reg.headers['set-cookie'] as string[])[0];
  });

  afterAll(async () => {
    delete process.env.DISABLE_THROTTLE;
    await app.close();
  });

  it('rejects expired access token with 401, accepts new token after refresh', async () => {
    const expiredToken = jwt.sign(
      { sub: userId, email: userEmail, role: 'USER', jti: randomUUID() },
      {
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: '-1s',
      },
    );

    const expiredRes = await request(app.getHttpServer())
      .get('/api/portfolio')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(expiredRes.status).toBe(401);

    const refreshRes = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200);

    const freshToken = refreshRes.body.data.accessToken as string;
    expect(freshToken).toBeDefined();

    const retryRes = await request(app.getHttpServer())
      .get('/api/portfolio')
      .set('Authorization', `Bearer ${freshToken}`);
    expect(retryRes.status).toBe(200);
  });
});

// ── 4. IDOR — User A cannot PATCH User B's position → 404 (not 403, no leak) ─

describe('Security — cross-user isolation (IDOR)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenA: string;
  let tokenB: string;
  let positionAId: string;

  beforeAll(async () => {
    process.env.DISABLE_THROTTLE = '1';
    app = await createApp();
    prisma = app.get(PrismaService);

    const ts = Date.now();
    const a = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: `idor-a-${ts}@example.com`, password: 'Test1234', name: 'IDOR User A' })
      .expect(201);
    tokenA = a.body.data.accessToken as string;
    const userAId = a.body.data.user.id as string;

    const b = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: `idor-b-${ts}@example.com`, password: 'Test1234', name: 'IDOR User B' })
      .expect(201);
    tokenB = b.body.data.accessToken as string;

    const position = await prisma.portfolioPosition.create({
      data: {
        userId: userAId,
        coinId: 'bitcoin',
        quantity: '1',
        avgBuyPrice: '30000',
        buyCurrency: 'USD',
      },
    });
    positionAId = position.id;
  });

  afterAll(async () => {
    delete process.env.DISABLE_THROTTLE;
    await app.close();
  });

  it("returns 404 (not 403) when user B tries to PATCH user A's position", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/portfolio/${positionAId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ notes: 'pwned' });

    expect(res.status).toBe(404);
  });

  it('user A can still PATCH their own position normally', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/portfolio/${positionAId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ notes: 'mine' })
      .expect(200);

    expect(res.body.data.notes).toBe('mine');
  });
});
