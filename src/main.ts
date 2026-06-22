import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RolesGuard } from './common/guards/roles.guard';
import { NestExpressApplication } from '@nestjs/platform-express'; // <-- 1. IMPORT THIS
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const config = app.get(ConfigService);
  const port = config.get<number>('port');
  const isProduction = config.get<string>('nodeEnv') === 'production';

  // ── TRUST PROXY (Crucial for Render SSL/Cookies) ──────────────────────────
  if (isProduction) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1); // <-- 3. ADD THIS
  }

  // ── Global prefix ─────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── CORS ──────────────────────────────────────────────────────────────────
  const allowedOrigins = JSON.parse(process.env.CORS_ALLOWED_ORIGINS || "[]") as string[];

  app.enableCors({
    origin: isProduction
      ? [process.env.FRONTEND_URL?.replace(/\/$/, ''), ...allowedOrigins.map((o) => o.replace(/\/$/, ''))]
      : true,
    credentials: true,
  });

  // ── Cookie Parser ──────────────────────────────────────────────────────────
  app.use(cookieParser());

  // ── Global validation pipe ────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global exception filter ───────────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Global roles guard ────────────────────────────────────────────────────
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new RolesGuard(reflector));

  // ── Swagger (disabled in production) ─────────────────────────────────────
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Nexus API')
      .setDescription('Embeddable autonomous agent platform — NestJS backend')
      .setVersion('1.0')
      .addBearerAuth()
      .addServer(`http://localhost:${port}`, 'Local')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  }

  await app.listen(port);
  console.log(`🚀 Nexus backend running on port ${port}`);
}

bootstrap();