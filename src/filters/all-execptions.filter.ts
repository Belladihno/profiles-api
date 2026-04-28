import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[];
    const isProduction = process.env.NODE_ENV === 'production';

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        message = response;
      } else if (
        typeof response === 'object' &&
        response !== null &&
        'message' in response
      ) {
        const msg = (response as Record<string, unknown>).message;
        if (typeof msg === 'string') {
          message = msg;
        } else if (Array.isArray(msg)) {
          message = msg;
        } else {
          message = exception.message;
        }
      } else {
        message = exception.message;
      }
    } else {
      if (exception instanceof Error) {
        const oauthPayload = (
          exception as Error & { oauthError?: { data?: unknown } }
        ).oauthError?.data;
        const oauthDetails =
          typeof oauthPayload === 'string' ? ` (${oauthPayload})` : '';

        message = isProduction
          ? 'Internal server error'
          : `${exception.message}${oauthDetails}`;

        console.error('[AllExceptionsFilter]', exception.stack ?? exception);
      } else {
        message = 'Internal server error';
        console.error('[AllExceptionsFilter] Non-error exception:', exception);
      }
    }

    response.status(status).json({
      status: 'error',
      message: Array.isArray(message) ? message[0] : message,
    });
  }
}
