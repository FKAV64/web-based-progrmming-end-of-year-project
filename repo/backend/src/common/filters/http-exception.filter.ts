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
    } else if (exception && typeof exception === 'object') {
      // Handle non-Nest errors that still carry an HTTP status.
      const maybeStatus = (exception as { status?: unknown }).status;
      if (typeof maybeStatus === 'number') {
        status = maybeStatus;
      }
      const maybeCode = (exception as { code?: unknown }).code;
      if (typeof maybeCode === 'string') {
        code = maybeCode;
      } else {
        const maybeName = (exception as { name?: unknown }).name;
        if (typeof maybeName === 'string' && maybeName) {
          code = maybeName;
        }
      }
      const maybeMsg = (exception as { message?: unknown }).message;
      if (typeof maybeMsg === 'string' && maybeMsg) {
        message = maybeMsg;
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
