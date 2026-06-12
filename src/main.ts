import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().set('etag', false);
  const logger = new Logger('Bootstrap');

  // WebSocket adapter (raw ws — không phải Socket.io)
  app.useWebSocketAdapter(new WsAdapter(app));

  // Global validation pipe — tự động validate DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // strip fields không có trong DTO
      forbidNonWhitelisted: false,
      transform: true,        // tự động transform type (string → number, v.v.)
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS — CORS_ORIGIN supports a comma-separated list (e.g. staging + production admin URLs)
  const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['*'],
    credentials: true,
  });

  // Request logger
  app.use(new LoggerMiddleware().use.bind(new LoggerMiddleware()));

  const port = process.env.PORT ?? 8080;
  await app.listen(port);
  logger.log(`🚀 AirsoftTac Node.js server running on port ${port}`);
  logger.log(`📡 WebSocket endpoint: ws://localhost:${port}/ws`);
}

bootstrap();
