import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { AppModule } from '../src/app.module';

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  const config = new DocumentBuilder()
    .setTitle('Crypto Dashboard API')
    .setDescription('Final project for BMU1208 Web-Based Programming')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addCookieAuth('refresh_token')
    .addServer('http://localhost:3000', 'Local')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  const docsDir = path.resolve(__dirname, '../../docs');
  fs.mkdirSync(docsDir, { recursive: true });

  fs.writeFileSync(
    path.join(docsDir, 'openapi.yaml'),
    yaml.dump(document, { lineWidth: 120 }),
  );
  fs.writeFileSync(
    path.join(docsDir, 'openapi.json'),
    JSON.stringify(document, null, 2),
  );

  await app.close();
  console.log('Wrote docs/openapi.yaml and docs/openapi.json');
}

generate().catch((e) => {
  console.error(e);
  process.exit(1);
});
