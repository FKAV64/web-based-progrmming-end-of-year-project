import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

// Node/undici network failure codes. When an outbound dependency
// (CoinGecko, exchange rates, Binance REST, RSS news, …) is unreachable,
// the global `fetch` rejects with one of these — it is a gateway
// failure, not an application bug, and must surface as 502, never as a
// 500 that echoes the internal error class.
const NETWORK_ERROR_CODES = new Set<string>([
  'ENOTFOUND',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'EPIPE',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET',
]);

function isUpstreamNetworkError(exception: unknown): boolean {
  if (!(exception instanceof Error)) return false;
  if (exception.name === 'FetchError') return true;
  // Node global fetch / undici throws `TypeError: fetch failed` on a
  // network-level failure (DNS, refused, reset, timeout).
  if (exception instanceof TypeError && exception.message === 'fetch failed') {
    return true;
  }
  const code = (exception as { code?: unknown }).code;
  if (typeof code === 'string' && NETWORK_ERROR_CODES.has(code)) return true;
  const cause = (exception as { cause?: { code?: unknown } }).cause;
  if (
    cause &&
    typeof cause.code === 'string' &&
    NETWORK_ERROR_CODES.has(cause.code)
  ) {
    return true;
  }
  return false;
}

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
    } else if (isUpstreamNetworkError(exception)) {
      // A third-party/upstream dependency is unreachable. Report a
      // gateway error with a generic message — do NOT leak the internal
      // error class/message (OWASP: Application Error Disclosure).
      status = HttpStatus.BAD_GATEWAY;
      code = 'BadGateway';
      message = 'Upstream service temporarily unavailable';
    } else {
      // Any other non-HttpException is unexpected. Never disclose the
      // internal error name/message/stack to the client — return an
      // opaque 500. (The full error is still logged server-side by the
      // logger; only the client-facing body is sanitised here.)
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'InternalServerError';
      message = 'Internal server error';
    }

    response.status(status).json({
      error: {
        code,
        message,
      },
    });
  }
}
