import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api/v1');

  // 1. Global Pipes (Validasi DTO)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 2. Global Interceptor (Format Response Sukses)
  app.useGlobalInterceptors(new TransformInterceptor());

  // 3. Global Filter (Format Response Error)
  app.useGlobalFilters(new HttpExceptionFilter());

  // 4. Setup Swagger (OpenAPI)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Fleet Management System API')
    .setDescription('API Documentation for FMS Enterprise Backend')
    .setVersion('1.0')
    .addBearerAuth() // Opsional: Untuk persiapan fitur JWT Auth di Fase 2
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  // Endpoint untuk mengakses dokumentasi (http://localhost:3000/api/docs)
  SwaggerModule.setup('api/docs', app, document);

  app.enableCors();

  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port);
  logger.log(
    `🚀 FMS API is running on: http://localhost:${port}/api/v1`,
  );
  logger.log(
    `📚 Swagger Doc is available on: http://localhost:${port}/api/docs`,
  );
}
bootstrap();
