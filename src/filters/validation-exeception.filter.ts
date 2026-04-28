import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ValidationResponse } from 'src/profile/interface/internal.interface';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const body = exception.getResponse() as ValidationResponse;
    const messages: string[] = Array.isArray(body.message)
      ? body.message
      : [body.message];

    // If any message mentions 'must be a string' → 422
    const hasTypeError = messages.some((m) => m.includes('must be a string'));

    const status = hasTypeError
      ? HttpStatus.UNPROCESSABLE_ENTITY
      : HttpStatus.BAD_REQUEST;

    response.status(status).json({
      status: 'error',
      message: messages[0],
    });
  }
}
