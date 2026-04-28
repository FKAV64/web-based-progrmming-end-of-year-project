import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'InternalServerError';
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        code = exception.name;
      } else if (exceptionResponse && typeof exceptionResponse === 'object') {
        const payload = exceptionResponse as {
          error?: unknown;
          message?: unknown;
        };

        code =
          typeof payload.error === 'string' ? payload.error : exception.name;

        if (Array.isArray(payload.message)) {
          message = payload.message.join(', ');
        } else if (typeof payload.message === 'string') {
          message = payload.message;
        } else if (typeof payload.error === 'string') {
          message = payload.error;
        }
      }
    } else if (exception instanceof Error) {
      code = exception.name || code;
      if (process.env.NODE_ENV !== 'production') {
        message = exception.message;
      }
    }

    response.status(status).json({
      error: {
        code,
        message,
      },
    });
  }
}
