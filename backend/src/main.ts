import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
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
  ]);
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (csrfSkip.has(req.path)) return next();
    csrfProtection(req, res, (err) => {
      if (err) return next(err);
      res.cookie('XSRF-TOKEN', req.csrfToken(), {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
      next();
    });
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
