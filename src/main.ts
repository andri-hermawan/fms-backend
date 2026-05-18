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

  // Prefix Global: semua endpoint akan diawali /fms/api
  // Contoh: http://localhost:3000/fms/api/vehicles
  app.setGlobalPrefix('fms/api');

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
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Setup Swagger agar bisa diakses di: http://localhost:3000/fms/api/docs
  // Parameter pertama adalah PATH-nya
  SwaggerModule.setup('fms/api/docs', app, document);

  app.enableCors();

  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port);

  // Update Log agar link-nya benar saat diklik di terminal
  logger.log(`🚀 FMS API is running on: http://localhost:${port}/fms/api`);
  logger.log(
    `📚 Swagger Doc is available on: http://localhost:${port}/fms/api/docs`,
  );
}
bootstrap();
