import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// Outbound HTTP allowlist (informational — enforced by code review, not a runtime egress filter):
//   - api.coingecko.com         (market data, fetched by CoingeckoService)
//   - api.alternative.me        (Fear & Greed index, fetched by SentimentService)
//   - *.binance.com / fapi      (REST klines + websocket ticks)
// Any new outbound destination must be added to this list and reviewed.
const OUTBOUND_HTTP_ALLOWLIST = [
  'api.coingecko.com',
  'api.alternative.me',
  '.binance.com',
];
void OUTBOUND_HTTP_ALLOWLIST;

function assertSecretsHardened() {
  const required = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  for (const name of required) {
    const value = process.env[name];
    if (!value || Buffer.byteLength(value, 'utf8') < 32) {
      throw new Error(`${name} must be set and at least 32 bytes`);
    }
  }
}

async function bootstrap() {
  assertSecretsHardened();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:4200',
    credentials: true,
  });
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

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Crypto Dashboard API')
      .setDescription('Final project for BMU1208 Web-Based Programming')
      .setVersion('1.0.0')
      .addBearerAuth()
      .addCookieAuth('refresh_token')
      .addServer('http://localhost:3000', 'Local')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // CSRF protection: skip the auth entry points (no session yet) and apply to
  // every other route. The token is exposed to JS via the XSRF-TOKEN cookie
  // (Angular's HttpClient picks it up and sends it back as X-XSRF-TOKEN).
  const csrfProtection = csurf({
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  });
  const csrfSkip = new Set([
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/dev/trigger-snapshot',
    '/api/dev/seed-market-data',
  ]);
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (csrfSkip.has(req.path)) return next();
    csrfProtection(req, res, (err) => {
      if (err) {
        return next(err);
      }
      res.cookie('XSRF-TOKEN', req.csrfToken(), {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
      next();
    });
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
