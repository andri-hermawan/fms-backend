import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const logger = new Logger('Bootstrap');

  // Setup Socket.IO adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Increase Request Body Limit
  app.use(
    bodyParser.json({
      limit: '20mb',
    }),
  );

  app.use(
    bodyParser.urlencoded({
      extended: true,
      limit: '20mb',
    }),
  );

  // Prefix Global
  app.setGlobalPrefix('fms/api');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Success Response
  app.useGlobalInterceptors(new TransformInterceptor());

  // Error Response
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Fleet Management System API')
    .setDescription('API Documentation for FMS Enterprise Backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('fms/api/docs', app, document);

  app.enableCors();

  const port = configService.get<number>('port') ?? 3000;

  await app.listen(port);

  logger.log(`🚀 FMS API is running on: http://localhost:${port}/fms/api`);

  logger.log(
    `📚 Swagger Doc is available on: http://localhost:${port}/fms/api/docs`,
  );
}

bootstrap();
