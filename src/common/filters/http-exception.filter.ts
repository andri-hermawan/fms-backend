import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    let errors = null;

    if (exception instanceof HttpException) {
      const exceptionResponse: any = exception.getResponse();
      message = exceptionResponse.message || exception.message;

      // Menangkap error detail dari class-validator
      if (Array.isArray(exceptionResponse.message)) {
        message = 'Validation Failed';
        errors = exceptionResponse.message;
      }
    } else {
      // Log error yang tidak terduga ke terminal server
      this.logger.error(
        `[Unhandled Exception] ${request.method} ${request.url}`,
        exception,
      );
    }

    response.status(status).json({
      statusCode: status,
      message: message,
      errors: errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
