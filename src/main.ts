import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

// ponytail: native Node env loader; switch @nestjs/config if need multi-env or schema validation
// Containers inject env vars directly and ship without .env
if (existsSync('.env')) process.loadEnvFile();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Backend is running on: http://localhost:${port}`);
}
bootstrap();
