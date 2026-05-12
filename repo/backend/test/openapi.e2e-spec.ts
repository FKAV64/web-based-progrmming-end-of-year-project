import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

describe('OpenAPI spec', () => {
  it('generates a valid openapi spec with all expected paths', async () => {
    const app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api');
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining([
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/refresh',
        '/api/me',
        '/api/settings',
        '/api/watchlist',
        '/api/portfolio',
        '/api/alerts',
        '/api/push/subscribe',
        '/api/push/vapid-public-key',
        '/api/market/top',
        '/api/market/ohlc/{symbol}',
      ]),
    );
    await app.close();
  }, 30000);
});
