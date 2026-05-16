import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as http from 'http';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { PrismaService } from '../src/prisma/prisma.service';

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

describe('Users + Settings + KVKK (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testEmail = `phase3-${Date.now()}@example.com`;
  const testPassword = 'Test1234';
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    app = await createApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/register → seeds user + default settings', async () => {
    const res = await request(app.getHttpServer() as http.Server)
      .post('/api/auth/register')
      .send({ email: testEmail, password: testPassword, name: 'Phase 3' })
      .expect(201);

    expect(res.body.data.accessToken).toBeDefined();
    accessToken = res.body.data.accessToken as string;
    userId = res.body.data.user.id as string;
  });

  it('PATCH /api/settings → applies partial update and returns the new row', async () => {
    const res = await request(app.getHttpServer() as http.Server)
      .patch('/api/settings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ theme: 'DARK', currency: 'TRY', notificationsEnabled: false })
      .expect(200);

    expect(res.body.data.theme).toBe('DARK');
    expect(res.body.data.currency).toBe('TRY');
    expect(res.body.data.notificationsEnabled).toBe(false);
    // Untouched field keeps its default
    expect(res.body.data.locale).toBe('TR');
  });

  it('GET /api/me → returns user with the updated settings', async () => {
    const res = await request(app.getHttpServer() as http.Server)
      .get('/api/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.id).toBe(userId);
    expect(res.body.data.email).toBe(testEmail);
    expect(res.body.data.name).toBe('Phase 3');
    expect(res.body.data.role).toBe('USER');
    expect(res.body.data.settings.theme).toBe('DARK');
    expect(res.body.data.settings.currency).toBe('TRY');
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('GET /api/me/export → returns attachment JSON with all expected keys', async () => {
    // Seed one watchlist item directly so the export has at least one related row.
    await prisma.watchlistItem.create({
      data: { userId, coinId: 'bitcoin' },
    });

    const res = await request(app.getHttpServer() as http.Server)
      .get('/api/me/export')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['content-disposition']).toMatch(
      /attachment; filename="my-data-\d{4}-\d{2}-\d{2}\.json"/,
    );

    const body = JSON.parse(res.text);
    expect(body).toEqual(
      expect.objectContaining({
        id: userId,
        email: testEmail,
        settings: expect.any(Object),
        watchlistItems: expect.any(Array),
        positions: expect.any(Array),
        alerts: expect.any(Array),
        pushSubs: expect.any(Array),
        auditLogs: expect.any(Array),
      }),
    );
    expect(body).not.toHaveProperty('passwordHash');
    expect(body.watchlistItems.length).toBeGreaterThanOrEqual(1);
  });

  it('DELETE /api/me → 204 and cascades all related rows', async () => {
    await request(app.getHttpServer() as http.Server)
      .delete('/api/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    // User row gone
    expect(await prisma.user.findUnique({ where: { id: userId } })).toBeNull();
    // Cascaded relations gone
    expect(
      await prisma.userSettings.findUnique({ where: { userId } }),
    ).toBeNull();
    expect(await prisma.watchlistItem.findMany({ where: { userId } })).toEqual(
      [],
    );
    expect(await prisma.refreshToken.findMany({ where: { userId } })).toEqual(
      [],
    );
    // Audit log row survived (onDelete: SetNull) and was written before the delete
    const audits = await prisma.auditLog.findMany({
      where: { action: 'user.deleted' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    expect(audits.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/me after deletion → 401 (JWT validates user existence)', async () => {
    await request(app.getHttpServer() as http.Server)
      .get('/api/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);
  });
});
