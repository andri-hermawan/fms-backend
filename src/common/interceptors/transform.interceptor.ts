import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
  meta?: any;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((res) => {
        // Jika response dari service sudah mengandung 'data' dan 'meta' (seperti pada pagination)
        if (res && res.data && res.meta) {
          return {
            statusCode,
            message: 'Success',
            data: res.data,
            meta: res.meta,
          };
        }

        // Jika response biasa (objek tunggal atau array)
        return {
          statusCode,
          message: 'Success',
          data: res || null,
        };
      }),
    );
  }
}
